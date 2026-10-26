# HV1 来源核对（2026-10-20）

唯一题源为 329 页《2026实时更新2026.9(腾讯文档实时更新）.pdf》，SHA-256：`dfa404ef59dfe38308e702daf614251eea025e313a1f0245c71e5b613c848999`。HV1 范围为文件第 182–227 页。

21 组共 170 条陈述：20 组各有 8 条明确 Sprecher 顺序；Mode 有 10 条 A–J 陈述，原文明示无答案。原文中两版 Grünflächen、Nebenjob，以及两组 Teil 14 均保留。前九组还附有本 PDF 实际提供的 69 段长听力稿，以 `sourceTranscript` 和 `sourceTranscriptPages` 记录，用于同源听音功能。

| Teil | 主题 | 页码 | 按 Sprecher 1–8 印出的字母 |
| --- | --- | --- | --- |
| 1 | Internet | 182–185 | 未标 |
| 2 | Studiengebühren | 185–189 | 未标 |
| 3 | Eltern und Studium | 189–193 | 未标 |
| 4 | Tempolimit / Metropolen | 193–197 | 未标 |
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
| 14-1 | Online Bücher | 222–223 | 未标，仅编号 |
| 14-2 | Bargeld | 223–224 | H B E D A F C J |
| 15 | Ernährung | 224 | G E B H A J F D |
| 16 | Hausarbeiten | 224–225 | H I A B F C J E |
| 17 | Mode und Trends / Modebranche | 225–226 | 明示无答案，A–J 是陈述编号 |
| 18 | TEMPOLIMIT | 226–227 | G I B H F C E J |

陈述只取每组第一次出现的 Sprecher 总结，长稿和助记口诀不混进陈述。字母仅记录在 `sourceAnswer`，不自行分配 A–H。`sourceGerman` 保留原句；德文显示只清理排版换行、空格和行末断词。

- 3/7 的 kaumer / weniger 两种原文都保存在 `sourceVariants`，练习采用后一种并说明。
- 13/2 以 `zu...` 截断，原样保留，不补写完整句。
- 13/8 的原文中文重复上一项，与本句德文相反。按唯一来源原则保留原文中文，显示问题说明，不保留旧库自行校正的译文。
- Internet 第 1–4、6–8 项中文取自后续原文同句译文；第 5 项没有单句中文，明确标注未提供，不补译。
- 原文拼写和语法问题保留。Mode 不编造八项答案或顺序。

```bash
python scripts/update-corpus-2026-09.py "/path/to/2026实时更新2026.9(腾讯文档实时更新）.pdf" --only-hv1
npm run check:corpus
npm run check:hv1
```

完整重建和 `--only-hv1` 都直接从 PDF 构造 HV1，不合并旧题。已有合成音频仅在朗读文本完全一致时保留引用。总库范围见 [语料重建说明](corpus-2026-09.md)。


## 听音连线界面（2026-10-26）

先预习完整八项正确顺序，每句旁可播放该项录音。练习时，左侧保持一列八句话，右侧从上到下为第 1–8 位；先点左句再点右格生成连线，不移动句子。每句和每个位置最多一条线；重新连接会释放旧关系，点已连空格可取消。八条全部连接后才允许统一提交。卡片只显示选项短句，不挂出 `sourceTranscript`；顶部唯一播放器提供暂停、拖动音频进度和重听，连接与取消不会中断正在播放的录音。桌面和手机都显示连线，并在尺寸变化后重算端点；长句可在卡片内滚动。提交后用户连线按正误显示绿色或红色，错句注明应连位置，右侧错误位置注明应接句子；仍可重听并展开完整正确顺序。错题轮回保留完整八项，评分按八个位置计算。题源、陈述和已有压缩音频保持原样。
