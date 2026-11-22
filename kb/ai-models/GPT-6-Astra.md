---
seq: M-001
title: GPT-6 Astra 发布与五档推理深度
date: 2026-09-03
category: ai-models
tags: [OpenAI, GPT-6, 旗舰模型, 长上下文]
status: current
summary: 2026-09-03 发布，105 万 token 上下文、128k 输出，输出 $50/M tokens，五档 effort，仅有 Responses API 支持工具调用
source: [OpenAI](https://openai.com)
confidence: verified
---

# GPT-6 Astra

> **一句话结论**：这是 2026 年的旗舰级 GPT，上下文 105 万 token，但**工具调用必须走 Responses API**，Chat Completions 不再支持。

## 时间线

| 日期 | 事件 |
|---|---|
| 2026-09-03 | GPT-6 Astra 正式发布 |
| 2026-09-04 | API 上线，模型 ID `gpt-6-astra`，单一快照 |
| 2026-09-15 | 被评定为 OpenAI 首个 Critical 级网络安全能力模型 |
| 2026-10 | 仍在服务，与 GPT-6.1 Sol / GPT-5.6 Sol、Terra 并存 |

## 关键事实

- **上下文**：1,050,000 tokens 输入 / 128,000 tokens 最大输出
- **知识截止**：2026-04-30
- **定价**（每 1M tokens）：输入 $10 ｜ 缓存输入 $1 ｜ 缓存写入 $12.50 ｜ 输出 $50
- **长上下文档位**：输入超过 **272K tokens** 后费率上调，不是固定 $10
- **reasoning.effort 五档**：low / medium / high / xhigh / max，网关默认 low
- **端点**：Chat Completions（不支持工具调用）、Responses（工具调用必须用这个）、Batch
- **不支持**：Realtime、Assistants、微调

## 为什么重要

105 万上下文意味着**整个中型代码库可以一次性塞进去**，不需要分块检索。但 272K 之后涨价，等于在提醒你：**长上下文不是免费的**，超长输入的成本会跳档。

更要紧的是 API 分裂——工具调用只能走 Responses，这意味着**所有老的 Chat Completions 代码要迁移**，这是个实打实的迁移成本。

## 评价

**优点**：上下文长度和输出长度的组合目前最实用；缓存输入 $1 让重复系统提示几乎免费；五档 effort 可以按任务难度省钱。

**问题**：输出 $50/M 是硬伤，长输出任务成本会失控；272K 后跳档定价不够透明，容易踩坑；无 Realtime 意味着语音场景要换别家。

**本喵的看法**：这是"给能驾驭它的人用"的模型，不是通用默认选项。日常开发用 effort=low 就够了，只有真正的架构级推理才值得开 max。

## 容易搞错的地方

- 误解"上下文 105 万就能随便塞"→ **超过 272K 输入就进长上下文档位，费率上调**
- 误解"Chat Completions 能用"→ **能用，但工具调用不行，必须切 Responses API**
- 误解"effort 越高越好"→ 网关默认 low，多数任务 low 的效果和成本比最优

## 相关条目

- `M-002` Claude Opus 5.5 与 Anthropic 模型矩阵
- `M-003` 模型排行榜口径差异（BenchLM vs LMArena）
