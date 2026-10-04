import { expect, test } from 'vitest';
import { SaveStore, SAVE_KEY, normalizeNickname } from '../src/data/save.js';

function memory(value = null) { return { value, getItem() { return this.value; }, setItem(key, value) { this.value = value; } }; }
test('new/corrupt/unknown saves fall back safely', () => {
  for (const raw of [null, '{broken', '{"schemaVersion":99}', '[]']) {
    const store = new SaveStore(memory(raw));
    expect(store.data.bestFloor).toBe(0); expect(store.data.leaderboard).toEqual([]);
  }
});
test('sanitizes settings and only accepts valid entries', () => {
  const store = new SaveStore(memory(JSON.stringify({ schemaVersion: 1,
    bestFloor: -1, settings: { musicVolume: 20, mute: 'false' }, leaderboard: [
      { id: 'a', floor: 7, timestamp: 1, runTime: 10, nickname: ' Jane ' },
      { id: 'b', floor: -5, timestamp: 2, runTime: 0 },
      { id: 'a', floor: 99, timestamp: 3, runTime: 1 },
    ] })));
  expect(store.data.settings.musicVolume).toBe(1);
  expect(store.data.settings.mute).toBe(false);
  expect(store.data.leaderboard).toHaveLength(1); expect(store.data.bestFloor).toBe(7);
});
test('scores sort by floor then timestamp, truncate to ten, and register once', () => {
  const storage = memory(), store = new SaveStore(storage);
  for (let i = 0; i < 14; i++) store.register({ id: String(i), floor: i % 4, runTime: 10, nickname: '', timestamp: i });
  expect(store.data.leaderboard).toHaveLength(10);
  expect(store.data.leaderboard.slice(0, 3).map(row => row.timestamp)).toEqual([3, 7, 11]);
  expect(store.register({ id: '0', floor: 99, runTime: 1, timestamp: 99 })).toBe(false);
  expect(new SaveStore(storage).data).toEqual(store.data);
  expect(JSON.parse(storage.value).schemaVersion).toBe(1);
});
test('unavailable storage preserves memory settings and scores', () => {
  const store = new SaveStore({ getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } });
  store.updateSettings({ mute: true }); store.rememberBest(23);
  expect(store.available).toBe(false); expect(store.data.bestFloor).toBe(23);
  expect(store.data.settings.mute).toBe(true);
  expect(new SaveStore(null).persist()).toBe(false);
});
test('nickname uses sixteen Unicode characters, with safe plain text retained', () => {
  expect(normalizeNickname('  ')).toBe('玩家');
  expect(Array.from(normalizeNickname('😀'.repeat(20)))).toHaveLength(16);
  expect(normalizeNickname('<img src=x>')).toBe('<img src=x>');
});
test('save contains no active game state', () => {
  const storage = memory(), store = new SaveStore(storage); store.rememberBest(5);
  expect(Object.keys(JSON.parse(storage.getItem(SAVE_KEY))).sort()).toEqual(['bestFloor', 'leaderboard', 'nickname', 'schemaVersion', 'settings']);
});
