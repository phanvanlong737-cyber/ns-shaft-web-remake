import { Game } from './core/game.js';
import { Platform } from './core/platform.js';
import { FixedLoop } from './core/loop.js';
import { SaveStore } from './data/save.js';
import { Input } from './ui/input.js';
import { View } from './ui/view.js';
import { Renderer } from './rendering/renderer.js';
import { AudioSystem } from './rendering/audio.js';
import './style.css';

const root = document.querySelector('#app');
const view = new View(root);
const game = new Game();
const loop = new FixedLoop(game);
const renderer = new Renderer(view.canvas);
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const store = new SaveStore(storage);
const audio = new AudioSystem(store.data.settings);
let runKey = '';
let previous = performance.now();
let renderedFrames = 0;

function pause() {
  if (game.state !== 'playing') return;
  game.pause(); loop.reset(); input.clear(); audio.stopMusic();
  view.update(game.snapshot(store.data.bestFloor), store.data);
}
function resume() {
  void audio.unlock();
  game.resume(); loop.reset(); input.clear(); previous = performance.now();
  view.update(game.snapshot(store.data.bestFloor), store.data);
}
function togglePause() {
  if (view.dialog.open) return;
  if (game.state === 'playing') pause();
  else if (game.state === 'paused') resume();
}
const input = new Input(togglePause, pause);
input.bindTouch(root.querySelector('#touch-left'), 'left');
input.bindTouch(root.querySelector('#touch-right'), 'right');

function start(seed) {
  void audio.unlock(); audio.stopMusic();
  if (view.dialog.open) view.dialog.close();
  const random = new Uint32Array(1); crypto.getRandomValues(random);
  game.start(seed ?? random[0]);
  runKey = `${Date.now()}-${random[0]}-${game.runId}`;
  loop.reset(); input.clear(); renderer.clear(); view.clearMilestone();
  previous = performance.now();
  view.update(game.snapshot(store.data.bestFloor), store.data);
  root.querySelector('#nickname').blur();
}

root.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  event.preventDefault();
  const action = button.dataset.action;
  void audio.unlock().then(() => audio.playSfx('ui_click'));
  if (action === 'start' || action === 'restart') start();
  else if (action === 'pause') togglePause();
  else if (action === 'resume') resume();
  else if (action === 'menu') {
    game.menu(); input.clear(); loop.reset(); renderer.clear(); audio.stopMusic(); view.clearMilestone();
    if (view.dialog.open) view.dialog.close();
    view.update(game.snapshot(store.data.bestFloor), store.data);
  } else if (action === 'close') view.dialog.close();
  else if (['settings', 'leaderboard', 'credits'].includes(action)) {
    pause(); view.panel(action, store);
  }
});

root.querySelector('#score-form').addEventListener('submit', event => {
  event.preventDefault();
  const snapshot = game.snapshot();
  if (snapshot.state !== 'result') return;
  const registered = store.register({ id: runKey, floor: snapshot.floor, runTime: snapshot.runTime,
    nickname: root.querySelector('#nickname').value, timestamp: Date.now() });
  if (registered) {
    const button = root.querySelector('#submit-score'); button.disabled = true; button.textContent = '已记录';
    view.toast(store.available ? '成绩已记录。下一次，走得更远。' : '成绩已在本次页面记录，浏览器无法持久保存。');
  }
});

view.dialog.addEventListener('input', event => {
  const control = event.target;
  if (!Object.hasOwn(store.data.settings, control.name)) return;
  const value = control.type === 'checkbox' ? control.checked : Number(control.value);
  store.updateSettings({ [control.name]: value });
  audio.setSettings(store.data.settings);
  const output = control.parentElement.querySelector('output');
  if (output) output.textContent = `${Math.round(value * 100)}%`;
});

view.update(game.snapshot(store.data.bestFloor), store.data);
renderer.ready.then(() => {
  if (renderer.failedAssets.length) view.toast('部分图形加载失败，请刷新页面。');
});
function frame(now) {
  renderedFrames++;
  const seconds = Math.max(0, (now - previous) / 1000);
  const alpha = loop.advance(seconds, input.read());
  previous = now;
  const events = game.drainEvents();
  for (const event of events) {
    if (event.type === 'challenge_complete') view.milestone();
    if (event.type === 'game_over') {
      const newRecord = game.floor > store.data.bestFloor;
      store.rememberBest(game.floor);
      audio.stopMusic();
      if (newRecord) { view.toast('新的最佳纪录！'); audio.playSfx('new_record'); }
    }
  }
  for (const event of events) audio.playSfx(event.type);
  audio.update(game.state);
  renderer.handleEvents(events, game, store.data.settings);
  renderer.render(game, alpha, Math.min(seconds, 0.1), store.data.settings);
  view.update(game.snapshot(store.data.bestFloor), store.data);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Development-only scenarios for browser QA. Removed by Vite production folding.
if (import.meta.env.DEV && new URLSearchParams(location.search).get('test') === '1') {
  window.__TEST__ = {
    start,
    spikeEdge: () => {
      start(42);
      const platform = new Platform('spike', 1, 100, 420, game.profile);
      game.platforms = [platform];
      game.player.x = game.player.previousX = 120;
      game.land(platform);
    },
    snapshot: () => ({ ...game.snapshot(store.data.bestFloor), x: game.player?.x,
      y: game.player?.y, platformCount: game.platforms.length, input: input.read(),
      particleCount: renderer.particles.length, audioNodes: audio.nodes.size, renderedFrames }),
    die: reason => game.die(reason),
    milestone: () => { game.floor = 100; game.completed = true; game.emit('challenge_complete'); },
    tick: (seconds, actions) => {
      for (let i = 0; i < Math.round(seconds / game.profile.step); i++) game.update(game.profile.step, actions);
    },
    world: () => ({ player: { x: game.player?.x, y: game.player?.y,
      vy: game.player?.vy, supportSeq: game.player?.support?.seq },
      platforms: game.platforms.map(platform => ({ type: platform.type, seq: platform.seq,
        x: platform.x, y: platform.y, width: platform.width, solid: platform.solid })) }),
  };
}
