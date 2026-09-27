import { sfx } from './sound.js';
import { setBest } from './storage.js';
import { h, formatTime, starsRow, confetti } from './util.js';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const GAP = 10;

const defaultIsComplete = (q, inp) => inp.value !== '';
const defaultCheck = (q, inp) => Number(inp.value) === q.answer;
const defaultAnswerText = (q) => String(q.answer);

function calcStars(correct, total, seconds, pace) {
  const acc = correct / total;
  const perQuestion = seconds / total;
  if (acc === 1 && perQuestion <= pace.fast) return 3;
  if (acc === 1 || (acc >= 0.8 && perQuestion <= pace.slow)) return 2;
  return 1;
}

const RESULT_TEXT = {
  3: { mascot: '🏆', title: '太棒了！', sub: '又快又准，你是数学小天才！' },
  2: { mascot: '🎉', title: '真不错！', sub: '继续加油，下次拿三颗星！' },
  1: { mascot: '💪', title: '完成啦！', sub: '多练习几次，会越来越棒哦！' },
};

export function startGame(game, settings, { onBack, onHome }) {
  const isComplete = game.isComplete || defaultIsComplete;
  const check = game.check || defaultCheck;
  const answerText = game.answerText || defaultAnswerText;
  const maxLen = game.maxLen || 3;

  let questions = [];
  let inputs = [];
  let results = [];
  let active = 0;
  let page = 0;
  let perPage = 1;
  let submitted = false;
  let startAt = 0;
  let elapsed = 0;
  let timerId = 0;
  let toastTimer = 0;
  let lastResult = null;

  const el = h(`
    <div class="screen game theme-${game.id}" style="--c1:${game.colors[0]};--c2:${game.colors[1]}">
      <header class="topbar">
        <button class="icon-btn back" aria-label="返回">‹</button>
        <h2 class="title"><span class="title-emoji">${game.emoji}</span>${game.playTitle(settings)}</h2>
        <div class="timer" aria-label="用时">⏱ <span>0:00</span></div>
        <button class="icon-btn refresh" aria-label="换一套题">🔄</button>
      </header>
      <div class="game-body">
        <section class="board">
          <div class="progress"><div class="progress-track"><div class="progress-bar"></div></div><span class="progress-text"></span></div>
          <div class="cards"></div>
          <nav class="pager">
            <button class="pg prev" aria-label="上一页">‹ 上一页</button>
            <div class="dots"></div>
            <button class="pg next" aria-label="下一页">下一页 ›</button>
          </nav>
        </section>
        <aside class="pad">
          <div class="wheel">
            ${DIGITS.map((d, i) => `<button class="digit" data-digit="${d}" style="--i:${i}">${d}</button>`).join('')}
            <button class="wheel-center" aria-label="删除">⌫</button>
          </div>
          <div class="pad-actions">
            <button class="btn next-q">下一题 ➜</button>
            <button class="btn primary submit">提交 ✓</button>
          </div>
        </aside>
      </div>
      <div class="toast" role="status"></div>
    </div>`);

  const $ = (sel) => el.querySelector(sel);
  const cardsEl = $('.cards');
  const dotsEl = $('.dots');
  const timerText = $('.timer span');
  const submitBtn = $('.submit');
  const nextBtn = $('.next-q');

  function startTimer() {
    clearInterval(timerId);
    startAt = Date.now();
    elapsed = 0;
    timerText.textContent = '0:00';
    timerId = setInterval(() => {
      elapsed = (Date.now() - startAt) / 1000;
      timerText.textContent = formatTime(elapsed);
    }, 500);
  }

  function stopTimer() {
    clearInterval(timerId);
    elapsed = (Date.now() - startAt) / 1000;
    timerText.textContent = formatTime(elapsed);
  }

  function newRound() {
    questions = game.generate(settings);
    inputs = questions.map(() => ({ value: '', choice: null }));
    results = [];
    active = 0;
    page = 0;
    submitted = false;
    lastResult = null;
    el.classList.remove('submitted');
    $('.overlay')?.remove();
    startTimer();
    layout(true);
    updateProgress();
    updateActions();
  }

  function layout(force = false) {
    const W = cardsEl.clientWidth;
    const H = cardsEl.clientHeight;
    if (!W || !H || !questions.length) return;
    const { minW, h: minH, maxCols = 4, emW, fsRatio, maxFs = 44, grow = 2 } = game.card;
    const n = questions.length;
    const rows = Math.max(1, Math.floor((H + GAP) / (minH + GAP)));
    const colLimit = Math.max(1, Math.min(maxCols, n, Math.floor((W + GAP) / (minW + GAP))));
    // Prefer the fewest pages, then the biggest text.
    let best = null;
    for (let c = 1; c <= colLimit; c++) {
      const p = Math.min(n, c * rows);
      const pages = Math.ceil(n / p);
      const used = Math.ceil(p / c);
      const rh = Math.max(minH * 0.8, Math.min(minH * grow, (H - GAP * (used - 1)) / used));
      const w = (W - GAP * (c - 1)) / c;
      const f = Math.min(rh * fsRatio, (w - 34) / emW, maxFs);
      if (!best || pages < best.pages || (pages === best.pages && f > best.fs + 0.5)) {
        best = { cols: c, per: p, pages, rowH: rh, fs: f };
      }
    }
    const { cols, per, rowH, fs } = best;

    cardsEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    cardsEl.style.gridAutoRows = `${Math.floor(rowH)}px`;
    cardsEl.style.setProperty('--fs', `${fs.toFixed(1)}px`);
    cardsEl.style.setProperty('--ch', `${Math.floor(rowH)}px`);

    if (force || per !== perPage) {
      perPage = per;
      page = Math.floor(active / perPage);
      renderPage();
    }
  }

  function pageCount() {
    return Math.ceil(questions.length / perPage);
  }

  function renderPage() {
    const start = page * perPage;
    const end = Math.min(questions.length, start + perPage);
    let html = '';
    for (let i = start; i < end; i++) {
      html += `<div class="card" data-q="${i}">
        <span class="qno">${i + 1}</span>
        <div class="card-main">${game.cardHTML(questions[i], i)}</div>
        <div class="feedback"></div>
      </div>`;
    }
    cardsEl.innerHTML = html;
    for (let i = start; i < end; i++) updateCard(i);
    renderPager();
  }

  function renderPager() {
    const total = pageCount();
    el.querySelector('.pager').classList.toggle('single', total <= 1);
    $('.prev').disabled = page <= 0;
    $('.next').disabled = page >= total - 1;
    if (total > 7) {
      dotsEl.innerHTML = `<span class="page-num">${page + 1} / ${total}</span>`;
      return;
    }
    let dots = '';
    for (let p = 0; p < total; p++) {
      const s = p * perPage;
      const e = Math.min(questions.length, s + perPage);
      let done = true;
      for (let i = s; i < e; i++) if (!isComplete(questions[i], inputs[i])) done = false;
      dots += `<button class="dot ${p === page ? 'current' : ''} ${done ? 'done' : ''}" data-page="${p}" aria-label="第${p + 1}页"></button>`;
    }
    dotsEl.innerHTML = dots;
  }

  function cardEl(i) {
    return cardsEl.querySelector(`[data-q="${i}"]`);
  }

  function updateCard(i) {
    const c = cardEl(i);
    if (!c) return;
    const inp = inputs[i];
    c.classList.toggle('active', i === active && !submitted);
    c.classList.toggle('filled', isComplete(questions[i], inp));
    const ans = c.querySelector('[data-ans]');
    if (ans) ans.textContent = inp.value;
    c.querySelectorAll('[data-choice]').forEach((b) => {
      b.classList.toggle('selected', b.dataset.choice === inp.choice);
    });
    const fb = c.querySelector('.feedback');
    if (submitted) {
      const ok = results[i];
      c.classList.toggle('right', ok);
      c.classList.toggle('wrong', !ok);
      const extra = game.explain ? game.explain(questions[i]) : '';
      fb.innerHTML = ok
        ? `<b>✓</b> ${extra}`
        : `<b>✗</b> 正确：${answerText(questions[i])}${extra ? `　${extra}` : ''}`;
    } else {
      c.classList.remove('right', 'wrong');
      fb.innerHTML = '';
    }
  }

  function updateProgress() {
    const done = questions.reduce((n, q, i) => n + (isComplete(q, inputs[i]) ? 1 : 0), 0);
    $('.progress-bar').style.width = `${(done / questions.length) * 100}%`;
    $('.progress-text').textContent = submitted
      ? `答对 ${results.filter(Boolean).length} / ${questions.length}`
      : `已完成 ${done} / ${questions.length}`;
    submitBtn.classList.toggle('ready', !submitted && done === questions.length);
  }

  function updateActions() {
    if (submitted) {
      nextBtn.textContent = '⭐ 成绩';
      submitBtn.textContent = '再来一次 🔁';
    } else {
      nextBtn.textContent = '下一题 ➜';
      submitBtn.textContent = '提交 ✓';
    }
  }

  function goPage(p, sound = true) {
    const total = pageCount();
    const np = Math.max(0, Math.min(total - 1, p));
    if (np === page) return;
    page = np;
    if (!submitted) {
      const start = page * perPage;
      const end = Math.min(questions.length, start + perPage);
      let target = start;
      for (let i = start; i < end; i++) {
        if (!isComplete(questions[i], inputs[i])) { target = i; break; }
      }
      active = target;
    }
    if (sound) sfx.page();
    renderPage();
  }

  function setActive(i) {
    if (i === active) return;
    const prev = active;
    active = i;
    const p = Math.floor(i / perPage);
    if (p !== page) {
      page = p;
      renderPage();
    } else {
      updateCard(prev);
      updateCard(i);
    }
  }

  function shake(i) {
    const c = cardEl(i);
    if (!c) return;
    c.classList.remove('shake');
    void c.offsetWidth;
    c.classList.add('shake');
  }

  function toast(msg) {
    const t = $('.toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
  }

  function afterInput() {
    updateCard(active);
    updateProgress();
    renderPager();
  }

  function inputDigit(d) {
    if (submitted) return;
    const inp = inputs[active];
    if (inp.value === '0') inp.value = '';
    if (inp.value.length >= maxLen) {
      sfx.nope();
      shake(active);
      return;
    }
    inp.value += String(d);
    sfx.tap();
    afterInput();
  }

  function erase() {
    if (submitted) return;
    const inp = inputs[active];
    if (!inp.value) {
      sfx.nope();
      return;
    }
    inp.value = inp.value.slice(0, -1);
    sfx.erase();
    afterInput();
  }

  function nextQuestion() {
    if (submitted) {
      if (lastResult) showResult(lastResult);
      return;
    }
    const n = questions.length;
    for (let k = 1; k <= n; k++) {
      const j = (active + k) % n;
      if (!isComplete(questions[j], inputs[j])) {
        sfx.select();
        setActive(j);
        return;
      }
    }
    sfx.select();
    toast('全部做完啦，点「提交」吧！');
    submitBtn.classList.remove('pulse');
    void submitBtn.offsetWidth;
    submitBtn.classList.add('pulse');
  }

  function submit() {
    if (submitted) {
      newRound();
      return;
    }
    const missing = questions
      .map((q, i) => (isComplete(q, inputs[i]) ? -1 : i))
      .filter((i) => i >= 0);
    if (missing.length) {
      sfx.nope();
      toast(`还有 ${missing.length} 题没做完哦～`);
      setActive(missing[0]);
      shake(missing[0]);
      return;
    }
    submitted = true;
    stopTimer();
    results = questions.map((q, i) => check(q, inputs[i]));
    const correct = results.filter(Boolean).length;
    const stars = calcStars(correct, questions.length, elapsed, game.pace);
    setBest(game.id, stars);
    el.classList.add('submitted');
    page = 0;
    renderPage();
    updateProgress();
    updateActions();
    lastResult = { correct, total: questions.length, stars, time: elapsed };
    showResult(lastResult, true);
  }

  function showResult({ correct, total, stars, time }, celebrate = false) {
    $('.overlay')?.remove();
    const txt = RESULT_TEXT[stars];
    let tip = '';
    if (stars < 3) {
      tip = correct < total ? '小提示：全部答对才能拿到三颗星哦！' : '小提示：再快一点就能拿到三颗星啦！';
    }
    const ov = h(`
      <div class="overlay">
        <div class="result-card stars-${stars}">
          <div class="mascot">${txt.mascot}</div>
          <div class="result-stars">${starsRow(0, 3, 'big')}</div>
          <h2>${txt.title}</h2>
          <p class="sub">${txt.sub}</p>
          <div class="stats">
            <div><b>${correct}/${total}</b><span>答对</span></div>
            <div><b>${formatTime(time)}</b><span>用时</span></div>
          </div>
          ${tip ? `<p class="tip">${tip}</p>` : ''}
          <div class="result-actions">
            <button class="btn review">查看答案</button>
            <button class="btn primary again">再来一次</button>
            <button class="btn go-home">回首页</button>
          </div>
        </div>
      </div>`);
    el.appendChild(ov);
    const starEls = ov.querySelectorAll('.result-stars .star');
    const lightStar = (i) => {
      starEls[i].classList.add('on', 'pop');
      sfx.star(i);
    };
    if (celebrate) {
      sfx.fanfare(stars);
      confetti(el, stars === 3 ? 90 : stars === 2 ? 60 : 30);
      for (let i = 0; i < stars; i++) setTimeout(() => lightStar(i), 650 + i * 420);
    } else {
      for (let i = 0; i < stars; i++) starEls[i].classList.add('on');
    }
    ov.addEventListener('click', (e) => {
      if (e.target.closest('.review') || e.target === ov) {
        sfx.select();
        ov.remove();
      } else if (e.target.closest('.again')) {
        sfx.select();
        newRound();
      } else if (e.target.closest('.go-home')) {
        onHome();
      }
    });
  }

  function refresh() {
    const hasProgress = !submitted && inputs.some((inp) => inp.value !== '' || inp.choice);
    if (hasProgress && !window.confirm('要换一套新题目吗？已填的答案会清空哦。')) return;
    sfx.page();
    newRound();
    toast('换了一套新题目！');
  }

  el.addEventListener('click', (e) => {
    const t = e.target;
    const digit = t.closest('[data-digit]');
    if (digit) {
      digit.classList.remove('pop');
      void digit.offsetWidth;
      digit.classList.add('pop');
      inputDigit(Number(digit.dataset.digit));
      return;
    }
    if (t.closest('.wheel-center')) return erase();
    if (t.closest('.back')) return onBack();
    if (t.closest('.refresh')) return refresh();
    if (t.closest('.next-q')) return nextQuestion();
    if (t.closest('.submit')) return submit();
    if (t.closest('.prev')) return goPage(page - 1);
    if (t.closest('.next')) return goPage(page + 1);
    const dot = t.closest('[data-page]');
    if (dot) return goPage(Number(dot.dataset.page));
    const card = t.closest('[data-q]');
    if (card && !submitted) {
      const i = Number(card.dataset.q);
      const choice = t.closest('[data-choice]');
      if (choice) {
        inputs[i].choice = choice.dataset.choice;
        sfx.tap();
        setActive(i);
        afterInput();
        updateCard(i);
      } else if (i !== active) {
        sfx.select();
        setActive(i);
      }
    }
  });

  let swipe = null;
  cardsEl.addEventListener('pointerdown', (e) => {
    swipe = { x: e.clientX, y: e.clientY, t: Date.now() };
  });
  cardsEl.addEventListener('pointerup', (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50 && Date.now() - swipe.t < 700) {
      goPage(page + (dx < 0 ? 1 : -1));
    }
    swipe = null;
  });

  function onKey(e) {
    if (e.key >= '0' && e.key <= '9') inputDigit(Number(e.key));
    else if (e.key === 'Backspace') erase();
    else if (e.key === 'Enter') nextQuestion();
    else if (e.key === 'ArrowRight') goPage(page + 1);
    else if (e.key === 'ArrowLeft') goPage(page - 1);
    else return;
    e.preventDefault();
  }
  document.addEventListener('keydown', onKey);

  let raf = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => layout());
  });
  ro.observe(cardsEl);

  return {
    el,
    start() {
      newRound();
    },
    destroy() {
      clearInterval(timerId);
      clearTimeout(toastTimer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('keydown', onKey);
    },
  };
}
