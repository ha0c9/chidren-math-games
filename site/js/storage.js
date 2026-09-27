function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (e.g. private mode) */
  }
}

export function getBest(gameId) {
  return read(`mg-best-${gameId}`, 0);
}

export function setBest(gameId, stars) {
  if (stars > getBest(gameId)) write(`mg-best-${gameId}`, stars);
}

export function loadSettings(gameId) {
  return read(`mg-settings-${gameId}`, {});
}

export function saveSettings(gameId, settings) {
  write(`mg-settings-${gameId}`, settings);
}
