export const APPLICATION_RULES_UPDATED_AT = "2026-09-07";

export const APPLICATION_RULES = [
  {
    id: "dji-2027",
    company: "大疆",
    aliases: ["DJI", "大疆创新"],
    cohort: "2027 届拓疆者校招",
    checkedAt: "2026-09-07",
    signal: "常规校招 1 次",
    evidence: "official",
    evidenceLabel: "官方当届页面",
    quota: "拓疆者校招仅允许投递 1 次；数字管理构建者计划明确不占校招投递次数",
    parallel: "专项不占次数不等于流程一定并行，官网未明确并行安排",
    retry: "官网未说明未通过后是否返还投递机会",
    change: "当届公开页面未明确已投岗位的修改规则",
    advice: "先选准常规校招岗位；符合条件时可另外查看数字管理构建者计划，不要把专项例外套用到所有岗位。",
    sources: [
      { label: "2027 热招职位与投递说明", url: "https://careers.dji.com/zh-CN/campus/hot-jobs?source=campus_hotjobs" },
      { label: "数字管理构建者计划", url: "https://careers.dji.com/zh-CN/campus/digital-recruitment" }
    ]
  },
  {
    id: "honor-campus",
    company: "荣耀",
    aliases: ["HONOR"],
    cohort: "校招常驻 FAQ（未标届次）",
    checkedAt: "2026-09-07",
    signal: "1 岗 + 第二意向",
    evidence: "official",
    evidenceLabel: "招聘官网 FAQ",
    quota: "校招可投递 1 个职位，填写简历时可填写第二意向岗位",
    parallel: "第二意向不是第二次独立投递；官网未说明校招两个意向是否并行处理",
    retry: "官网未明确校招未通过后的重投或冷却期规则",
    change: "官网未明确校招已投岗位的修改规则",
    advice: "官网建议两个意向选择不同职类。FAQ 中“同时投两个职位”的说明属于社招，不能套用到校招。",
    sources: [
      { label: "官方招聘常见问题", url: "https://www.honor.com/cn/career/faq/" }
    ]
  },
  {
    id: "giant-2027",
    company: "巨人网络",
    aliases: ["巨人", "Giant", "征途"],
    cohort: "2027 届校招",
    checkedAt: "2026-09-07",
    signal: "最多 2 岗",
    evidence: "official",
    evidenceLabel: "官方 2027 校招 FAQ",
    quota: "最多可投递 2 个职位",
    parallel: "官方 FAQ 未说明两个职位是否同时推进",
    retry: "官方 FAQ 未说明未通过后是否返还投递名额",
    change: "简历提交后不再支持职位更改",
    advice: "提交前确认两个岗位都符合自己的方向；不要先随便投一个，再等后续换岗。",
    sources: [
      { label: "官方校招 FAQ", url: "https://hr.ztgame.com/campus/join/faq/" }
    ]
  },
  {
    id: "sangfor-2027",
    company: "深信服",
    aliases: ["Sangfor"],
    cohort: "2027 届秋招（含提前批、正式批）",
    checkedAt: "2026-09-07",
    signal: "两批合计 1 次",
    evidence: "mixed",
    evidenceLabel: "高校发布的当届招聘简章",
    quota: "秋招期间含提前批、正式批，仅有 1 次投递机会，只能投 1 个岗位",
    parallel: "仅可投递 1 个岗位，不是提前批和正式批各 1 岗",
    retry: "简章未承诺失败后返还机会，不应把正式批当成一次额外机会",
    change: "投递后无法修改",
    advice: "先确认岗位再提交；网申中的校招站点对应后续线下面试地点，也要一起核对。",
    sources: [
      { label: "华中科大 · 2027 招聘简章", url: "https://job.hust.edu.cn/zpinfo1/2412948.htm" }
    ]
  },
  {
    id: "bytedance-2027",
    company: "字节跳动",
    aliases: ["字节", "ByteDance"],
    cohort: "2027 届校招",
    signal: "全年 4 次",
    evidence: "official",
    evidenceLabel: "官网与公开口径已核验",
    quota: "2026 年可投 2 次，2027 年 1 月 1 日再刷新 2 次",
    parallel: "同一年度的两个职位彼此独立，系统优先处理较早投递的职位",
    retry: "公开规则未说明流程结束后返还当年名额，但已明确次年会刷新 2 次",
    change: "已投递职位不能更换；简历修改只会用于之后新投递的职位",
    advice: "把每次机会留给岗位职责和经历证据最匹配的职位，不要用名额试水。",
    sources: [
      { label: "校招官网 FAQ", url: "https://jobs.bytedance.com/campus/page-6272Gc" },
      { label: "27 届规则报道", url: "https://edu.cnr.cn/gc/20260804/t20260804_527746913.shtml" }
    ]
  },
  {
    id: "kuaishou-2027",
    company: "快手",
    aliases: ["Kuaishou"],
    cohort: "2027 届留用实习 / 26 届补录",
    signal: "不限总次数",
    evidence: "mixed",
    evidenceLabel: "校方转发企业通知",
    quota: "不限总投递次数",
    parallel: "一次只推进 1 个岗位",
    retry: "当前岗位流程结束后，可以重新投递其他岗位，不限次数",
    change: "公开材料没有写明流程进行中能否更换岗位",
    advice: "可以多次尝试，但需要等当前岗位流程结束后再投下一个。",
    sources: [
      { label: "规则出处", url: "https://eie.bjtu.edu.cn/cms/item/5822.html" },
      { label: "官方投递入口", url: "https://campus.kuaishou.cn/recruit/campus/e/h5/#/campus/jobs" }
    ]
  },
  {
    id: "alibaba-2027",
    company: "阿里巴巴",
    aliases: ["阿里", "Alibaba"],
    cohort: "2027 届校招",
    signal: "多业务并行",
    evidence: "mixed",
    evidenceLabel: "官网与校方招聘简章",
    quota: "每个业务集团或公司只有 1 次投递机会，最多选择 2 个意向",
    parallel: "可以投递多个业务集团，不同业务的应聘流程可并行",
    retry: "官网公开介绍了人才库重开机制，具体触发仍以个人中心显示为准",
    change: "同一业务的两个意向会按志愿顺序流转",
    advice: "先按业务集团拆分机会，再在每个业务内排好两个志愿。",
    sources: [
      { label: "27 届校招官网", url: "https://campus-talent.alibaba.com/campus/gov" },
      { label: "投递规则简章", url: "https://career.nankai.edu.cn/correcruit/content/id/116569.html" }
    ]
  },
  {
    id: "baidu-campus",
    company: "百度",
    aliases: ["Baidu"],
    cohort: "校招常驻规则",
    signal: "最多 1 岗",
    evidence: "official",
    evidenceLabel: "招聘官网帮助页",
    quota: "校招最多只能投递 1 个岗位",
    parallel: "没有并行岗位，当前只保留 1 个校招申请",
    retry: "官网帮助页没有说明流程结束后是否恢复投递机会",
    change: "仅在简历状态为“简历初筛-待处理”时可以更换岗位",
    advice: "投递后尽快检查岗位是否选对，进入下一状态前仍有一次调整窗口。",
    sources: [
      { label: "官方招聘帮助", url: "https://talent.baidu.com/mobile/recruit/help.html" },
      { label: "校招岗位入口", url: "https://talent.baidu.com/jobs/campus" }
    ]
  },
  {
    id: "huawei-campus",
    company: "华为",
    aliases: ["Huawei"],
    cohort: "校招常驻规则",
    signal: "最多 2 岗",
    evidence: "official",
    evidenceLabel: "官方校招 FAQ",
    quota: "每位同学最多投递 2 个岗位",
    parallel: "两个志愿可以同时保留，面试优先安排第一志愿",
    retry: "公开 FAQ 没有写明未通过后是否返还岗位名额",
    change: "官网提供调整申请职位和第一志愿的入口，实际可改状态以个人中心为准",
    advice: "第一志愿会影响面试安排，应该放最想去且匹配度最高的岗位。",
    sources: [
      { label: "官方校招 FAQ", url: "https://career.huawei.com/reccampportal/next/mini/faq_h5.html" },
      { label: "校园招聘入口", url: "https://career.huawei.com/cn/campus-recruitment" }
    ]
  },
  {
    id: "tme-2027",
    company: "腾讯音乐娱乐",
    aliases: ["腾讯音乐", "TME"],
    cohort: "2027 届校招",
    signal: "仅 1 岗",
    evidence: "official",
    evidenceLabel: "官方 2027 校招 FAQ",
    quota: "每位同学只能投递 1 个职位",
    parallel: "职位只有 1 个，但可以选择最多 3 个感兴趣的业务线",
    retry: "简历未进入流程时可以替换职位；进入流程后的再次投递规则未明确",
    change: "简历未在流程中可以改岗；已提交的业务线选择不能修改",
    advice: "先选准职位，再把 3 个业务线名额留给真正愿意去的团队。",
    sources: [
      { label: "官方 2027 FAQ", url: "https://join.tencentmusic.com/campus/faq/" },
      { label: "校招职位入口", url: "https://join.tencentmusic.com/campus/post" }
    ]
  },
  {
    id: "jd-2027",
    company: "京东",
    aliases: ["JD"],
    cohort: "2027 届校招",
    signal: "项目间不冲突",
    evidence: "mixed",
    evidenceLabel: "校方转发招聘简章",
    quota: "公开简章没有说明单个招聘项目内的岗位数量上限",
    parallel: "JD STAR、TGT、JD YOUNG 等不同招聘项目之间互不冲突，均可投递",
    retry: "公开简章没有说明单个岗位结束后的再次投递规则",
    change: "是否能修改岗位需登录个人中心核对",
    advice: "可以按不同项目分别投递，但单个项目内先确认清楚再占用岗位。",
    sources: [
      { label: "27 届招聘简章", url: "https://jdjywpt.jlu.edu.cn/mportal/recruit/details?id=9883a420b4cb4aed99faa46100b306bd" },
      { label: "官方校招入口", url: "https://campus.jd.com" }
    ]
  },
  {
    id: "tencent-2027-intern",
    company: "腾讯",
    aliases: ["Tencent", "鹅厂"],
    cohort: "2027 届实习生招聘",
    signal: "投递不设上限",
    evidence: "mixed",
    evidenceLabel: "官网常驻说明与校方通知",
    quota: "公开招聘通知写明投递岗位无上限",
    parallel: "同一时间只能在 1 个岗位进入面试流程",
    retry: "当前未在面试流程时可以继续切换和投递岗位",
    change: "尚未进入面试时可切换岗位，进入流程后应先联系 HR",
    advice: "可以多次尝试，但不要同时接受多个面试流程。",
    sources: [
      { label: "官方招聘帮助", url: "https://jobs.tencent.com/jobopportunity.html" },
      { label: "27 届实习通知", url: "https://cs.hust.edu.cn/info/1404/5709.htm" }
    ]
  },
  {
    id: "meituan-2027",
    company: "美团",
    aliases: ["Meituan"],
    cohort: "2027 届校招",
    signal: "最多 3 志愿",
    evidence: "mixed",
    evidenceLabel: "校方转发企业通知",
    quota: "每位同学最多投递 3 个志愿",
    parallel: "LongCat 顶尖人才校招或北斗计划可与常规岗位同时投递",
    retry: "公开通知未说明单个志愿结束后是否返还名额",
    change: "未填写的志愿可后续补充，已提交志愿的修改状态需登录个人中心确认",
    advice: "先填最匹配的志愿，留出余量给后续新放出的岗位。",
    sources: [
      { label: "27 届招聘通知", url: "https://www.career.zju.edu.cn/jyxt/sczp/zpztgl/ckZpgwXq.zf?zpxxbh=5A57DBACE0D84D04E0653A68DD0E9B18" },
      { label: "官方校招入口", url: "https://zhaopin.meituan.com/web/campus" }
    ]
  },
  {
    id: "xiaomi-2027",
    company: "小米",
    aliases: ["Xiaomi"],
    cohort: "2027 届校招",
    signal: "最多 2 岗",
    evidence: "mixed",
    evidenceLabel: "官网投递须知与当期报道",
    quota: "当期公开口径为每人最多投递 2 个岗位",
    parallel: "同一时间只处理 1 个岗位，系统优先处理最早投递的岗位",
    retry: "官网未说明流程结束后是否返还投递名额",
    change: "岗位提交后不能修改",
    advice: "第一个岗位会先进流程，应把首选放在最前面。",
    sources: [
      { label: "官方投递须知", url: "https://career.mi.com/deliveryInstructions" },
      { label: "27 届规则报道", url: "https://finance.sina.com.cn/tech/discovery/2026-08-10/doc-inimvnpp4912718.shtml" }
    ]
  },
  {
    id: "pony-2027",
    company: "小马智行",
    aliases: ["Pony.ai", "小马"],
    cohort: "2027 届校招",
    signal: "最多 2 岗",
    evidence: "official",
    evidenceLabel: "官方 2027 校招指南",
    quota: "每人最多投递 2 个职位",
    parallel: "官网说明会默认优先处理较早投递的职位",
    retry: "官方指南未说明流程结束后是否返还名额",
    change: "官方指南未说明已提交职位的修改规则",
    advice: "第一志愿会更早被处理，两次机会要按匹配度排序。",
    sources: [
      { label: "官方校招指南", url: "https://campus.pony.ai/guideline" },
      { label: "官方校招入口", url: "https://campus.pony.ai/" }
    ]
  },
  {
    id: "netease-games-2027",
    company: "网易游戏",
    aliases: ["网易互娱", "NetEase Games"],
    cohort: "2027 届校招",
    signal: "2 个志愿",
    evidence: "mixed",
    evidenceLabel: "校方转发企业通知",
    quota: "可同时投递 2 个志愿",
    parallel: "2 个志愿可以同时投递",
    retry: "实习生项目与校园招聘项目相互独立",
    change: "志愿进入流程前可随时修改或增加，进入流程后无法修改",
    advice: "两个志愿可并行，但要在任一志愿进流程前完成调整。",
    sources: [
      { label: "27 届招聘通知", url: "https://scdc.jnu.edu.cn/campus/view/id/1036546" },
      { label: "官方校招入口", url: "https://game.campus.163.com/" }
    ]
  },
  {
    id: "xiaohongshu-2027-intern",
    company: "小红书",
    aliases: ["RED", "Xiaohongshu"],
    cohort: "2027 届实习生招聘",
    signal: "2 个志愿",
    evidence: "mixed",
    evidenceLabel: "校方转发企业通知",
    quota: "每人可投递 2 个志愿",
    parallel: "公开通知未说明两个志愿是否同时推进",
    retry: "如流程结束，企业可能进行岗位调剂",
    change: "2 个志愿提交后无法修改",
    advice: "志愿一旦提交不能换，两个选择都要与简历经历直接匹配。",
    sources: [
      { label: "27 届实习通知", url: "https://career.gdut.edu.cn/campus/view/id/1020386" },
      { label: "官方校招入口", url: "https://campus.xiaohongshu.com" }
    ]
  }
];
