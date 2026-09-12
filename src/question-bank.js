import { JD_SUPPLEMENT_PAPER_IDS, JD_SUPPLEMENT_QUESTIONS } from "./jd-supplement-question-bank.js";

const HUBEI_2026_OFFICIAL_URL = "https://gdkfq.ezhou.gov.cn/gk/bmptlj/bm/qzsj/fdzdgk/zkly/202604/t20260417_761135.html";

export const PRACTICE_CATEGORIES = [
  { id: "verbal", name: "言语理解", short: "言", description: "词语运用、片段阅读与语义判断", targetSeconds: 75 },
  { id: "numerical", name: "数字推理", short: "数", description: "数列、运算、比例与应用题", targetSeconds: 90 },
  { id: "data", name: "资料分析", short: "资", description: "阅读材料和图表并完成数据计算", targetSeconds: 110 },
  { id: "logic", name: "逻辑判断", short: "逻", description: "条件、定义、类比与论证推理", targetSeconds: 80 },
  { id: "graphic", name: "图形推理", short: "图", description: "图形规律、折叠、旋转与空间关系", targetSeconds: 75 }
];

const OFFICIAL_QUESTIONS = [
  {
    id: "official-hubei-2026-v-01",
    paperId: "official-public-samples",
    source: "湖北省 2026 年公务员公共科目笔试考试大纲 · 官方例题",
    sourceUrl: HUBEI_2026_OFFICIAL_URL,
    category: "verbal",
    subtype: "阅读理解",
    difficulty: 3,
    prompt: "环境保护主义是一种信念，是一种重建人与自然关系的强烈愿望。要实现这一愿望，就必须树立一种自然共同体的意识，即将人类在共同体中的征服者角色，变为这一共同体中的普通一员。它暗含着对每个成员的尊敬，也包括对这个共同体本身的尊敬。只有树立了这样的一种道德意识，人们才有可能在运用其在这一共同体中的权利时，感到所负有的对这个共同体的义务。这不仅依赖对自然本质的科学理解，也依赖在了解基础上建立起的对自然的感情。文段最后一句话中的“这”指的是：",
    options: ["自然共同体意识的树立", "对自然共同体的义务", "热爱自然的感情", "重建人与自然关系的愿望"],
    answer: 0,
    explanation: "末句承接前文“树立这样的一种道德意识”，指向自然共同体意识的树立，因此选 A。",
    expectedSeconds: 80
  },
  {
    id: "official-hubei-2026-v-02",
    paperId: "official-public-samples",
    source: "湖北省 2026 年公务员公共科目笔试考试大纲 · 官方例题",
    sourceUrl: HUBEI_2026_OFFICIAL_URL,
    category: "verbal",
    subtype: "逻辑填空",
    difficulty: 2,
    prompt: "中国道路的成功开创不仅创造了中国奇迹，而且创造了中国经验。中国经验无疑是中国智慧的结晶，具有鲜明的______。但是，中国经验也是在遵循历史发展和现代化发展规律、吸收世界发展经验教训的基础上形成的，因而又具有一定的______。依次填入最恰当的一项是：",
    options: ["地域性、国际性", "实践性、理论性", "先进性、创新性", "特殊性、普遍性"],
    answer: 3,
    explanation: "前一空强调中国特色，后一空强调反映人类文明进步的一般规律，因此选“特殊性、普遍性”。",
    expectedSeconds: 65
  },
  {
    id: "official-hubei-2026-n-01",
    paperId: "official-public-samples",
    source: "湖北省 2026 年公务员公共科目笔试考试大纲 · 官方例题",
    sourceUrl: HUBEI_2026_OFFICIAL_URL,
    category: "numerical",
    subtype: "数字推理",
    difficulty: 1,
    prompt: "观察数列：1，2，4，8，16，（ ）。",
    options: ["16", "24", "32", "36"],
    answer: 2,
    explanation: "后一项是前一项的 2 倍，下一项为 32。",
    expectedSeconds: 25
  },
  {
    id: "official-hubei-2026-n-02",
    paperId: "official-public-samples",
    source: "湖北省 2026 年公务员公共科目笔试考试大纲 · 官方例题",
    sourceUrl: HUBEI_2026_OFFICIAL_URL,
    category: "numerical",
    subtype: "概率",
    difficulty: 3,
    prompt: "某单位的会议室有 5 排共 40 个座位，每排座位数相同。小张和小李随机入座，则他们坐在同一排的概率：",
    options: ["不高于 15%", "高于 15% 但低于 20%", "正好为 20%", "高于 20%"],
    answer: 1,
    explanation: "小张落座后，小李剩余 39 个座位，其中同排可选 7 个，概率为 7/39，约 17.9%。",
    expectedSeconds: 70
  },
  {
    id: "official-hubei-2026-l-01",
    paperId: "official-public-samples",
    source: "湖北省 2026 年公务员公共科目笔试考试大纲 · 官方例题",
    sourceUrl: HUBEI_2026_OFFICIAL_URL,
    category: "logic",
    subtype: "定义判断",
    difficulty: 3,
    prompt: "党政机关公文中，批复适用于答复下级机关请示事项。下列标题中应添加“批复”的是：",
    options: ["国务院办公厅关于进一步加强资本市场中小投资者合法权益保护工作的", "国务院办公厅关于黑龙江双鸭山经济开发区升级为国家级经济技术开发区的", "国务院关于同意设立陕西西咸新区的", "国务院关于在我国统一实行法定计量单位的"],
    answer: 2,
    explanation: "“同意设立陕西西咸新区”属于答复下级机关请示，符合批复的定义。",
    expectedSeconds: 65
  },
  {
    id: "official-hubei-2026-l-02",
    paperId: "official-public-samples",
    source: "湖北省 2026 年公务员公共科目笔试考试大纲 · 官方例题",
    sourceUrl: HUBEI_2026_OFFICIAL_URL,
    category: "logic",
    subtype: "类比推理",
    difficulty: 2,
    prompt: "设计︰发放︰问卷，与下面哪组关系最为贴近？",
    options: ["复制︰修改︰文字", "预习︰复习︰考试", "播放︰快进︰磁带", "制定︰执行︰政策"],
    answer: 3,
    explanation: "设计和发放是问卷实施中按顺序发生的必要步骤；制定和执行同样是政策实施中的有序步骤。",
    expectedSeconds: 45
  },
  {
    id: "official-hubei-2026-l-03",
    paperId: "official-public-samples",
    source: "湖北省 2026 年公务员公共科目笔试考试大纲 · 官方例题",
    sourceUrl: HUBEI_2026_OFFICIAL_URL,
    category: "logic",
    subtype: "逻辑判断",
    difficulty: 3,
    prompt: "一切生命有机体都需要新陈代谢，否则生命就会停止。文明也是一样，如果长期自我封闭，必将走向衰落。交流互鉴是文明发展的本质要求。只有同其他文明交流互鉴、取长补短，才能保持旺盛生命活力。由此可以推出：",
    options: ["一种文明如果没有长期自我封闭，就不会走向衰落", "一种文明如果同其他文明交流互鉴、取长补短，就能保持旺盛生命活力", "一种文明如果没有同其他文明交流互鉴，就不能保持旺盛生命活力", "一种文明如果没有保持旺盛生命活力，它就没有同其他文明取长补短"],
    answer: 2,
    explanation: "“只有交流互鉴，才能保持活力”表示交流互鉴是必要条件；没有交流互鉴，就不能保持旺盛生命活力。",
    expectedSeconds: 75
  },
  {
    id: "official-hubei-2026-d-01",
    paperId: "official-public-samples",
    source: "湖北省 2026 年公务员公共科目笔试考试大纲 · 官方例题",
    sourceUrl: HUBEI_2026_OFFICIAL_URL,
    category: "data",
    subtype: "增长率还原",
    difficulty: 3,
    prompt: "某市 2015 年蔬菜产量 15.79 万吨，同比下降 3.4%；水果产量 7.84 万吨，同比增长 7.4%。2014 年该市蔬菜产量比水果产量约高多少万吨？",
    options: ["6", "7", "8", "9"],
    answer: 3,
    explanation: "2014 年蔬菜约为 15.79÷96.6%，水果约为 7.84÷107.4%，两者相差约 9 万吨。",
    expectedSeconds: 90
  }
];

