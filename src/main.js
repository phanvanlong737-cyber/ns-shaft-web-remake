import { Game } from './core/game.js';
import { FixedLoop } from './core/loop.js';

const canvas = document.createElement('canvas');
canvas.width = 360; canvas.height = 480;
document.querySelector('#app').replaceChildren(canvas);
const context = canvas.getContext('2d');
const game = new Game();
const loop = new FixedLoop(game);
const keys = new Set();
addEventListener('keydown', event => {
  keys.add(event.code);
  if (event.code === 'Space') {
    if (game.state === 'result') game.start(42);
    else if (game.state === 'playing') game.pause();
    else game.resume();
  }
});
addEventListener('keyup', event => keys.delete(event.code));
game.start(42);
let previous = performance.now();
function frame(now) {
  loop.advance((now - previous) / 1000, { left: keys.has('ArrowLeft'), right: keys.has('ArrowRight') });
  previous = now;
  context.fillStyle = '#0b101b'; context.fillRect(0, 0, 360, 480);
  for (const platform of game.platforms) {
    context.fillStyle = platform.type === 'spike' ? '#ff6379' : '#52d9ce';
    if (platform.solid) context.fillRect(platform.x, platform.y, platform.width, platform.height);
  }
  context.fillStyle = '#fff'; context.fillRect(game.player.x, game.player.y, 26, 26);
  context.fillText(`HP ${game.player.hp} / FLOOR ${game.floor} / ${game.state}`, 12, 24);
  game.drainEvents();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
