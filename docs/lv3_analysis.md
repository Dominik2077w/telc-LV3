# LV3 题型分析

## 提取结果

- 来源文件：`MinerU_markdown_202604272326351_83e110a2.md`
- 正文范围：从 `# LV3(最后一题是三选一选择题)` 到 `# Baustein`
- 提取到 19 个 Teil，232 条题目记录。
- 答案分布：F=82，R=91，X=40，未标注=5，C=6，B=4，A=4

## 题型结构

LV3 主要是阅读理解判断题：

- 每个 Teil 通常对应一篇文章或一个主题。
- 第 13 到 23 题是判断类题目，答案常见为 `R`、`F`、`X`。
- `R` 表示 richtig/正确，`F` 表示 falsch/错误，`X` 表示 nicht im Text/文中未提及。
- 第 24 题通常是三选一标题/主旨题，答案为 `A`、`B`、`C`；部分 OCR 文本没有标出答案，需要人工补齐。
- 资料提醒考试会改同义替换，也会添加或删去 `nicht`、`ohne` 等否定词，所以练习软件应重点训练“原句判断 + 否定敏感度”。

## 软件数据建议

- 数据层：以 `data/lv3_questions.json` 为初始题库，每个 Teil 存标题、原文、题目、答案。
- 练习模式：按 Teil 练习、乱序练习、错题复习、只练 `X` 题、只练否定题。
- 交互模式：每题提供 `R/F/X` 三按钮；第 24 题提供 `A/B/C` 三按钮。
- 复盘模式：答完后显示德文题干、中文翻译/OCR 附近内容、正确答案、错题原因标签。
- 风险点：OCR 中有拼写错误、重复题、个别答案缺失，正式导入前需要人工校对一轮。

## Teil 清单

| Teil | 标题 | 提取题数 | 答案序列 |
| --- | --- | ---: | --- |
| 1 | Mint-Fächer Nachwuchs | 16 | 13:F 14:R 15:X 16:R 17:R 17:F 18:X 19:F 20:F 20:R 21:R 22:R 23:F 24:F 23:R 24:? |
| 2 | Zukunftsperspektiven für die Verpackungsindustrie | 19 | 13:R 13:R 14:F 15:F 16:R 17:R 17:X 17:X 18:F 18:F 19:X 20:F 20:R 21:F 22:F 22:R 23:R 23:R 24:C |
| 3 | Essen in der Mensa | 14 | 13:R 14:F 15:R 16:F 17:F 17:F 18:F 18:R 19:X 20:R 21:F 22:F 23:X 24:C |
| 4 | Johan Friedrich oder Gold | 12 | 13:R 14:X 15:R 16:R 17:F 18:R 19:X 20:F 21:R 22:R 23:R 24:B |
| 5 | Sabbatical | 12 | 13:F 14:R 15:F 16:R 17:R 18:X 19:F 20:R 21:X 22:R 23:R 24:C |
| 6 | Auswanderung arzten nach Schweden / Schweden umwerbt arztze | 16 | 13:F 14:R 15:F 15:F 16:X 17:R 18:F 18:F 19:R 20:F 21:R 22:X 23:F 23:R 24:C 24:C |
| 7 | Mehrsprachigkeit | 11 | 13:F 14:F 15:X 16:R 17:X 18:F 19:R 20:R 21:R 22:F 23:F |
| 8 | Reisen | 12 | 13:R 14:F 15:F 16:R 17:F 18:F 19:X 20:F 21:X 22:R 23:R 24:? |
| 9 | Schimpansen und Gorilla | 12 | 13:X 14:F 15:? 16:F 17:R 18:R 19:R 20:F 21:X 22:F 23:R 24:A |
| 10 | Schafe | 12 | 13:R 14:F 15:F 16:R 17:F 18:X 19:F 20:X 21:R 22:R 23:R 24:C |
| 11 | Erika Fuchs Comic-Übersetzerin | 12 | 13:F 14:R 15:R 16:R 17:X 18:F 19:F 20:R 21:F 22:F 23:X 24:A |
| 12 | Umweltschutz oder Vogel | 12 | 13:R 14:R 15:R 16:F 17:F 18:R 19:X 20:F 21:X 22:R 23:R 24:B |
| 13 | Bundesfreiwilligendienst | 12 | 13:F 14:R 15:F 16:X 17:F 18:X 19:R 20:F 21:R 22:R 23:F 24:A |
| 14 | Kleingarten | 12 | 13:R 14:X 15:R 16:F 17:F 18:X 19:R 20:X 21:R 22:F 23:F 24:B |
| 15 | Camping | 12 | 13:R 14:F 15:X 16:R 17:R 18:X 19:F 20:R 21:R 22:R 23:R 24:A |
| 16 | Spielzeugindustrie | 12 | 13:R 14:F 15:R 16:R 17:X 18:F 19:F 20:R 21:F 22:X 23:F 24:B |
| 17 | etwas über Insel (待定) | 0 |  |
| 18 | PRÄSENTATIONEN AN DER UNI: LANGEWEILE GARANTIERT Zweitstudium | 12 | 13:R 14:F 15:F 16:X 17:R 18:R 19:X 20:F 21:X 22:R 23:R 24:? |
| 19 | Schlangenhaargürken aus Nigeria | 12 | 13:X 14:R 15:X 16:R 17:F 18:F 19:X 20:F 21:R 22:F 23:F 24:? |

