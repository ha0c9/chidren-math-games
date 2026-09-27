import { randInt } from '../util.js';

const VB_W = 352;
const VB_H = 150;
const X0 = 70;
const X1 = 318;
const Y1 = 58;
const Y2 = 100;
const BAR_H = 14;

function bar(y, len, unit, cls, showTicks) {
  const w = len * unit;
  let s = `<rect class="bar ${cls}" x="${X0}" y="${y - BAR_H / 2}" width="${w}" height="${BAR_H}" rx="3"/>`;
  if (showTicks) {
    for (let k = 1; k < len; k++) {
      const x = X0 + k * unit;
      s += `<line class="tick" x1="${x}" y1="${y - BAR_H / 2 + 2}" x2="${x}" y2="${y + BAR_H / 2 - 2}"/>`;
    }
  }
  s += `<line class="cap ${cls}" x1="${X0}" y1="${y - 11}" x2="${X0}" y2="${y + 11}"/>`;
  s += `<line class="cap ${cls}" x1="${X0 + w}" y1="${y - 11}" x2="${X0 + w}" y2="${y + 11}"/>`;
  s += `<text class="seg-len ${cls}" x="${X0 + w + 7}" y="${y + 6}">${len}</text>`;
  return s;
}

function bracket(xs, xe, above) {
  const mid = (xs + xe) / 2;
  if (above) {
    const y = Y1 - 22;
    return `<path class="bracket" d="M${xs} ${y + 9} L${xs} ${y} L${xe} ${y} L${xe} ${y + 9} M${mid} ${y} L${mid} ${y - 5}"/>
      <text class="bracket-q" x="${mid}" y="${y - 9}">?</text>`;
  }
  const y = Y2 + 22;
  return `<path class="bracket" d="M${xs} ${y - 9} L${xs} ${y} L${xe} ${y} L${xe} ${y - 9} M${mid} ${y} L${mid} ${y + 5}"/>
    <text class="bracket-q" x="${mid}" y="${y + 21}">?</text>`;
}

function segmentsSVG(q) {
  const unit = (X1 - X0) / q.max;
  const lo = Math.min(q.a, q.b);
  const hi = Math.max(q.a, q.b);
  const xs = X0 + lo * unit;
  const xe = X0 + hi * unit;
  return `<svg class="segments" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid meet" aria-label="线段一长${q.a}，线段二长${q.b}">
    <text class="seg-name one" x="6" y="${Y1 + 6}">线段一</text>
    <text class="seg-name two" x="6" y="${Y2 + 6}">线段二</text>
    <line class="guide" x1="${xs}" y1="${Y1 - 14}" x2="${xs}" y2="${Y2 + 14}"/>
    ${bar(Y1, q.a, unit, 'one', q.ticks)}
    ${bar(Y2, q.b, unit, 'two', q.ticks)}
    ${bracket(xs, xe, q.a > q.b)}
  </svg>`;
}

export default {
  id: 'lines',
  emoji: '📏',
  title: '线段比较',
  desc: '看线段，比长短，算相差多少',
  intro: '比一比两条线段，中括号 [ ] 圈出的就是多出来的部分。先选「长」还是「短」，再用数字圆盘填上相差多少。',
  colors: ['#3EB8FF', '#6C6BFF'],
  options: [
    {
      key: 'max',
      label: '数字范围',
      choices: [
        { value: 10, label: '10 以内' },
        { value: 20, label: '20 以内' },
      ],
    },
    {
      key: 'ticks',
      label: '线段上的小格子',
      choices: [
        { value: 'on', label: '显示格子' },
        { value: 'off', label: '不显示' },
      ],
    },
    {
      key: 'count',
      label: '题目数量',
      choices: [
        { value: 6, label: '6 道' },
        { value: 10, label: '10 道' },
        { value: 12, label: '12 道' },
      ],
    },
  ],
  defaults: { max: 10, ticks: 'on', count: 10 },
  playTitle: (s) => `线段比较·${s.max}以内`,
  card: { minW: 330, h: 200, emW: 14, fsRatio: 0.1, maxFs: 28, grow: 1.6 },
  pace: { fast: 12, slow: 24 },
  maxLen: 2,
  generate({ max, ticks, count }) {
    const seen = new Set();
    const qs = [];
    let guard = 0;
    while (qs.length < count) {
      const a = randInt(1, max);
      const b = randInt(1, max);
      if (a === b) continue;
      const key = `${a}-${b}`;
      if (seen.has(key) && guard++ < 300) continue;
      seen.add(key);
      qs.push({
        a,
        b,
        max,
        ticks: ticks === 'on',
        rel: a > b ? '长' : '短',
        answer: Math.abs(a - b),
      });
    }
    return qs;
  },
  cardHTML(q) {
    return `${segmentsSVG(q)}
      <div class="sentence">
        <span>线段一比线段二</span>
        <span class="choices"><button class="choice" data-choice="长">长</button><button class="choice" data-choice="短">短</button></span>
        <span class="ans" data-ans></span>
      </div>`;
  },
  isComplete: (q, inp) => inp.value !== '' && !!inp.choice,
  check: (q, inp) => inp.choice === q.rel && Number(inp.value) === q.answer,
  answerText: (q) => `${q.rel} ${q.answer}`,
  explain: (q) => `${Math.max(q.a, q.b)} − ${Math.min(q.a, q.b)} = ${q.answer}`,
};
