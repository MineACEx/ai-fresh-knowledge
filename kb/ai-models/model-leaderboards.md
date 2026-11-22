---
seq: M-003
title: 模型排行榜口径差异 — BenchLM 与 LMArena 不可混用
date: 2026-10-31
datePrecision: month
category: ai-models
tags: [BenchLM, LMArena, benchmark, 模型排名, 评测]
status: current
sourceType: community
evidence: multi-source
verifiedBy: editor
summary: BenchLM 按能力维度打绝对分（Claude Opus 5.5 以 86.68 居首），LMArena 是 Elo 人类偏好榜，两者结论可能冲突
source:
  - "BenchLM — https://benchlm.ai"
  - "LMArena — https://lmarena.ai"
---

# 模型排行榜口径差异

> **一句话结论**：**BenchLM 测能力，LMArena 测偏好**——两个榜的第一名经常不是同一个模型，引用时必须说明用的是哪个。

## 时间线

| 日期 | 事件 |
|---|---|
| 2026-10 | BenchLM 收录 **228 个模型**，分 7 个能力维度 |
| 2026-10-15~21 | 单周内新增 **19 个模型**发布，迭代极快 |
| 2026-10 | Claude Opus 5.5 以 **86.68 分**位居 BenchLM 榜首 |

## 关键事实

**BenchLM / Artificial Analysis Intelligence Index**
- 收录规模：**228 个模型**
- 榜首：**Claude Opus 5.5 — 86.68 分**（90% 置信区间 81.8–91.6）
- 维度：Agentic / Coding / Reasoning / Knowledge / Math / Multimodal / Instruction following
- 另有专门的 "Best Chinese models" 榜单
- 更新频率：**极高**（一周 19 个新模型）

**LMArena**
- 口径：**Elo 人类偏好**（盲测投票）
- 与 BenchLM **结论可能冲突**

**2026-10 模型格局**
- OpenAI：GPT-6 Astra（旗舰）/ GPT-6.1 Sol（1M 上下文）/ GPT-5.6 Sol、Terra
- Anthropic：Claude Opus 5.5（榜一）/ Opus 4.6 / 4.5 系列
- Google：Gemini 3.0 Pro / 3.1 Pro / 3.1 Flash Lite / 3 Flash
- 中国：DeepSeek、GLM、Kimi、MiniMax、Qwen、Hunyuan 均在榜

## 为什么重要

**同一个模型，在两个榜上可能差很多名次。** 原因是它们测的根本不是一回事：
- BenchLM 用**客观题目**打分 → 反映"能不能做对"
- LMArena 用**人类盲投** → 反映"讨不讨人喜欢"

一个模型可以做对题但回答得让人不舒服，也可以答得漂亮但事实错。**引用排名时不说口径，等于没说。**

## 评价

**优点**：BenchLM 的置信区间（81.8–91.6）比单一分数诚实得多；分 7 个维度让选型有依据。

**问题**：**一周 19 个新模型**意味着任何排名到手就已过期；榜单本身也可能被厂商针对性优化（参见 GPT-6 Astra 的 99.9%→62.7%）。

**本喵的看法**：排行榜的唯一正确用法是**筛掉明显不合格的**，而不是挑第一名。真正选型必须自己拿真实任务跑一遍。

## 容易搞错的地方

- ❌ 误解"两个榜第一都是同一个" → ✅ **口径不同，结论可能冲突**
- ❌ 误解"86.68 分是绝对的" → ✅ 要看**置信区间 81.8–91.6**，差距可能不显著
- ❌ 误解"榜单更新慢，可以放心引用" → ✅ **一周 19 个新模型**，引用务必带日期
- ❌ 误解"中国模型落后" → ✅ BenchLM 有专门中国模型榜，**多家在榜且部分领先**

## 相关条目

- `M-001` GPT-6 Astra 技术规格
- `M-004` AGI 宣称与 99.9%→62.7% 翻车