export const PRACTICE_PAPERS = [
  {
    id: "official-public-samples",
    title: "官方公开职测样题 · 湖北 2026",
    provider: "政府官网公开例题",
    description: "逐题摘自湖北省 2026 年公务员公共科目笔试考试大纲，覆盖言语、数字、逻辑和资料分析，每题都可回到官方原文核对。",
    sourceUrl: HUBEI_2026_OFFICIAL_URL,
    durationMinutes: 12,
    questionIds: OFFICIAL_QUESTIONS.map(question => question.id)
  },
  {
    id: "jd-assessment-set-2",
    title: "京东测评真题 · 第 2 套",
    provider: "用户提供 PDF",
    description: "24 页扫描样卷，覆盖言语、数学、资料分析与图形判断。当前已录入首批可校验题目。",
    durationMinutes: 12,
    questionIds: ["jd2-v-01", "jd2-v-03", "jd2-n-01", "jd2-n-04", "jd2-n-05", "jd2-n-11"]
  },
  {
    id: "jd-assessment-supplement",
    title: "京东测评增补精选 · 28 题",
    provider: "用户提供 PDF · 去重精选",
    description: "从 6 份新增资料中核对题干、选项和答案，过滤跨套重复、信息残缺与会泄题的标注图形题。",
    durationMinutes: 38,
    questionIds: JD_SUPPLEMENT_PAPER_IDS
  },
];

