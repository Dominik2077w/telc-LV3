# LV3 PDF 语料库分析

## 提取结果

- 来源：PDF 可复制文字（`pdftotext -layout`）
- 语料文件：`data/pdf_text.txt`
- 提取到 19 个 Teil，230 条题目记录。
- 答案分布：F=81，R=90，X=40，未标注=5，C=6，B=4，A=4

## 题型结构

- 第 13-23 题为 `R/F/X` 判断题。
- 第 24 题通常为 `A/B/C` 主旨题。
- 正面练习优先使用 `german` 字段，背面使用 `german`、`chinese` 和 `answer`。

## Teil 清单

| Teil | 标题 | 提取题数 | 答案序列 |
| --- | --- | ---: | --- |
| 1 | Mint-Fächer Nachwuchs | 16 | 13:F 14:R 15:X 16:R 17:R 17:F 18:X 19:F 20:F 20:R 21:R 22:R 23:F 24:F 23:R 24:? |
| 2 | Zukunftsperspektiven für die Verpackungsindustrie | 19 | 13:R 13:R 14:F 15:F 16:R 17:R 17:X 17:X 18:F 18:F 19:X 20:F 20:R 21:F 22:F 22:R 23:R 23:R 24:C |
| 3 | Essen in der Mensa | 13 | 13:R 14:F 15:R 16:F 17:F 18:F 18:R 19:X 20:R 21:F 22:F 23:X 24:C |
| 4 | Johan Friedrich oder Gold | 12 | 13:R 14:X 15:R 16:R 17:F 18:R 19:X 20:F 21:R 22:R 23:R 24:B |
| 5 | Sabbatical | 12 | 13:F 14:R 15:F 16:R 17:R 18:X 19:F 20:R 21:X 22:R 23:R 24:C |
| 6 | Auswanderung ärzten nach Schweden / Schweden umwerbt ärtzte | 16 | 13:F 14:R 15:F 15:F 16:X 17:R 18:F 18:F 19:R 20:F 21:R 22:X 23:F 23:R 24:C 24:C |
| 7 | Mehrsprachigkeit | 11 | 13:F 14:F 15:X 16:R 17:X 18:F 19:R 20:R 21:R 22:F 23:F |
| 8 | Reisen | 12 | 13:R 14:F 15:F 16:R 17:F 18:F 19:X 20:F 21:X 22:R 23:R 24:? |
| 9 | Schimpansen und Gorilla | 12 | 13:X 14:F 15:? 16:F 17:R 18:R 19:R 20:F 21:X 22:F 23:R 24:A |
| 10 | Schafe | 12 | 13:R 14:F 15:F 16:R 17:F 18:X 19:F 20:X 21:R 22:R 23:R 24:C |
| 11 | Erika Fuchs Comic-Übersetzerin | 12 | 13:F 14:R 15:R 16:R 17:X 18:F 19:F 20:R 21:F 22:F 23:X 24:A |
| 12 | Umweltschutz oder Vögel | 12 | 13:R 14:R 15:R 16:F 17:F 18:R 19:X 20:F 21:X 22:R 23:R 24:B |
| 13 | Bundesfreiwilligendienst | 12 | 13:F 14:R 15:F 16:X 17:F 18:X 19:R 20:F 21:R 22:R 23:F 24:A |
| 14 | Kleingarten | 12 | 13:R 14:X 15:R 16:F 17:F 18:X 19:R 20:X 21:R 22:F 23:F 24:B |
| 15 | Camping | 11 | 13:R 14:F 15:X 16:R 17:R 18:X 19:F 20:R 22:R 23:R 24:A |
| 16 | Spielzeugindustrie | 12 | 13:R 14:F 15:R 16:R 17:X 18:F 19:F 20:R 21:F 22:X 23:F 24:B |
| 17 | etwas über Insel （待定） | 0 |  |
| 18 | PRÄSENTATIONEN AN DER UNI: LANGEWEILE GARANTIERT Zweitstudium | 12 | 13:R 14:F 15:F 16:X 17:R 18:R 19:X 20:F 21:X 22:R 23:R 24:? |
| 19 | Schlangenhaargürken aus Nigeria | 12 | 13:X 14:R 15:X 16:R 17:F 18:F 19:X 20:F 21:R 22:F 23:F 24:? |

