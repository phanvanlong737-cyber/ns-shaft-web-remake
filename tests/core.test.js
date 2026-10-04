import { describe, expect, test } from 'vitest';
import { classicProfile as p } from '../src/core/profile.js';
import { Player } from '../src/core/player.js';
import { Platform } from '../src/core/platform.js';
import { PlatformGenerator } from '../src/core/generator.js';
import { findLanding } from '../src/core/collision.js';
import { Game } from '../src/core/game.js';
import { FixedLoop } from '../src/core/loop.js';

const block = (type = 'normal', seq = 5, x = 100, y = 200) => new Platform(type, seq, x, y, p);
const noop = () => {};
const playing = () => { const g = new Game(); g.start(42); g.drainEvents(); return g; };

describe('player life', () => {
  test('clamps life and prevents duplicate damage for one second', () => {
    const hero = new Player(p);
    expect(hero.takeDamage(4)).toBe(4);
    expect(hero.takeDamage(4)).toBe(0);
    expect(hero.heal(10)).toBe(4);
    hero.invincible = 0;
    hero.takeDamage(100);
    expect(hero.hp).toBe(0);
  });
});

describe('continuous one-way collision', () => {
  const hero = (previousX, x, previousY, y) => ({ previousX, x, previousY, y, width: 26, height: 26 });
  test('downward crossing lands; upward crossing does not', () => {
    const platform = block();
    expect(findLanding(hero(120, 120, 150, 190), [platform])).toBe(platform);
    expect(findLanding(hero(120, 120, 190, 140), [platform])).toBeNull();
  });
  test('fast fall selects earliest contact independent of array order', () => {
    const first = block('normal', 5, 100, 200);
    const second = block('normal', 6, 100, 260);
    expect(findLanding(hero(120, 120, 100, 400), [second, first])).toBe(first);
  });
  test('uses relative motion when a platform moves upwards', () => {
    const platform = block();
    platform.previousY = 230;
    expect(findLanding(hero(120, 120, 190, 185), [platform])).toBe(platform);
  });
  test('horizontal overlap is measured at crossing, not final position', () => {
    expect(findLanding(hero(0, 240, 124, 224), [block()])).not.toBeNull();
    expect(findLanding(hero(0, 110, 124, 374), [block()])).toBeNull();
  });
  test('pure edge touch and broken platforms never land', () => {
    expect(findLanding(hero(74, 74, 150, 200), [block()])).toBeNull();
    const broken = block('fake'); broken.state = 'broken';
    expect(findLanding(hero(120, 120, 150, 200), [broken])).toBeNull();
  });
});

describe('platform mechanisms', () => {
  test.each(['normal', 'fake', 'spring', 'conveyorLeft', 'conveyorRight'])('%s heals once on landing', type => {
    const hero = new Player(p); hero.hp = 5;
    const platform = block(type); hero.support = platform;
    platform.onLand(hero, noop);
    for (let i = 0; i < 12; i++) platform.update(p.step, noop);
    expect(hero.hp).toBe(6);
  });
  test('spike damages instead of healing', () => {
    const hero = new Player(p); block('spike').onLand(hero, noop);
    expect(hero.hp).toBe(6);
  });
  test('fake timer persists across leaving and relanding', () => {
    const hero = new Player(p), platform = block('fake');
    hero.support = platform; platform.onLand(hero, noop);
    platform.update(0.3, noop);
    expect(platform.state).toBe('cracking');
    platform.onLeave(hero); platform.update(0.1, noop);
    hero.support = platform; platform.onLand(hero, noop);
    platform.update(0.2, noop);
    expect(platform.solid).toBe(false);
    expect(hero.support).toBeNull();
    expect(platform.getCollisionBox().height).toBe(12);
  });
  test('spring launches at 200ms only if occupant remains', () => {
    const hero = new Player(p), platform = block('spring');
    hero.support = platform; platform.onLand(hero, noop);
    platform.update(0.19, noop); expect(hero.support).toBe(platform);
    platform.update(0.01, noop); expect(hero.vy).toBe(-500);
    expect(hero.support).toBeNull();
    hero.vy = 0; hero.support = platform; platform.onLand(hero, noop);
    platform.onLeave(hero); platform.update(1, noop);
    expect(hero.vy).toBe(0);
  });
  test.each([['conveyorLeft', -100], ['conveyorRight', 100]])('%s clears push on departure', (type, velocity) => {
    const game = playing(), platform = block(type);
    game.player.x = game.player.previousX = 120;
    game.platforms = [platform]; game.land(platform);
    game.update(p.step, { left: true, right: true });
    expect(game.player.vx).toBe(velocity);
    platform.onLeave(game.player); game.update(p.step, {});
    expect(game.player.vx).toBe(0);
  });
});