const USER_PDF_QUESTIONS = [
  {
    id: "jd2-v-01",
    paperId: "jd-assessment-set-2",
    source: "用户提供 PDF，第 1 页",
    category: "verbal",
    subtype: "阅读理解",
    difficulty: 3,
    prompt: "一项发表于《科学》的研究也许有助于填补东亚遗传学中由狩猎采集转变为农耕经济的空白。研究人员从 25 个分别来自新石器时代东亚南部和北部的人骨骼中提取了 DNA 样本。分析显示，当时的人类已经显示出现代东亚人的遗传特征，但当时南北人群的遗传分化比现在更明显。现代东亚人来自新石器时代东亚的南北人群的混合，但在基因上，与当时的北方人更接近。下面对本文内容理解正确的是：",
    options: ["狩猎采集到农耕经济的过渡时期得到了明确解释", "研究提取了 25 个 DNA 样本", "新石器时代东亚南北人群的交往逐渐加深", "现代东亚人的遗传特征在新石器时代开始体现"],
    answer: 1,
    explanation: "原文明确说明研究人员从 25 个人骨骼中提取 DNA 样本。其他选项都加入了原文没有给出的时间、过程或因果判断。",
    expectedSeconds: 80
  },
  {
    id: "jd2-v-03",
    paperId: "jd-assessment-set-2",
    source: "用户提供 PDF，第 1 页",
    category: "verbal",
    subtype: "词语运用",
    difficulty: 2,
    prompt: "电商这个行业正________，有广阔的前景。最适合填入空格处的词语是：",
    options: ["方兴未艾", "阪上走丸", "风靡云蒸", "热火朝天"],
    answer: 0,
    explanation: "“方兴未艾”表示事物正在蓬勃发展，尚未停止，和“有广阔的前景”衔接最自然。",
    expectedSeconds: 35
  },
  {
    id: "jd2-n-01",
    paperId: "jd-assessment-set-2",
    source: "用户提供 PDF，第 5 页",
    category: "data",
    subtype: "图表运算",
    difficulty: 3,
    prompt: "图中各岗位等级员工数量依次为：3 级 4 人、4 级 6 人、5 级 7 人、6 级 7 人、7 级 8 人、8 级 6 人、9 级 4 人、10 级 4 人。若小王岗位等级之上的员工约占员工总数的 16%，且一个岗位等级系数的点值为 2000 元，小王工资是多少？",
    options: ["4000 元", "6000 元", "16000 元", "18000 元"],
    answer: 2,
    explanation: "员工共 46 人，46×16%≈7.36。9 级和 10 级共 8 人，因此小王约为 8 级。工资为 8×2000=16000 元。",
    image: "/question-images/jd-math-levels.png",
    expectedSeconds: 100
  },
  {
    id: "jd2-n-04",
    paperId: "jd-assessment-set-2",
    source: "用户提供 PDF，第 8 页",
    category: "data",
    subtype: "增长率",
    difficulty: 2,
    prompt: "图中第五年收入总额为 31628.0 万元，比上一年的增加额为 5231.5 万元。第五年收入总额的增长率是：",
    options: ["19.8%", "16.5%", "21.6%", "17.7%"],
    answer: 0,
    explanation: "第四年收入为 31628.0-5231.5=26396.5 万元，增长率为 5231.5÷26396.5≈19.8%。",
    image: "/question-images/jd-math-income-growth.png",
    expectedSeconds: 75
  },
  {
    id: "jd2-n-05",
    paperId: "jd-assessment-set-2",
    source: "用户提供 PDF，第 9 页",
    category: "data",
    subtype: "增长量",
    difficulty: 3,
    prompt: "C 公司第三年利润总额为 127 百万元，第四年 1-9 月为 132 百万元。若第四年全年利润总额的增长率为 41%，则剩下三个月的利润总额要达到多少千万元？",
    options: ["8.325", "5.412", "4.707", "54.12"],
    answer: 2,
    explanation: "第四年目标利润为 127×(1+41%)=179.07 百万元。剩余利润为 179.07-132=47.07 百万元，即 4.707 千万元。",
    expectedSeconds: 90
  },
  {
    id: "jd2-n-11",
    paperId: "jd-assessment-set-2",
    source: "用户提供 PDF，第 13 页",
    category: "data",
    subtype: "图表比较",
    difficulty: 2,
    prompt: "某水泥厂 1-9 月产量依次为 45.5、34.7、46.2、50、40.4、62.8、49.1、63.2、55.5 万吨。第一、第二、第三季度平均产量之间的关系正确的是：",
    options: ["一季度＞二季度＞三季度", "三季度＞二季度＞一季度", "三季度＞一季度＞二季度", "二季度＞一季度＞三季度"],
    answer: 1,
    explanation: "各季度总量分别为 126.4、153.2、167.8。每季度月份数相同，比较总量即可得到三季度＞二季度＞一季度。",
    image: "/question-images/jd-math-quarter-output.png",
    expectedSeconds: 80
  }
];

