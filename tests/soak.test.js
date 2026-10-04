import { expect, test } from 'vitest';
import { Game } from '../src/core/game.js';
import { classicProfile as p } from '../src/core/profile.js';

test('ten minutes of simulated play/restarts keep platform and occupant references bounded', () => {
  const game = new Game(); game.start(72);
  let maxPlatforms = 0, restarts = 0;
  for (let i = 0; i < 600 / p.step; i++) {
    if (game.state === 'result') { game.start(72 + ++restarts); }
    game.update(p.step, { left: Math.floor(i / 120) % 2 === 0, right: Math.floor(i / 120) % 2 === 1 });
    game.drainEvents();
    maxPlatforms = Math.max(maxPlatforms, game.platforms.length);
    if (game.player.support) expect(game.platforms).toContain(game.player.support);
    for (const platform of game.platforms) {
      if (platform.occupant) expect(platform.occupant.support).toBe(platform);
    }
  }
  const bound = Math.ceil((p.height + 2 * p.platformGap + p.platformHeight) / p.platformGap);
  expect(restarts).toBeGreaterThan(5); expect(maxPlatforms).toBeLessThanOrEqual(bound);
});
