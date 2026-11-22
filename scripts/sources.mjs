// 抓取源配置：新增来源只改这里
// 每个源需提供 name / url / type，type 目前支持 'rss'
export const SOURCES = [
  {
    name: 'IT之家',
    url: 'https://www.ithome.com/rss/',
    type: 'rss',
    weight: 3,           // 权重越高越优先
    trust: 'verified',   // 该源默认置信度
  },
  {
    name: '少数派',
    url: 'https://sspai.com/feed',
    type: 'rss',
    weight: 2,
    trust: 'verified',
  },
  {
    name: '36氪',
    url: 'https://36kr.com/feed',
    type: 'rss',
    weight: 1,
    trust: 'unverified',
  },
];

// 关键词 → 分类映射（命中即归类，命中多个时取分数最高）
export const RULES = [
  { cat: 'ai-models', re: /GPT|Claude|Gemini|大模型|LLM|OpenAI|Anthropic|DeepSeek|Kimi|GLM|通义|文心|语音模型|视频生成|Seedance|Sora|智能体|Agent|推理模型/i },
  { cat: 'hardware-soc', re: /骁龙|天玑|玄戒|麒麟|SoC|芯片|制程|nm|纳米|苹果\s*M\d|A\d{2}\s*Pro|Intel|AMD|锐龙|酷睿/i },
  { cat: 'hardware-memory', re: /内存|闪存|LPDDR|DDR|NAND|存储颗粒|HBM|UFS|SSD/i },
  { cat: 'hardware-gpu', re: /显卡|GPU|RTX|RX\s*\d|DLSS|FSR|光追|显存|英伟达|NVIDIA|Radeon/i },
  { cat: 'phones', re: /手机|iPhone|小米|红米|REDMI|OPPO|vivo|一加|iQOO|荣耀|华为|折叠屏|续航|电池|mAh|快充|扬声器/i },
  { cat: 'os', re: /系统|OS|iOS|Android|澎湃|HyperOS|ColorOS|OriginOS|MagicOS|鸿蒙|HarmonyOS|更新|版本推送/i },
  { cat: 'games', re: /游戏|Minecraft|Steam|主机|PlayStation|Switch|引擎|虚幻|Unity/i },
  { cat: 'security', re: /漏洞|CVE|ROOT|越狱|破解|提权|安全|勒索|恶意软件|0day/i },
  { cat: 'industry', re: /财报|营收|市值|融资|收购|裁员|上市|政策|GDP|产业链|供应链|涨价|降价/i },
];

// 低价值内容过滤（广告/导购/纯促销）
export const BLACKLIST = [
  /优惠券|领券|京东\s*PLUS|拼多多|百亿补贴/,
  /^【?广告】?/,
  /点击购买|立即抢购|限时秒杀/,
];
