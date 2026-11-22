---
seq: S-001
title: 小米玄戒 O3 — 首个破 500 万分的旗舰 SoC，GPU 摸到 M5 屁股
date: 2026-10-31
datePrecision: month
category: hardware-soc
tags: [小米, 玄戒O3, XRingO3, 自研SoC, 安兔兔, G2-UltraNX, 3DMark, GTX1060]
status: current
sourceType: mixed
evidence: multi-source
verifiedBy: both
summary: 3nm 240亿晶体管，十核全大核；安兔兔 522 万分首破 500 万；3DMark 峰值超 4700 分，GPU 逼近苹果 M5、摸到 GTX 1060 6G 门槛
source:
  - "IT之家 — https://m.ithome.com/html/0993519.htm"
  - "快科技 — https://m.mydrivers.com/newsview/1146177.html"
  - "Notebookcheck — https://www.notebookcheck.net/Over-1-000-FPS-Xiaomi-s-new-high-end-chip-becomes-a-nightmare-for-Google.1434076.0.html"
---

# 小米玄戒 O3（XRing O3）

> **一句话结论**：安兔兔 **522 万分**首破 500 万；更狠的是 GPU——**3DMark 峰值超 4700 分，逼近苹果 M5，摸到了桌面独显 GTX 1060 6G 的门槛**。

## 时间线

| 日期 | 事件 |
|---|---|
| 2026-10 | 小米玄戒芯片技术沟通会，玄戒 O3 正式发布 |
| 2026-10 | 极客湾上手实测，称"外星科技""击败市面上旗舰没问题" |
| 2026-11-01 | Notebookcheck 评测：小米平板 9 Pro Max 搭载 XRing O3，**GFXBench 创纪录** |
| 同期 | 小米平板 9 Pro Max 登顶安卓平板性能榜，**断层领先** |
| 同期 | 跑分破 **1,000 FPS**，被外媒称"Google 的噩梦" |

## 关键事实

**基础规格**
- 工艺/规模：**3nm，240 亿晶体管**
- CPU：**十核全大核**设计，性能提升 **60%**
- GPU：**16 核**，首发 **G2-Ultra NX**（Mali G2-Ultra NX MP16），性能提升 **85%**
- 安兔兔：**522 万分**，首个破 500 万的旗舰 SoC
- 研发周期：459 天

**GPU 实测（重点，来自极客湾 + Notebookcheck）**
- **3DMark 峰值跑分：超过 4700 分**
- **性能逼近苹果 M5**，**摸到台式机经典独显 GTX 1060 6GB 的性能门槛**
- **3DMark Wild Life Unlimited：超过 30,000 分**（把对手远远甩开）
- **GFXBench 4K 测试：85 FPS**——比 Google Tensor G5 **领先 70%+**，比 iPad Pro 11 **领先 40%+**
- 对 M5 的领先幅度：**3DMark 上优势较小，GFXBench 4K 上优势明显**

**CPU 实测**
- Geekbench 6.7 多核：Xiaomi Pad 9 Pro Max **12,976 分**
  - 对比 iPad Pro 11 2025（M5）：16,544 分（高 27%）
  - 对比 iPad Air 13 M4 2026：13,987 分（高 8%）
  - 对比 Pixel 10 Pro（Tensor G5）：**领先 50% 以上**
- Geekbench 6.7 单核：**3,522 分**（iPad Pro 11 为 4,128，高 17%）

**能效**
- CPU/GPU 能效曲线**全面碾压骁龙 8E5 与天玑 9500**
- 中低频区间能效**完全不输苹果 A19 Pro**

## 为什么重要

**"手机/平板 SoC GPU 摸到桌面独显门槛"这件事，是 2026 年最实在的性能跃迁。**

GTX 1060 6GB 是 2016 年的中端桌面卡，但它是**公认的"1080P 通吃"基准线**——能摸到它，意味着移动设备的图形能力跨过了一个心理门槛。

更值得注意的是**分项差异**：
- **3DMark 上对 M5 领先很小** → 说明峰值性能接近但没碾压
- **GFXBench 4K 上领先 40%+** → 说明在高分辨率持续渲染上优势明显

这个分离说明：XRing O3 的强项在**高负载持续图形**，而不是短时峰值。这恰好是游戏场景最需要的。

另外，**自研 GPU IP（G2-Ultra NX）不是 Mali 或 Imagination**——这意味着驱动和编译器都得自己做。长期是真护城河，短期是巨大的适配负担。

## 评价

**优点**：GPU 是真突破，不是跑分技巧——GFXBench 4K 85FPS 是实打实的高分辨率持续渲染能力。能效曲线上中低频不输 A19 Pro，说明架构效率做得很好，不只是靠堆料。

**问题**：**CPU 单核仍落后 M5 约 17%**，多核落后 27%——GPU 追上了，CPU 没追上。另外这些成绩来自**平板（Pad 9 Pro Max）**，散热空间远大于手机；装进手机后能否维持同样表现，是另一个问题。自研 GPU 的**游戏适配成熟度**（驱动、兼容性列表）仍需时间验证。

**本喵的看法**：这条最该记住的不是"522 万分"，而是 **GFXBench 4K 85FPS 对 M5 领先 40%**。安兔兔是综合分，容易被单项拉高；GFXBench 4K 是纯图形高压测试，含金量高得多。

但要清醒：**跑分逼近 M5 ≠ 体验逼近 M5**。M5 跑的是 macOS/iPadOS 的成熟图形栈，XRing O3 跑的是 Android，生态和驱动成熟度完全不在一个量级。参数上摸到屁股是事实，体验上还差着一段路。

## 容易搞错的地方

- ❌ 误解"玄戒 O3 GPU 超越 M5" → ✅ **3DMark 上领先很小，GFXBench 4K 领先约 40%**，整体是"逼近"不是"碾压"
- ❌ 误解"摸到 GTX 1060 门槛 = 打得过 GTX 1060" → ✅ 是**接近其性能区间**，不是全面超越
- ❌ 误解"十核全大核 = 十个超大核" → ✅ 是**全大核**（没有小核），但不是十个超大核
- ❌ 误解"GPU 16 核是 Arm Mali" → ✅ 是**小米自研 G2-Ultra NX**（Mali G2-Ultra NX MP16 是命名体系，但为小米定制）
- ❌ 误解"手机也能跑到这个成绩" → ✅ 测试机是**小米平板 9 Pro Max**，散热空间远大于手机
- ❌ 误解"安兔兔 522 万 = 全面最强" → ✅ **CPU 单核仍落后 M5 约 17%**，安兔兔综合分掩盖了分项差距

## 相关条目

- `S-002` 骁龙 8 Elite Extreme Gen 6（同代竞品，被评"挤牙膏"）
- `S-003` 骁龙 8 Elite Gen 5 与天玑 9500
- `S-005` 苹果 A20 Pro（GPU 能效对比）
- `PH-001` 小米 18 系列
