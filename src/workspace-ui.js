const focusSelector = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]';
let modalReturnFocus = null;
let modalWasOpen = false;

export function captureWorkspaceFocus(doc) {
  const active = doc.activeElement;
  if (!active || active === doc.body) return null;
  const key = active.id ? { id: active.id } : [...(active.attributes || [])]
    .filter(attr => attr.name.startsWith("data-")).map(attr => ({ name: attr.name, value: attr.value }));
  return { key, inDialog: Boolean(active.closest?.('[role="dialog"]')) };
}

function findFocus(doc, descriptor) {
  if (!descriptor?.key) return null;
  if (descriptor.key.id) return doc.getElementById(descriptor.key.id);
  if (!descriptor.key.length) return null;
  return [...doc.querySelectorAll("button, a, input, select, textarea, summary")].find(el =>
    descriptor.key.every(attr => el.getAttribute(attr.name) === attr.value));
}

export function syncWorkspaceUi(doc, previous) {
  doc.querySelectorAll('[role="tablist"]').forEach(list => {
    list.querySelectorAll('[role="tab"]').forEach(tab => {
      const selected = tab.classList.contains("active");
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
  });
  const dialog = doc.querySelector('[role="dialog"]');
  const shell = doc.querySelector(".app-shell");
  if (shell) shell.inert = Boolean(dialog);
  if (dialog) {
    if (!modalWasOpen) modalReturnFocus = previous;
    const target = previous?.inDialog ? findFocus(doc, previous) : null;
    (target || dialog.querySelector("input:not([type=hidden]), textarea, select, button") || dialog).focus?.({ preventScroll: true });
  } else if (modalWasOpen) {
    (findFocus(doc, modalReturnFocus) || doc.querySelector(".nav-item.active"))?.focus({ preventScroll: true });
    modalReturnFocus = null;
  } else if (previous) {
    findFocus(doc, previous)?.focus({ preventScroll: true });
  }
  modalWasOpen = Boolean(dialog);
}

export function handleWorkspaceKeydown(event, doc) {
  const dialog = doc.querySelector('[role="dialog"]');
  if (event.key === "Tab" && dialog) {
    const targets = [...dialog.querySelectorAll(focusSelector)].filter(el => el.getClientRects().length);
    const first = targets[0], last = targets.at(-1);
    if (!first) { event.preventDefault(); dialog.focus(); return true; }
    if (!targets.includes(doc.activeElement) || (!event.shiftKey && doc.activeElement === last) || (event.shiftKey && doc.activeElement === first)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return true;
    }
  }
  const tab = event.target.closest?.('[role="tab"]');
  const list = tab?.closest('[role="tablist"]');
  if (!list || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return false;
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(tab);
  const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1)
    : tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
  event.preventDefault();
  const key = captureWorkspaceFocus({ activeElement: next, body: doc.body });
  next.click();
  findFocus(doc, key)?.focus({ preventScroll: true });
  return true;
}
