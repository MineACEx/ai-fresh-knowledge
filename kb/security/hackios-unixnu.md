---
seq: SEC-002
title: HackiOS 与 UniXNU — 在 Android 设备上原生跑 iOS
date: 2026-11-12
category: security
tags: [iOS, Android, HackiOS, UniXNU, XNU, RedmiK90, TrollStore]
status: current
summary: HackiOS 把 XNU 内核+未修改 iOS 用户态移植到 Android 设备，REDMI K90 已真机跑 iOS 26.6.2 并双系统；UniXNU 让多机型跑 iOS 16/17
source: [hackios-redmi-k90-annibale](https://github.com/iola1999/hackios-redmi-k90-annibale) · [hackios-xnu-kernel](https://github.com/oosexgang/hackios-xnu-kernel)
confidence: verified
---

# HackiOS 与 UniXNU

> **一句话结论**：**REDMI K90（SM8750/annibale）真机跑起了未修改的 iOS 26.6.2 + TrollStore**，双系统可切换；UniXNU 则把 iOS 16/17 移植到更多骁龙设备。

## 时间线

| 日期 | 事件 |
|---|---|
| 早期 | UniXNU 在 Redmi K20 Pro（raphael, SM8150）跑 iOS 16.7.16 |
| 2026 | UniXNU 扩展到小米平板 6S Pro 跑 **iPadOS 17** |
| 2026 | REDMI K90 Pro Max 运行 **iOS 17** |
| **2026-11-12** | **hackios-redmi-k90-annibale** 发布：REDMI K90 跑 **iOS 26.6.2** |
| 同期 | 两个项目迭代速度被评"飞快" |

## 关键事实

**hackios-redmi-k90-annibale（REDMI K90）**
- 目标机：**REDMI K90（SM8750，代号 annibale）**
- iOS 版本：**26.6.2（23G90，取自 iPhone 17）**
- 内核：**XNU 12377**（项目自行维护）
- 双系统：开机菜单选择 iOS 或 Android，**无需连电脑**；已装应用与文件跨重启保留

**已完成的功能（README 实测表）**
- 桌面/系统应用：简体中文锁屏、主屏、控制中心、通知中心可用；设置/Safari/电话/短信能打开
- 图形：**Metal 经 Mesa freedreno 在 Adreno 830 上绘制**，画布 1206×2622，**120Hz**
- 亮度/手电筒、触摸、电源键、音量键可用
- 声音：双扬声器出声，AAC 本地播放 + HLS 流媒体可用
- Wi-Fi 可联网并开机自动重连；蓝牙可扫描
- 相机：前后摄预览无条纹，后摄约 **24~29 帧/秒**，但对焦后**镜头常偏离焦点**，照片发暗偏色
- 视频：**H.264 硬解** 720p/1080p 通过，HLS 播放通过
- 应用安装：预装 **TrollStore**，支持已解密 .ipa/.tipa

**UniXNU**
- 目标：多款骁龙设备（SM8150 等）
- 已实现：Redmi K20 Pro / Mi 9T Pro 跑 iOS 16.7.16；小米平板 6S Pro 跑 iPadOS 17

## 为什么重要

**"Android 跑 iOS" 这件事从概念验证走到了日常可用。**

关键突破在三点：
1. **未修改的 iOS 用户态**——不是魔改的 iOS，是原版
2. **Metal 通过 Mesa freedreno 在 Adreno GPU 上绘制**——这是最难的一环，把苹果的图形栈嫁接在高通 GPU 上
3. **双系统 + 数据持久化**——不是一次性演示

对搞系统移植的人来说，这是一个**完整的技术路线参考**：XNU 内核 + 未修改用户态 + 图形栈桥接 + 双系统引导。

## 评价

**优点**：README 极其诚实——把"相机对焦后偏离焦点""照片发暗偏色""天气股票只显示占位"这些缺陷全列出来了。这种工程透明度比吹功能可信得多。H.264 硬解和 HLS 都通了，说明媒体栈移植得不错。

**问题**：**目前只在一台 K90 上验证过**，其他机型需独立移植。相机是明显短板（对焦偏、偏色）。联网类组件（天气、股票）不工作，说明网络栈部分还没打通。项目自称"仍在实验阶段"。

**本喵的看法**：这是 2026 年最硬核的民间移植项目之一。它的价值不在"能跑 iOS"，而在**证明了 XNU 可以被移植到非苹果 SoC 上**，且图形栈有可行桥接方案（Mesa freedreno → Metal）。

README 里那句"目前只在一台 K90 上验证过"很关键——**这说明成功率依赖具体机型的适配工作量**，不是刷个包就行。

## 容易搞错的地方

- ❌ 误解"刷了就能当 iPhone 用" → ✅ **相机、联网组件、部分系统应用仍有明显缺陷**
- ❌ 误解"HackiOS 和 UniXNU 是同一个项目" → ✅ **两个独立项目**，HackiOS 主线是 K90/iOS 26，UniXNU 覆盖更多机型但版本较低
- ❌ 误解"iOS 26.6.2 是模拟的" → ✅ 是**真机原生运行**未修改的 iOS 用户态
- ❌ 误解"用户态被改过" → ✅ 强调是**未修改（unmodified）** 的 iOS 用户态

## 相关条目

- `SEC-001` GhostLock CVE-2026-43499
- `S-003` 骁龙 8 Elite Gen 5（SM8750 同系）
