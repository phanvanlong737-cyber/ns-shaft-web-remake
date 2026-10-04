export const SAVE_KEY = 'ns-shaft-remake-save';
export const defaultSettings = Object.freeze({
  masterVolume: 0.65, musicVolume: 0.25, sfxVolume: 0.65,
  mute: false, shake: true, reducedMotion: false,
});

const validFloor = value => Number.isSafeInteger(value) && value >= 0;
export function normalizeNickname(value) {
  return Array.from(String(value ?? '').trim()).slice(0, 16).join('') || '玩家';
}

function validate(raw) {
  const result = { schemaVersion: 1, settings: { ...defaultSettings }, bestFloor: 0,
    nickname: '玩家', leaderboard: [] };
  if (!raw || raw.schemaVersion !== 1) return result;
  for (const [key, fallback] of Object.entries(defaultSettings)) {
    const value = raw.settings?.[key];
    if (typeof fallback === 'boolean' && typeof value === 'boolean') result.settings[key] = value;
    if (typeof fallback === 'number' && Number.isFinite(value)) {
      result.settings[key] = Math.min(1, Math.max(0, value));
    }
  }
  result.bestFloor = validFloor(raw.bestFloor) ? raw.bestFloor : 0;
  result.nickname = normalizeNickname(raw.nickname);
  const seen = new Set();
  if (Array.isArray(raw.leaderboard)) {
    result.leaderboard = raw.leaderboard.filter(entry => {
      if (!entry || typeof entry.id !== 'string' || seen.has(entry.id) ||
          !validFloor(entry.floor) || !Number.isFinite(entry.timestamp) || entry.timestamp < 0 ||
          !Number.isFinite(entry.runTime) || entry.runTime < 0) return false;
      seen.add(entry.id);
      return true;
    }).map(entry => ({ id: entry.id, floor: entry.floor, timestamp: entry.timestamp,
      runTime: entry.runTime, nickname: normalizeNickname(entry.nickname) }))
      .sort((a, b) => b.floor - a.floor || a.timestamp - b.timestamp).slice(0, 10);
  }
  result.bestFloor = Math.max(result.bestFloor, ...result.leaderboard.map(entry => entry.floor));
  return result;
}

export class SaveStore {
  constructor(storage) {
    this.storage = storage;
    this.available = Boolean(storage);
    this.registered = new Set();
    try { this.data = validate(JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null')); }
    catch { this.data = validate(null); this.available = Boolean(storage); }
  }

  persist() {
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      this.available = true;
    } catch { this.available = false; }
    return this.available;
  }

  updateSettings(settings) {
    this.data = validate({ ...this.data, settings: { ...this.data.settings, ...settings } });
    this.persist();
  }

  rememberBest(floor) {
    this.data.bestFloor = Math.max(this.data.bestFloor, floor);
    this.persist();
  }

  register({ id, floor, runTime, nickname, timestamp }) {
    if (this.registered.has(id) || this.data.leaderboard.some(entry => entry.id === id)) return false;
    if (!validFloor(floor) || !Number.isFinite(runTime) || runTime < 0 || !Number.isFinite(timestamp)) return false;
    this.registered.add(id);
    const name = normalizeNickname(nickname);
    this.data = validate({ ...this.data, nickname: name,
      bestFloor: Math.max(this.data.bestFloor, floor),
      leaderboard: [...this.data.leaderboard, { id, floor, runTime, nickname: name, timestamp }] });
    this.persist();
    return true;
  }
}
