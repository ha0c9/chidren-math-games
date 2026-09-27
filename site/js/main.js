import { sfx, unlockAudio, isSoundOn, setSound } from './sound.js';
import { startGame } from './engine.js';
import { getBest, loadSettings, saveSettings } from './storage.js';
import { h, starsRow } from './util.js';
import multiplication from './games/multiplication.js';
import lines from './games/lines.js';
import arithmetic from './games/arithmetic.js';

const GAMES = [multiplication, lines, arithmetic];
const BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));
const app = document.getElementById('app');
let teardown = null;

function setAppHeight() {
  document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`);
}
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 250));

['pointerdown', 'touchend', 'keydown'].forEach((ev) =>
  document.addEventListener(ev, unlockAudio, { passive: true }));
document.addEventListener('touchstart', () => {}, { passive: true });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

function mount(el) {
  if (teardown) teardown();
  teardown = null;
  app.replaceChildren(el);
  window.scrollTo(0, 0);
}

function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function currentSettings(game) {
  const saved = loadSettings(game.id);
  const s = { ...game.defaults };
  for (const opt of game.options) {
    if (opt.choices.some((c) => c.value === saved[opt.key])) s[opt.key] = saved[opt.key];
  }
  return s;
}

function soundIcon() {
  return isSoundOn() ? '🔊' : '🔇';
}

function renderHome() {
  const title = '趣味数学乐园'.split('').map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');
  const el = h(`
    <div class="screen home">
      <div class="bg-deco" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <header class="home-head">
        <button class="icon-btn sound-toggle" aria-label="声音开关">${soundIcon()}</button>
        <div class="logo" aria-hidden="true">🦉</div>
        <h1 class="rainbow">${title}</h1>
        <p class="tagline">选一个游戏，开始今天的数学冒险吧！</p>
      </header>
      <main class="game-list">
        ${GAMES.map((g) => `
          <button class="game-tile" data-id="${g.id}" style="--c1:${g.colors[0]};--c2:${g.colors[1]}">
            <span class="tile-emoji">${g.emoji}</span>
            <span class="tile-text">
              <span class="tile-title">${g.title}</span>
              <span class="tile-desc">${g.desc}</span>
            </span>
            <span class="tile-best"><span class="tile-best-label">最好成绩</span><span class="tile-stars">${starsRow(getBest(g.id), 3, 'small')}</span></span>
            <span class="tile-go" aria-hidden="true">▶</span>
          </button>`).join('')}
      </main>
      <footer class="home-foot">做完一套题就能拿星星 ⭐ 又快又准拿三颗！</footer>
    </div>`);
  el.addEventListener('click', (e) => {
    const tile = e.target.closest('.game-tile');
    if (tile) {
      sfx.select();
      go(`#/${tile.dataset.id}`);
      return;
    }
    const toggle = e.target.closest('.sound-toggle');
    if (toggle) {
      setSound(!isSoundOn());
      toggle.textContent = soundIcon();
      sfx.select();
    }
  });
  mount(el);
}

function renderSetup(game) {
  const s = currentSettings(game);
  const el = h(`
    <div class="screen setup" style="--c1:${game.colors[0]};--c2:${game.colors[1]}">
      <header class="topbar">
        <button class="icon-btn back" aria-label="返回首页">‹</button>
        <h2 class="title"><span class="title-emoji">${game.emoji}</span>${game.title}</h2>
        <button class="icon-btn sound-toggle" aria-label="声音开关">${soundIcon()}</button>
      </header>
      <main class="setup-body">
        <p class="setup-intro">${game.intro}</p>
        ${game.options.map((opt) => `
          <section class="opt-group ${opt.big ? 'big' : ''}">
            <h3>${opt.label}</h3>
            <div class="chips">
              ${opt.choices.map((c) => `
                <button class="chip" data-key="${opt.key}" data-value="${c.value}" aria-pressed="${c.value === s[opt.key]}">
                  <span class="chip-label">${c.label}</span>${c.hint ? `<span class="chip-hint">${c.hint}</span>` : ''}
                </button>`).join('')}
            </div>
          </section>`).join('')}
        <button class="start-btn">开始游戏 ▶</button>
      </main>
    </div>`);
  el.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
      const opt = game.options.find((o) => o.key === chip.dataset.key);
      const choice = opt.choices.find((c) => String(c.value) === chip.dataset.value);
      s[opt.key] = choice.value;
      el.querySelectorAll(`.chip[data-key="${opt.key}"]`).forEach((b) => {
        b.setAttribute('aria-pressed', String(b === chip));
      });
      sfx.tap();
      return;
    }
    if (e.target.closest('.start-btn')) {
      sfx.select();
      saveSettings(game.id, s);
      go(`#/${game.id}/play`);
      return;
    }
    if (e.target.closest('.back')) {
      go('#/');
      return;
    }
    const toggle = e.target.closest('.sound-toggle');
    if (toggle) {
      setSound(!isSoundOn());
      toggle.textContent = soundIcon();
      sfx.select();
    }
  });
  mount(el);
}

function renderPlay(game) {
  const g = startGame(game, currentSettings(game), {
    onBack: () => go(`#/${game.id}`),
    onHome: () => go('#/'),
  });
  mount(g.el);
  teardown = g.destroy;
  g.start();
}

function route() {
  const [id, sub] = location.hash.replace(/^#\/?/, '').split('/');
  const game = BY_ID[id];
  if (!game) renderHome();
  else if (sub === 'play') renderPlay(game);
  else renderSetup(game);
}

window.addEventListener('hashchange', route);
route();