export const SEED_QUESTIONS = [
  ...OFFICIAL_QUESTIONS,
  ...USER_PDF_QUESTIONS,
  ...JD_SUPPLEMENT_QUESTIONS
];

export const GUEST_QUESTIONS = OFFICIAL_QUESTIONS;

export const GUEST_PAPERS = PRACTICE_PAPERS.filter((paper) =>
  paper.id === "official-public-samples"
);

export function categoryById(id) {
  return PRACTICE_CATEGORIES.find((category) => category.id === id);
}

// These shortened passages omit evidence needed to distinguish their choices.
// Retain IDs and stored attempts; do not offer them again pending PDF comparison.
export const SUSPENDED_QUESTION_IDS = new Set(["jd-supp-09", "jd-supp-17", "jd-supp-21", "jd-supp-27"]);

export function hasValidOptionImages(question) {
  if (question.images !== undefined && !Array.isArray(question.images)) return false;
  const stimulus = [question.image, ...(question.images || [])].filter(Boolean);
  if (stimulus.some(image => typeof image !== "string" || !/^(?:https?:\/\/|\/(?!\/))/.test(image))) return false;
  const images = question.optionImages;
  if (images === undefined || (Array.isArray(images) && images.length === 0)) return true;
  if (!Array.isArray(images) || images.length !== question.options?.length) return false;
  const present = images.filter(Boolean);
  if (present.some(image => typeof image !== "string" || !/^(?:https?:\/\/|\/(?!\/))/.test(image))) return false;
  if (new Set(present).size !== present.length) return false;
  return images.every((image, index) => image || !/^(?:选项\s*)?[A-F]$/.test(String(question.options[index]).trim()));
}

