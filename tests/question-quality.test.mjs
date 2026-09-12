import test from "node:test";
import assert from "node:assert/strict";
import { inspectCommunityQuestion, loadCommunityQuestionBank } from "../src/community-question-bank.js";
import { validateImportedQuestions, hasValidOptionImages } from "../src/question-bank.js";
import { GRAPHIC_REPAIRS } from "../src/community-graphic-review.js";

const graph = () => ({ id: "graph-110", sectionId: "graph", stem: "接下来的图形应该是:", options: ["A", "B", "C", "D"].map(key => ({ key, text: `选项 ${key}`, image: `images/graph/options/graph-110_${key}.png` })), answer: "A", explanation: "原题解析", images: ["images/graph/p327_4_4882.png"], optionsAreImages: true });

test("five-choice original replaces incorrect crops with a new revision ID", async t => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ questions: [graph()] }) }));
  const previous = globalThis.window; globalThis.window = globalThis;
  t.after(() => { globalThis.window = previous; });
  const [question] = await loadCommunityQuestionBank();
  assert.match(question.id, /reviewed-v2$/);
  assert.equal(question.options.length, 5);
  assert.equal(question.answer, 0);
  assert.equal(question.optionImages, undefined);
  assert.match(question.images[1], /p328_1_4892.png$/);
});

test("review-pending is informational; changed reviewed records remain blocked", () => {
  assert.ok(inspectCommunityQuestion({ ...graph(), id: "graph-999" }).includes("visual-source-review-pending"));
  assert.ok(inspectCommunityQuestion({ ...graph(), id: "data-999", sectionId: "data" }).includes("visual-source-review-pending"));
  assert.ok(inspectCommunityQuestion({ ...graph(), answer: "B" }).includes("reviewed-source-changed"));
});

test("pending review alone never hides an otherwise usable question", async t => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ questions: [{ ...graph(), id: "graph-999" }] }) }));
  const previous = globalThis.window; globalThis.window = globalThis;
  t.after(() => { globalThis.window = previous; });
  assert.equal((await loadCommunityQuestionBank()).length, 1);
});

test("missing repeated reordered and malformed image options are rejected", () => {
  const missing = graph(); delete missing.options[2].image;
  assert.ok(inspectCommunityQuestion(missing).includes("missing-option-image"));
  const repeated = graph(); repeated.options[1].image = repeated.options[0].image;
  assert.ok(inspectCommunityQuestion(repeated).includes("duplicate-option-image"));
  const order = graph(); order.options.reverse();
  assert.ok(inspectCommunityQuestion(order).includes("option-label-order"));
  for (const question of [null, {}, { options: null }, { images: {} }]) assert.ok(inspectCommunityQuestion(question).length);
});

test("imports reject blank answers and mismatched option images", () => {
  const base = { prompt: "测试", options: ["选项 A", "选项 B"], answer: 0 };
  for (const answer of [null, "", undefined]) assert.throws(() => validateImportedQuestions([{ ...base, answer }]));
  assert.equal(hasValidOptionImages({ ...base, optionImages: ["/a.png"] }), false);
  assert.equal(hasValidOptionImages({ ...base, optionImages: ["/a.png", ""] }), false);
  assert.equal(hasValidOptionImages({ ...base, optionImages: ["/a.png", "/a.png"] }), false);
  assert.equal(hasValidOptionImages({ ...base, optionImages: ["/a.png", "/b.png"] }), true);
});

test("all 39 original-image repairs remain usable with their reviewed choice count", async t => {
  const rows = Object.entries(GRAPHIC_REPAIRS).map(([id, repair]) => {
    const [sectionId, answer, images, options] = JSON.parse(repair.signature);
    return { id, sectionId, answer, images, options, stem: "请根据图片选择正确答案", explanation: "原解析", optionsAreImages: true };
  });
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ questions: rows }) }));
  const previous = globalThis.window; globalThis.window = globalThis;
  t.after(() => { globalThis.window = previous; });
  const questions = await loadCommunityQuestionBank();
  assert.equal(questions.length, 39);
  for (const row of rows) {
    const question = questions.find(q => q.id === `community-beisen-${row.id}-reviewed-v2`);
    assert.equal(question.options.length, GRAPHIC_REPAIRS[row.id].count);
    assert.ok(question.answer >= 0 && question.answer < question.options.length);
    assert.equal(question.optionImages, undefined);
  }
  const byId = id => questions.find(q => q.id === `community-beisen-${id}-reviewed-v2`);
  assert.equal(byId("graph-5").options.length, 5);
  assert.equal(byId("graph-38").options.length, 3);
  assert.equal(byId("graph-49").options.length, 3);
  assert.deepEqual(byId("graph-60").options, ["H", "D", "S", "O"]);
  assert.equal(byId("graph-60").answer, 1);
  assert.equal(byId("graph-150").images.length, 1);
  assert.equal(byId("graph-152").images.length, 1);
  assert.ok(!byId("graph-23").images.some(path => path.includes("p276_4_4237")));
  assert.ok(!byId("graph-138").images.some(path => path.includes("p344_4_5101")));
  assert.ok(!byId("graph-144").images.some(path => path.includes("p348_1_5148")));
});
