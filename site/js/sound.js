const STORAGE_KEY = 'mg-sound';

let ctx = null;
let master = null;
let enabled = readEnabled();

function readEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function isSoundOn() {
  return enabled;
}

export function setSound(on) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable */
  }
}

// iOS only allows audio to start from inside a user gesture, so this is
// called from the first touch/pointer events.
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    // Playing a silent buffer fully unlocks output on older iOS versions.
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(master);
    src.start(0);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, start, dur, { type = 'sine', gain = 0.2, slideTo = null } = {}) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function play(fn) {
  if (!enabled) return;
  unlockAudio();
  if (!ctx) return;
  fn();
}

const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, E6 = 1318.5, G6 = 1568;

export const sfx = {
  tap() {
    play(() => tone(620, 0, 0.09, { type: 'triangle', gain: 0.18, slideTo: 900 }));
  },
  erase() {
    play(() => tone(500, 0, 0.1, { type: 'triangle', gain: 0.14, slideTo: 300 }));
  },
  select() {
    play(() => tone(880, 0, 0.07, { type: 'sine', gain: 0.12 }));
  },
  page() {
    play(() => {
      tone(400, 0, 0.12, { type: 'sine', gain: 0.1, slideTo: 800 });
    });
  },
  nope() {
    play(() => {
      tone(260, 0, 0.14, { type: 'square', gain: 0.05, slideTo: 200 });
      tone(200, 0.13, 0.18, { type: 'square', gain: 0.05, slideTo: 150 });
    });
  },
  star(i) {
    const notes = [[C6, E6], [E6, G6], [G6, 2093]];
    const [a, b] = notes[i] || notes[0];
    play(() => {
      tone(a, 0, 0.18, { type: 'triangle', gain: 0.2 });
      tone(b, 0.08, 0.35, { type: 'triangle', gain: 0.18 });
      tone(b * 2, 0.12, 0.25, { type: 'sine', gain: 0.05 });
    });
  },
  fanfare(stars) {
    play(() => {
      const seq = stars >= 3
        ? [[C5, 0], [E5, 0.12], [G5, 0.24], [C6, 0.36], [G5, 0.52], [C6, 0.64]]
        : stars === 2
          ? [[C5, 0], [E5, 0.13], [G5, 0.26], [C6, 0.42]]
          : [[D5, 0], [E5, 0.14], [A5, 0.3]];
      seq.forEach(([f, t], idx) => {
        const last = idx === seq.length - 1;
        tone(f, t, last ? 0.6 : 0.2, { type: 'triangle', gain: 0.2 });
        tone(f / 2, t, last ? 0.6 : 0.2, { type: 'sine', gain: 0.08 });
      });
    });
  },
};
