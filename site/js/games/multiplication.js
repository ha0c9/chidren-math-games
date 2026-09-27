import { shuffle } from '../util.js';

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

function cnNumber(n) {
  if (n < 10) return CN[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return `${CN[t]}十${u ? CN[u] : ''}`;
}

// Traditional 口诀 phrasing, e.g. 3×7 → 三七二十一, 2×3 → 二三得六.
export function koujue(a, b) {
  const [x, y] = a <= b ? [a, b] : [b, a];
  const p = x * y;
  return `${CN[x]}${CN[y]}${p < 10 ? '得' : ''}${cnNumber(p)}`;
}

export default {
  id: 'mul',
  emoji: '🧮',
  title: '乘法口诀',
  desc: '选一个数字，背熟它的口诀',
  intro: '选一个数字，比如选 3，就练习 3×1 到 3×9。用数字圆盘填答案，全部填好后点「提交」。',
  colors: ['#FF8A5B', '#FF5E8A'],
  options: [
    {
      key: 'n',
      label: '选择数字',
      big: true,
      choices: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ value: n, label: String(n), hint: `${n}×1～${n}×9` })),
    },
    {
      key: 'order',
      label: '题目顺序',
      choices: [
        { value: 'seq', label: '按顺序' },
        { value: 'shuffle', label: '打乱顺序' },
      ],
    },
  ],
  defaults: { n: 2, order: 'seq' },
  playTitle: (s) => `${s.n} 的乘法口诀`,
  card: { minW: 150, h: 64, emW: 6, fsRatio: 0.42, maxFs: 46 },
  pace: { fast: 6, slow: 12 },
  maxLen: 2,
  generate({ n, order }) {
    const qs = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((b) => ({ a: n, b, answer: n * b }));
    return order === 'shuffle' ? shuffle(qs) : qs;
  },
  cardHTML(q) {
    return `<div class="eq"><span>${q.a}</span><span class="op">×</span><span>${q.b}</span><span class="op">=</span><span class="ans" data-ans></span></div>`;
  },
  explain: (q) => koujue(q.a, q.b),
};