export function validateImportedQuestions(raw) {
  const rows = Array.isArray(raw) ? raw : raw?.questions;
  if (!Array.isArray(rows)) throw new Error("文件需要是题目数组，或包含 questions 数组");
  return rows.map((question, index) => {
    const prompt = String(question.prompt || "").trim();
    const options = Array.isArray(question.options) ? question.options.map((option) => String(option).trim()) : [];
    if (!prompt || options.length < 2 || options.some((option) => !option)) {
      throw new Error(`第 ${index + 1} 题缺少题干或选项`);
    }
    if (/<|>|data-v=/i.test(prompt)) throw new Error(`第 ${index + 1} 题的题干包含未清理的网页标记`);
    const normalizedOptions = options.map((option) => option.replace(/\s+/g, ""));
    if (new Set(normalizedOptions).size !== normalizedOptions.length) throw new Error(`第 ${index + 1} 题存在重复选项`);
    const answer = question.answer === null || question.answer === "" || question.answer === undefined ? NaN : Number(question.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      throw new Error(`第 ${index + 1} 题答案必须是从 0 开始的选项序号`);
    }
    const images = Array.isArray(question.images) ? question.images.map(String).filter(Boolean) : [];
    if (!hasValidOptionImages({ ...question, options })) throw new Error(`第 ${index + 1} 题的选项图片缺失、重复或与选项数量不一致`);
    const optionImages = Array.isArray(question.optionImages) ? question.optionImages.map(image => image || "") : [];
    const hasVisual = Boolean(question.image) || images.length > 0 || optionImages.some(Boolean);
    const compactPrompt = prompt.replace(/\s+/g, "");
    const needsVisual = /(?:\u8bf7)?\u6839\u636e(?:\u4e0b\u5217)?(?:\u56fe\u7247|\u56fe\u8868|\u4e0b\u56fe|\u4e0b\u8868)|\u4e0b\u56fe[\uff0c\u3002:：\u662f\u4e3a\u5c55\u53cd\u6240]|\u4e0b\u8868[\uff0c\u3002:：\u662f\u4e3a\u5c55\u53cd\u6240]|\u56fe\u8868[\uff0c\u3002:：\u6240\u663e]/.test(compactPrompt);
    if (needsVisual && !hasVisual) {
      throw new Error(`第 ${index + 1} 题需要图片或图表，但文件中没有对应素材`);
    }
    return {
      id: question.id || `imported-${Date.now()}-${index}`,
      paperId: question.paperId || "imported",
      source: question.source || "本地导入",
      category: PRACTICE_CATEGORIES.some((item) => item.id === question.category) ? question.category : "logic",
      subtype: question.subtype || "未分类",
      difficulty: Math.min(5, Math.max(1, Number(question.difficulty) || 3)),
      prompt,
      options,
      answer,
      explanation: String(question.explanation || "暂无解析"),
      image: question.image ? String(question.image) : undefined,
      images,
      optionImages,
      expectedSeconds: Number(question.expectedSeconds) || 60
    };
  });
}
