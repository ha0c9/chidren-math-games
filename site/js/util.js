export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const STAR_PATH = 'M12 1.8l3.1 6.5 7.1.9-5.2 4.9 1.3 7.1L12 17.8l-6.3 3.4 1.3-7.1L1.8 9.2l7.1-.9z';

export function starSVG(cls = '') {
  return `<svg class="star ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
}

export function starsRow(count, total = 3, cls = '') {
  let out = '';
  for (let i = 0; i < total; i++) out += starSVG(`${cls} ${i < count ? 'on' : ''}`);
  return out;
}

export function confetti(container, pieces = 70) {
  const layer = document.createElement('div');
  layer.className = 'confetti';
  const colors = ['#FF6FA8', '#FFC93C', '#38A3FF', '#2ECC71', '#7C5CFF', '#FF9F43'];
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.6}s`;
    p.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
    p.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty('--spin', `${(Math.random() - 0.5) * 1440}deg`);
    if (i % 3 === 0) p.style.borderRadius = '50%';
    layer.appendChild(p);
  }
  container.appendChild(layer);
  setTimeout(() => layer.remove(), 4500);
}
