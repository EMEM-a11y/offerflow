import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const imageDir = path.join(root, "public/question-images/generated-graphic");
const outputPath = path.join(root, "src/generated-graphic-bank.js");
fs.mkdirSync(imageDir, { recursive: true });

let seed = 20260905;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

const ink = "#262729";
const muted = "#777b80";
const accent = "#d86b46";

function arrow(angle) {
  return `<g transform="rotate(${angle} 50 50)" stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M24 50 H76"/><path d="M61 35 L76 50 L61 65"/></g>`;
}

function dots(count) {
  const positions = [[35,35],[65,35],[35,65],[65,65],[50,22],[22,50],[78,50],[50,78]];
  return positions.slice(0, count).map(([x,y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${accent}"/>`).join("");
}

function symbol(kind, filled) {
  const fill = filled ? accent : "none";
  if (kind === "circle") return `<circle cx="50" cy="50" r="24" fill="${fill}" stroke="${ink}" stroke-width="4"/>`;
  if (kind === "square") return `<rect x="27" y="27" width="46" height="46" rx="4" fill="${fill}" stroke="${ink}" stroke-width="4"/>`;
  if (kind === "triangle") return `<path d="M50 23 L78 74 H22 Z" fill="${fill}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
  return `<path d="M50 20 L80 50 L50 80 L20 50 Z" fill="${fill}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
}

function movingDot(position) {
  const positions = [[50,18],[73,27],[82,50],[73,73],[50,82],[27,73],[18,50],[27,27]];
  const [x,y] = positions[position];
  return `<circle cx="50" cy="50" r="34" fill="none" stroke="${muted}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="8" fill="${accent}"/>`;
}

function polygon(sides) {
  const points = Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides;
    return `${50 + Math.cos(angle) * 30},${50 + Math.sin(angle) * 30}`;
  }).join(" ");
  return `<polygon points="${points}" fill="none" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
}

function bars(mask) {
  const lines = [
    `<path d="M50 19 V81"/>`,
    `<path d="M19 50 H81"/>`,
    `<path d="M24 24 L76 76"/>`,
    `<path d="M76 24 L24 76"/>`
  ];
  return `<g stroke="${ink}" stroke-width="5" stroke-linecap="round">${lines.filter((_, index) => mask & (1 << index)).join("")}</g>`;
}

function panel(x, y, content, label = "") {
  return `<g transform="translate(${x} ${y})"><rect width="112" height="112" rx="14" fill="#ffffff" stroke="#d9dcdf" stroke-width="2"/><g transform="translate(6 6)">${content}</g>${label ? `<text x="56" y="137" text-anchor="middle" font-size="20" font-weight="700" fill="${ink}">${label}</text>` : ""}</g>`;
}

function renderSvg(contexts, options, ruleName) {
  const contextX = [65, 225, 385];
  const optionX = [65, 265, 465, 665];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="842" height="348" viewBox="0 0 842 348" role="img" aria-label="${ruleName}图形推理题">
  <rect width="842" height="348" rx="18" fill="#f5f5f2"/>
  <text x="30" y="32" font-size="16" font-weight="700" fill="${muted}">观察规律，选择问号处的图形</text>
  ${contexts.map((content, index) => panel(contextX[index], 48, content)).join("")}
  <path d="M507 104 H535" stroke="${muted}" stroke-width="3" stroke-linecap="round"/>
  <g transform="translate(550 48)"><rect width="112" height="112" rx="14" fill="#fff8f4" stroke="${accent}" stroke-width="2" stroke-dasharray="7 6"/><text x="56" y="73" text-anchor="middle" font-size="48" font-weight="700" fill="${accent}">?</text></g>
  <text x="30" y="194" font-size="14" font-weight="700" fill="${muted}">选项</text>
  ${options.map((content, index) => panel(optionX[index], 208, content, String.fromCharCode(65 + index))).join("")}
  </svg>`;
}

function createQuestion(index, subtype, difficulty, contexts, candidateValues, correctValue, draw, explanation) {
  const options = shuffle(candidateValues);
  const answer = options.indexOf(correctValue);
  const id = `generated-graphic-${String(index).padStart(3, "0")}`;
  const svg = renderSvg(contexts.map(draw), options.map(draw), subtype);
  fs.writeFileSync(path.join(imageDir, `${id}.svg`), svg);
  return {
    id,
    paperId: "generated-graphic-bank",
    source: "OfferFlow 规则生成图推",
    category: "graphic",
    subtype,
    difficulty,
    prompt: "观察前三个图形的变化规律，选择最适合放在问号处的一项。",
    options: ["A", "B", "C", "D"],
    answer,
    explanation,
    image: `/question-images/generated-graphic/${id}.svg`,
    expectedSeconds: difficulty >= 4 ? 95 : 70
  };
}

const questions = [];
let questionIndex = 1;

for (let index = 0; index < 10; index += 1) {
  const start = (index * 45) % 360;
  const step = [45, 90, -45, -90][index % 4];
  const correct = (start + step * 3 + 3600) % 360;
  questions.push(createQuestion(questionIndex++, "旋转规律", 2 + (index % 3), [start, start + step, start + step * 2], [correct, (correct + 45) % 360, (correct + 90) % 360, (correct + 180) % 360], correct, arrow, `箭头每次${step > 0 ? "顺时针" : "逆时针"}旋转 ${Math.abs(step)}°，所以下一个角度应继续按相同步长变化。`));
}

for (let index = 0; index < 10; index += 1) {
  const start = 1 + (index % 2);
  const step = 1 + (index % 2);
  const correct = start + step * 3;
  questions.push(createQuestion(questionIndex++, "数量递增", 2 + (index % 3), [start, start + step, start + step * 2], [correct, correct - 1, correct + 1, correct + 2], correct, dots, `图形中的圆点数量每次增加 ${step} 个，因此问号处应有 ${correct} 个圆点。`));
}

const shapes = ["circle", "square", "triangle", "diamond"];
for (let index = 0; index < 10; index += 1) {
  const first = shapes[index % shapes.length];
  const second = shapes[(index + 1 + (index % 2)) % shapes.length];
  const firstFilled = index % 2 === 0;
  const correct = `${second}:${!firstFilled}`;
  const candidates = [`${second}:${!firstFilled}`, `${second}:${firstFilled}`, `${first}:${!firstFilled}`, `${first}:${firstFilled}`];
  const draw = (value) => { const [kind, filled] = value.split(":"); return symbol(kind, filled === "true"); };
  questions.push(createQuestion(questionIndex++, "形状与填充交替", 3, [`${first}:${firstFilled}`, `${second}:${!firstFilled}`, `${first}:${firstFilled}`], candidates, correct, draw, "形状按两种图形交替出现，填充状态也同步交替，因此下一项应恢复第二种图形及其对应填充状态。"));
}

for (let index = 0; index < 10; index += 1) {
  const start = index % 8;
  const step = [1, 2, -1, -2][index % 4];
  const normalize = (value) => (value + 80) % 8;
  const correct = normalize(start + step * 3);
  const candidates = [correct, normalize(correct + 1), normalize(correct + 2), normalize(correct + 4)];
  questions.push(createQuestion(questionIndex++, "位置移动", 3 + (index % 2), [normalize(start), normalize(start + step), normalize(start + step * 2)], candidates, correct, movingDot, `圆点沿圆周每次移动 ${Math.abs(step)} 个位置，方向保持不变，继续移动即可得到答案。`));
}

for (let index = 0; index < 10; index += 1) {
  const start = 3 + (index % 2);
  const correct = start + 3;
  questions.push(createQuestion(questionIndex++, "边数递增", 2 + (index % 3), [start, start + 1, start + 2], [correct, correct - 1, correct + 1, correct + 2], correct, polygon, `多边形的边数依次增加 1，所以下一个图形应为 ${correct} 边形。`));
}

for (let index = 0; index < 10; index += 1) {
  const addedBit = 1 << (index % 4);
  const firstBit = 1 << ((index + 1) % 4);
  const thirdBit = 1 << ((index + 2) % 4);
  const first = firstBit;
  const second = firstBit | addedBit;
  const third = thirdBit;
  const correct = thirdBit | addedBit;
  const otherOne = thirdBit | (1 << ((index + 3) % 4));
  const otherTwo = thirdBit | firstBit;
  questions.push(createQuestion(questionIndex++, "类比叠加", 4, [first, second, third], [correct, third, otherOne, otherTwo], correct, bars, "第一个图形增加一条特定方向的线后得到第二个图形。对第三个图形进行同样的增加操作，即可得到答案。"));
}

const paperIds = questions.slice(0, 20).map((question) => question.id);
const output = `// 此文件由 scripts/build-graphic-question-bank.mjs 生成，请勿手工编辑。\n\n`
  + `export const GENERATED_GRAPHIC_QUESTIONS = ${JSON.stringify(questions, null, 2)};\n\n`
  + `export const GENERATED_GRAPHIC_PAPER_IDS = ${JSON.stringify(paperIds, null, 2)};\n`;
fs.writeFileSync(outputPath, output);
console.log(JSON.stringify({ total: questions.length, images: questions.length, outputPath }, null, 2));
