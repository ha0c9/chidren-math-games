import { randInt } from '../util.js';

// Skew toward the upper part of the range so sets aren't dominated by tiny numbers.
const low = (max) => Math.max(3, Math.ceil(max * 0.3));

function makeAdd(max) {
  const c = randInt(low(max), max);
  const a = randInt(1, c - 1);
  const b = c - a;
  return { a, b, op: '+', answer: c, regroup: (a % 10) + (b % 10) >= 10 };
}

function makeSub(max) {
  const a = randInt(low(max), max);
  const b = randInt(1, a - 1);
  return { a, b, op: '-', answer: a - b, regroup: a % 10 < b % 10 };
}

function makeOne(op, max, carry) {
  const pick = op === 'mix' ? (Math.random() < 0.5 ? '+' : '-') : op;
  const make = pick === '+' ? makeAdd : makeSub;
  let q = make(max);
  for (let t = 0; t < 300; t++) {
    const ok = carry === 'any' || (carry === 'yes' ? q.regroup : !q.regroup);
    if (ok) return q;
    q = make(max);
  }
  return q;
}

export default {
  id: 'calc',
  emoji: '➕',
  title: '加减计算',
  desc: '100 以内加减法，难度自己选',
  intro: '选好题目类型和难度，一套题约 20 道，可以翻页做题。做完点「提交」，右上角 🔄 可以换一套题。',
  colors: ['#22C993', '#1EA7C9'],
  options: [
    {
      key: 'op',
      label: '运算',
      choices: [
        { value: 'add', label: '加法 ➕' },
        { value: 'sub', label: '减法 ➖' },
        { value: 'mix', label: '加减混合' },
      ],
    },
    {
      key: 'max',
      label: '数字范围',
      choices: [
        { value: 10, label: '10 以内' },
        { value: 20, label: '20 以内' },
        { value: 100, label: '100 以内' },
      ],
    },
    {
      key: 'carry',
      label: '进位 / 退位',
      choices: [
        { value: 'no', label: '不进退位' },
        { value: 'yes', label: '要进退位' },
        { value: 'any', label: '都可以' },
      ],
    },
    {
      key: 'count',
      label: '题目数量',
      choices: [
        { value: 10, label: '10 道' },
        { value: 20, label: '20 道' },
        { value: 30, label: '30 道' },
      ],
    },
  ],
  defaults: { op: 'mix', max: 20, carry: 'any', count: 20 },
  playTitle(s) {
    const op = { add: '加法', sub: '减法', mix: '加减法' }[s.op];
    return `${s.max}以内${op}`;
  },
  card: { minW: 155, h: 64, emW: 6.8, fsRatio: 0.42, maxFs: 44 },
  pace: { fast: 7, slow: 14 },
  maxLen: 3,
  generate({ op, max, carry, count }) {
    const opKey = { add: '+', sub: '-', mix: 'mix' }[op];
    const seen = new Set();
    const qs = [];
    let guard = 0;
    while (qs.length < count) {
      const q = makeOne(opKey, max, carry);
      const key = `${q.a}${q.op}${q.b}`;
      if (seen.has(key) && guard++ < 500) continue;
      seen.add(key);
      qs.push(q);
    }
    return qs;
  },
  cardHTML(q) {
    const op = q.op === '+' ? '+' : '−';
    return `<div class="eq"><span>${q.a}</span><span class="op">${op}</span><span>${q.b}</span><span class="op">=</span><span class="ans" data-ans></span></div>`;
  },
};