describe('generation', () => {
  test('fixed seeds reproduce the entire chain and respect reachability', () => {
    const a = new PlatformGenerator(p, 17), b = new PlatformGenerator(p, 17);
    let previousA, previousB;
    for (let i = 0; i < 2000; i++) {
      const nextA = a.next(previousA), nextB = b.next(previousB);
      expect([nextA.type, nextA.x, nextA.y, nextA.seq]).toEqual([nextB.type, nextB.x, nextB.y, nextB.seq]);
      expect(nextA.x).toBeGreaterThanOrEqual(0);
      expect(nextA.x + nextA.width).toBeLessThanOrEqual(p.width);
      if (previousA) {
        const [min, max] = a.reachableRange(previousA);
        expect(nextA.x).toBeGreaterThanOrEqual(min);
        expect(nextA.x).toBeLessThanOrEqual(max);
      } else { expect(nextA.type).toBe('normal'); expect(nextA.seq).toBe(0); }
      previousA = nextA; previousB = nextB;
    }
  });
  test('large fixed sample follows weights without changing type during fallback', () => {
    const generator = new PlatformGenerator(p, 700);
    let previous = generator.next(); const counts = {};
    for (let i = 0; i < 20000; i++) {
      previous = generator.next(previous);
      counts[previous.type] = (counts[previous.type] ?? 0) + 1;
    }
    for (const [type, weight] of p.weights) expect(counts[type] / 20000).toBeCloseTo(weight, 1);
    generator.random = () => 0.99;
    previous.x = 0;
    const next = generator.next(previous);
    expect(next.type).toBe('spring');
    expect(next.x).toBe(generator.reachableRange(previous)[1]);
  });
});

describe('game integration', () => {
  test('landing progression is monotonic, skips depth, and celebrates only once', () => {
    const game = playing();
    game.land(block('normal', 505));
    expect(game.floor).toBe(101); expect(game.scrollSpeed).toBe(200);
    game.land(block('normal', 100)); game.land(block('normal', 510));
    expect(game.floor).toBe(102);
    expect(game.drainEvents().filter(e => e.type === 'challenge_complete')).toHaveLength(1);
    expect(game.state).toBe('playing');
  });
  test('standing does not repeatedly heal or register a landing', () => {
    const game = playing(); game.player.hp = 5;
    const platform = block(); game.platforms = [platform]; game.land(platform);
    for (let i = 0; i < 20; i++) game.update(p.step, {});
    expect(game.player.hp).toBe(6);
    expect(game.drainEvents().filter(e => e.type === 'land')).toHaveLength(1);
  });
  test('pause freezes all timers; restart reconstructs world and life', () => {
    const game = playing(); game.land(block('fake')); game.player.invincible = 1;
    const read = () => ({ snapshot: game.snapshot(), x: game.player.x, y: game.player.y,
      invincible: game.player.invincible, timer: game.player.support?.elapsed });
    game.pause(); const before = read(), time = game.runTime;
    game.update(1, { right: true });
    expect(read()).toEqual(before); expect(game.runTime).toBe(time);
    game.resume(); game.update(p.step, {}); expect(game.runTime).toBeGreaterThan(time);
    game.start(99);
    expect(game.player.hp).toBe(10); expect(game.player.support).toBeNull();
    expect(game.floor).toBe(0); expect(game.runTime).toBe(0); expect(game.events).toEqual([{ type: 'start' }]);
  });
  test('ceiling detaches supported player and applies protected damage', () => {
    const game = playing(), platform = block('normal', 5, 100, 30);
    game.platforms = [platform]; game.land(platform); game.update(p.step, {});
    expect(game.player.support).toBeNull(); expect(game.player.hp).toBe(5);
    game.player.y = 0; game.update(p.step, {}); expect(game.player.hp).toBe(5);
  });
  test.each(['hp', 'fall'])('%s death occurs once, even during immunity', reason => {
    const game = playing(); game.player.invincible = 1;
    if (reason === 'hp') game.player.hp = 0;
    else game.player.y = 500;
    game.update(p.step, {}); game.update(p.step, {});
    expect(game.state).toBe('result'); expect(game.reason).toBe(reason);
    expect(game.drainEvents().filter(e => e.type === 'game_over')).toHaveLength(1);
  });
  test('30/60/120 render FPS produce identical simulation with scripted inputs', () => {
    const results = [30, 60, 120].map(fps => {
      const game = playing(), loop = new FixedLoop(game);
      for (let frame = 0; frame < 6 * fps; frame++) {
        loop.advance(1 / fps, time => ({ left: Math.floor(time) % 2 === 0, right: Math.floor(time) % 2 === 1 }));
        game.drainEvents();
      }
      return { snapshot: game.snapshot(), x: game.player.x, y: game.player.y, seq: game.generator.seq };
    });
    expect(results[0]).toEqual(results[1]); expect(results[1]).toEqual(results[2]);
  });
});
