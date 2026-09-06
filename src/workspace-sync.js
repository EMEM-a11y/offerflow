// Only authenticated, account-scoped drafts are read. Never adopt ownerless legacy data.
export class WorkspaceSync {
  constructor({ load, save, storage, onStatus = () => {}, delay = 700 }) {
    Object.assign(this, { load, save, storage, onStatus, delay });
    this.epoch = 0;
    this.close();
  }

  key() { return `offerflow-workspace-v3:${this.userId}`; }

  close() {
    clearTimeout(this.timer);
    this.epoch++;
    this.userId = null;
    this.ready = false;
    this.pending = null;
    this.recovery = null;
    this.inFlight = null;
    this.blocked = false;
  }

  async open(userId) {
    this.close();
    this.userId = userId;
    const epoch = this.epoch;
    this.onStatus("syncing");
    try {
      const remote = await this.load(userId);
      if (epoch !== this.epoch) return null;
      this.revision = remote?.updated_at ?? null;
      try {
        const draft = this.storage.getItem(this.key());
        const recoveryKey = `${this.key()}:recovery`;
        if (draft && !this.storage.getItem(recoveryKey)) this.storage.setItem(recoveryKey, draft);
        this.recovery = JSON.parse(this.storage.getItem(recoveryKey));
      } catch { this.recovery = null; }
      this.ready = true;
      this.onStatus("saved");
      return { state: remote?.state ?? null };
    } catch (error) {
      if (epoch === this.epoch) this.onStatus("error");
      throw error;
    }
  }

  queue(state) {
    if (!this.ready) return;
    this.pending = structuredClone(state);
    this.cacheDraft();
    clearTimeout(this.timer);
    if (this.blocked) return;
    this.onStatus("saving");
    this.timer = setTimeout(() => this.flush().catch(() => {}), this.delay);
  }

  cacheDraft() {
    try { this.storage.setItem(this.key(), JSON.stringify({ state: this.pending, revision: this.revision })); }
    catch { this.onStatus("cache-full"); }
  }

  async flush() {
    clearTimeout(this.timer);
    if (this.blocked) throw new Error("云端已有更新，请先备份本页，再重新载入云端记录");
    if (!this.ready || !this.pending) return;
    if (this.inFlight) {
      const epoch = this.epoch;
      await this.inFlight;
      if (epoch === this.epoch) return this.flush();
      return;
    }
    const epoch = this.epoch;
    const snapshot = this.pending;
    const request = this.save(this.userId, snapshot, this.revision);
    this.inFlight = request;
    try {
      const saved = await request;
      if (epoch !== this.epoch) return;
      this.revision = saved.updated_at;
      if (this.pending === snapshot) {
        this.pending = null;
        this.storage.removeItem(this.key());
      } else this.cacheDraft();
      this.onStatus(this.pending ? "saving" : "saved");
    } catch (error) {
      if (epoch === this.epoch) {
        this.blocked = error.code === "WORKSPACE_CONFLICT";
        this.onStatus(this.blocked ? "conflict" : "error");
      }
      throw error;
    } finally {
      if (epoch === this.epoch) this.inFlight = null;
    }
    if (epoch === this.epoch && this.pending) return this.flush();
  }
}
