# HV1 完整替换核对（2026-10-20）

唯一题源：用户提供的 `2026实时更新2026.9(腾讯文档实时更新）.pdf`，329 页，SHA-256：
`dfa404ef59dfe38308e702daf614251eea025e313a1f0245c71e5b613c848999`。

本次从文件第 182–227 页重新提取并核对全部 HV1。共 21 组、170 条：20 组各 8 条有明确 Sprecher 顺序；Mode 一组 10 条无答案。题组数量与旧库相同，因为这些主题在本 PDF 中确实全部出现；实际内容全部重新生成，未将旧题库作为补充来源。

## 题组与原文明示字母

下表页码是 PDF 文件页码。字母按 Sprecher 1–8 顺序列出；“未标”表示总结列表未给字母，排序仍按明示的 Sprecher 序号进行，不自行补字母。题目逐条保留 `sourcePages`、`sourceGerman` 和 `sourceAnswer`。

| 练习 Teil | PDF 主题 | 页码 | 原文明示字母 |
| --- | --- | --- | --- |
| 1 | Internet | 182–185 | 未标 |
| 2 | Studiengebühren | 185–189 | 未标 |
| 3 | Eltern und Studium | 189–193 | 未标 |
| 4 | Tempolimit oder Geschwindigkeitslimit / Metropolen | 193–197 | 未标 |
| 5 | Gentechnik | 198–202 | 未标 |
| 6 | Umweltschützt | 202–205 | 未标 |
| 7 | Glück | 206–209 | 未标 |
| 8 | Studienwahl | 209–213 | 未标 |
| 9 | Wohnkredit | 213–217 | 未标 |
| 10 | Pendeln | 217–218 | 未标 |
| 11 | Studienfinanzierung | 218–219 | C D B J E A G H |
| 12 | Gärten | 219 | A I D B E J G C |
| 12-2 | Grünflächen | 219–220 | C I B D E J G A |
| 13 | Nebenjob | 220–221 | G C F J B H I A |
| 13-2 | Nebenjob im Studium（2） | 221–222 | G B A C F D H I |
| 14-1 | Online Bücher | 222–223 | 未标，仅 1–8 编号 |
| 14-2 | Bargeld | 223–224 | H B E D A F C J |
| 15 | Ernährung | 224 | G E B H A J F D |
| 16 | Hausarbeiten | 224–225 | H I A B F C J E |
| 17 | Mode und Trends / Modebranche | 225–226 | 明确“暂无答案”，只有 A–J 陈述 |
| 18 | TEMPOLIMIT | 226–227 | G I B H F C E J |

Grünflächen 和 Nebenjob 的两版、两组 Teil 14，以及 Teil 4 / 18 的限速主题都由 PDF 自身收录，因此分别保留。保留原有 66 条 `2026.9 新增` 标记；此前的 104 条改为 `2026.9 修订`，新增筛选不会混入修订题。

## 替换及清理

- 每组只取第一次出现的 Sprecher 1–8 总结列表，后续长听力稿和助记口诀不会混入排序题或单句翻译。
- 移除 72 条旧长稿及其 72 个音频引用；清空原先 104 条人为生成的 `answer: A–H`，仅在 `sourceAnswer` 记录 PDF 总结列表中真正印出的字母。
- 清理 99 个旧 `_agent_results`、`split_teils`、`split_sprechers` 中间文件，以及 5 个旧 PDF 提取、合并、补题和音频生成脚本。旧 PDF 不再参与 HV1 生成。
- 旧“逐一匹配”改为“逐句复习（按新 PDF）”，与排序使用相同题源。
- 德文仅合并换行、行末断词和排版空格，去掉题号与答案标记；不借用旧库补全、改写原文用词。`sourceGerman` 保留清理前的题句。

## 原文异常的处理

- Teil 3 / Sprecher 7 同时印出 `kaumer` 和 `weniger` 两种表述。排序采用原文后一种，另一种保存在 `sourceVariants`；排序界面有说明，逐句复习显示两种德文。
- Teil 13 / Sprecher 2 原文以 `zu...` 截断，练习保持截断并显示说明。旧库自行补出的完整句子已移除。
- Teil 13 / Sprecher 8 德文说兼职对学习效果有积极影响，中文却误重复 Sprecher 7 的负面句。本次按同一条德文校正中文，保留 `sourceChinese` 和 `translationSource` 供核对。
- Teil 1 的总结列表没有逐条中文，采用后续同句译文；第 5 项无单句译文，直接按 PDF 德文补译并标记 `translationSource`。不使用助记口诀代替题句翻译。
- Mode 的 A–J 是陈述编号，未当作 Sprecher 答案，也未编造八项顺序。
- 其他疑似拼写或语法问题（如 `Gin-Food`、`Barern` 等）保留 PDF 用词。

## 重建与检查

```bash
python scripts/update-corpus-2026-09.py "/path/to/2026实时更新2026.9(腾讯文档实时更新）.pdf" --only-hv1 --dry-run
python scripts/update-corpus-2026-09.py "/path/to/2026实时更新2026.9(腾讯文档实时更新）.pdf" --only-hv1
npm run check:corpus
npm run check:hv1
npm run build
```

导入会先验证文件指纹和完整题组清单，再替换整个 HV1 数组；未出现的旧题组不会被合并回来，来源缺页时拒绝覆盖。`--only-hv1` 不改写其他模块。全库导入同样使用这一完整替换流程。浏览器 JS 与 JSON 两份数据保持一致。
