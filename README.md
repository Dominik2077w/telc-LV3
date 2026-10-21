# telc C1 Hochschule Trainer

本地静态练习应用，包含 LV2、LV3、HV1、HV2、Baustein、口语及写作七个模块。

全部语料以用户提供的 329 页《2026实时更新2026.9(腾讯文档实时更新）.pdf》为唯一来源重新提取覆盖，共 **1674 条练习记录**。每条题目记录来源页码。旧 Excel 精选、额外语法卡和 PDF 未收录的历史题组已移除。PDF 未提供 HV2 的错误选项；练习中的两个干扰项是独立编写的无关主题陈述，不通过否定或改写正确答案生成，也不借用其他题目的正确答案。

详细范围、数量、照片转录、存疑项及重建方法见 [语料说明](docs/corpus-2026-09.md)。HV1 说明见 [来源核对](docs/hv1-source-2026-09.md)。PDF 本身不提交到仓库。

## 使用

```bash
npm run serve
```

打开 [本地应用](http://localhost:4173/index.html)。按题组、顺序或随机顺序练习，可启用错题轮回和只练 2026.9 新增。

- LV2：A–E 段落卡片、原文题项配对和全局排序；存疑映射不评分。
- LV3：Richtig / Falsch / Nicht im Text 及标题题；来源未标答案的题不判错。
- HV1：记忆原文 Sprecher 顺序后逐题听音选择，也可逐句复习；Mode 无顺序答案，使用陈述复习卡。
- HV2：三选一辨认 PDF 正确完整句；另两个选项是独立编写的无关主题陈述，不复用其他题目的正确答案，答题后查看 PDF 中文和来源说明。
- Baustein：原文只给正确填空词，采用复习卡；不生成干扰选项。
- 口语、写作：完整原文任务及观点；原文没有中文时明确标注。

HV1 合成音频与对应长稿均取自这份 PDF。音频工具在 `scripts/local/qwen3-tts/`，可用的压缩音频随构建复制；没有音频的题仍可阅读原文练习。

## 重建与检查

```bash
python -m pip install pypdf
npm run extract -- "/path/to/2026实时更新2026.9(腾讯文档实时更新）.pdf" --dry-run
npm run extract -- "/path/to/2026实时更新2026.9(腾讯文档实时更新）.pdf"
npm run check:corpus
npm run check:hv1
npm run check:hv2
npm run check
npm run build
```

导入校验指纹、页数和完整题量后覆盖题库。`npm run build` 输出 `dist/`。PDF、来源绝对路径和本地模型不进入发布包。

## 发布与手机使用

项目站点：[telc Trainer](https://dominik2077w.github.io/telc-LV3/)。推送到 main 会由 GitHub Actions 校验、构建并发布，此次本地修改不会自动上线。

手机在 Safari 或其他浏览器打开站点，使用“题组 / 设置”选择范围并开始练习。HV2 三个选项纵向排列并支持触屏选择；屏幕较窄时 LV2 配对使用原生选择控件，卡片内容可换行滚动。资源版本号会在更新时递增，以便加载最新练习。
