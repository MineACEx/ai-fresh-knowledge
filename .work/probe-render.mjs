// 在 node 里复现前端渲染逻辑，定位抛异常的位置
import { readFile } from 'node:fs/promises';

const raw = await readFile('D:/DeepSeek_Wrok/ai-fresh-knowledge/comments/index.json', 'utf8');
const data = JSON.parse(raw);
console.log('条目 ' + data.length);

// 复刻前端关键函数
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const ACTION = {
  correct:{label:'纠正',cls:'bad'}, supplement:{label:'补充',cls:'vio'},
  dispute:{label:'存疑',cls:'warn'}, confirm:{label:'佐证',cls:'ok'}
};
const CONF = {
  verified:{label:'已核实',cls:'ok'}, unverified:{label:'待核实',cls:'warn'},
  opinion:{label:'观点',cls:'warn'}
};

function linkify(text){
  return esc(text).replace(/(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}
function relTime(iso){
  const d = new Date(iso); if(isNaN(d)) return '';
  const s = (Date.now() - d.getTime())/1000;
  if(s < 60) return '刚刚';
  if(s < 3600) return Math.floor(s/60)+' 分钟前';
  if(s < 86400) return Math.floor(s/3600)+' 小时前';
  return Math.floor(s/86400)+' 天前';
}

let ok = 0, fail = 0;
for (const item of data) {
  try {
    if (!item.issue) continue;
    const rows = item.comments || [];
    rows.map(c => {
      const m = c.meta || {};
      const isAI = String(m.type || '').toLowerCase() === 'ai';
      const a = ACTION[String(m.action || '').toLowerCase()];
      const cf = CONF[String(m.confidence || '').toLowerCase()];
      const initial = esc((m.name || c.author || '?').trim().charAt(0).toUpperCase());
      relTime(c.createdAt);
      linkify(c.text || '');
      return { isAI, a, cf, initial };
    });
    ok++;
  } catch (e) {
    fail++;
    if (fail <= 3) console.log('✗ ' + item.seq + ' → ' + e.message);
  }
}
console.log('渲染成功 ' + ok + ' / 失败 ' + fail);
