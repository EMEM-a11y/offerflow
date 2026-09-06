# 网申自动填写能力调研

## 参考项目

- [Simplify Copilot](https://simplify.jobs/copilot)：覆盖多类招聘门户，提供表单自动填写、基于经历的开放题回答和岗位追踪。
- [AutoApply](https://github.com/geckguy/AutoApply)：本地浏览器扩展配合本地服务，读取当前表单并匹配资料，保留最终提交给用户。
- [OpenJobAutofill](https://github.com/Br1an67/OpenJobAutofill)：本地保存资料，扫描当前页面，识别无法可靠填写的字段并标记待处理。
- [JobApplyAutofill](https://github.com/aaa-wxl/JobApplyAutofill)：把本地规则和可选的字段识别组合起来，覆盖输入框、选择框、日期、单选和复选字段。
- [JobMatchAI](https://github.com/wadekarg/JobMatchAI)：在真正写入页面前展示可勾选的建议答案，并把 JD 匹配、回答草稿和申请跟踪放在同一流程中。
- [jobfill](https://github.com/23aaaa/jobfill)：面向中文招聘场景，覆盖牛客、智联、BOSS 及企业官网等页面。

## MVP 采用的产品原则

1. 资料只维护一次：基本信息、教育经历、项目、文件和开放题答案共用同一份资料库。
2. 每个建议都展示来源：区分直接引用、需要核对和缺少资料。
3. 高可信字段可以默认选中，生成或改写的内容默认不选中。
4. 简历文件保存在浏览器的 IndexedDB 中，结构化资料保存在 localStorage 中。
5. 不编造经历，不在没有用户确认时向外部招聘网站写入个人信息，不自动点击最终提交。

## 当前实现与下一阶段

当前版本已经可以生成、编辑、勾选、核对和复制投递填写包。由于普通网页不能跨域读取其他招聘网站的表单，真正的“识别当前招聘页面并自动填入”需要浏览器扩展或受控浏览器连接。下一阶段可在现有字段映射协议之上增加扩展，不需要重做资料库。
