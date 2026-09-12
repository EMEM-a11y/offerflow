import test from "node:test";
import assert from "node:assert/strict";
import { inspectCommunityQuestion, loadCommunityQuestionBank } from "../src/community-question-bank.js";
import { validateImportedQuestions, hasValidOptionImages } from "../src/question-bank.js";

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

test("unreviewed visual sources and changed reviewed records fail closed", () => {
  assert.ok(inspectCommunityQuestion({ ...graph(), id: "graph-999" }).includes("visual-source-review-pending"));
  assert.ok(inspectCommunityQuestion({ ...graph(), id: "data-999", sectionId: "data" }).includes("visual-source-review-pending"));
  assert.ok(inspectCommunityQuestion({ ...graph(), answer: "B" }).includes("reviewed-source-changed"));
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
