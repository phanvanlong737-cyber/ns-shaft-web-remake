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
    expect(hero.hp).toBe(5);
  });
  test('fake timer persists across leaving and relanding', () => {
    const hero = new Player(p), platform = block('fake');
    hero.support = platform; platform.onLand(hero, noop);
    platform.update(0.15, noop);
    expect(platform.state).toBe('cracking');
    platform.onLeave(hero); platform.update(0.05, noop);
    hero.support = platform; platform.onLand(hero, noop);
    platform.update(0.1, noop);
    expect(platform.solid).toBe(false);
    expect(hero.support).toBeNull();
    expect(platform.getCollisionBox().height).toBe(12);
  });
  test('fake loses collision at 300ms, not before', () => {
    const hero = new Player(p), platform = block('fake');
    hero.support = platform; platform.onLand(hero, noop);
    platform.update(0.299, noop); expect(platform.solid).toBe(true);
    platform.update(0.001, noop); expect(platform.solid).toBe(false);
    expect(hero.support).toBeNull();
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
  test('responsive movement: 250ms moves 42.5px while spike danger remains', () => {
    const game = playing(), start = game.player.x;
    for (let i = 0; i < 30; i++) game.update(p.step, { right: true });
    expect(game.player.x - start).toBeCloseTo(42.5, 6);
    const spike = block('spike'); game.land(spike);
    expect(game.player.hp).toBe(5);
  });
  test('landing progression is monotonic, skips depth, and celebrates only once', () => {
    const game = playing();
    game.land(block('normal', 101));
    expect(game.floor).toBe(101); expect(game.scrollSpeed).toBe(420);
    game.land(block('normal', 20)); game.land(block('normal', 102));
    expect(game.floor).toBe(102);
    expect(game.drainEvents().filter(e => e.type === 'challenge_complete')).toHaveLength(1);
    expect(game.state).toBe('playing');
  });
  test('each platform is one floor; skipped and repeated platforms use deepest depth', () => {
    const game = playing();
    for (const seq of [0, 1, 2, 3]) {
      game.land(block('normal', seq));
      expect(game.floor).toBe(seq);
    }
    game.land(block('normal', 7)); expect(game.floor).toBe(7);
    game.land(block('normal', 7)); game.land(block('normal', 2));
    expect(game.floor).toBe(7);
    game.land(block('normal', 99)); expect(game.completed).toBe(false);
    game.land(block('normal', 100));
    expect(game.floor).toBe(100); expect(game.completed).toBe(true);
    game.land(block('normal', 101));
    expect(game.floor).toBe(101); expect(game.state).toBe('playing');
    expect(game.drainEvents().filter(event => event.type === 'challenge_complete')).toHaveLength(1);
  });
  test('scroll accelerates every five floors and continues after floor 100', () => {
    const game = playing();
    for (const [floor, speed] of [[0, 140], [4, 140], [5, 154], [10, 168], [50, 280], [100, 420], [105, 434]]) {
      game.land(block('normal', floor * p.platformsPerFloor));
      expect(game.floor).toBe(floor);
      expect(game.scrollSpeed).toBeCloseTo(speed, 8);
    }
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
  test('spike charges only on landing, never while standing after immunity expires', () => {
    const game = playing(), platform = block('spike', 1, 100, 420);
    game.player.x = game.player.previousX = 120;
    game.platforms = [platform]; game.land(platform);
    for (let i = 0; i < 180; i++) game.update(p.step, {});
    expect(game.state).toBe('playing'); expect(game.player.support).toBe(platform);
    expect(game.player.invincible).toBe(0); expect(game.player.hp).toBe(5);
    const events = game.drainEvents();
    expect(events.filter(event => event.type === 'hurt')).toHaveLength(1);
    expect(events.filter(event => event.type === 'land')).toHaveLength(1);
  });
  test('moving back and forth on the same spike never charges again after immunity expires', () => {
    const game = playing(), platform = block('spike', 1, 100, 420);
    game.player.x = game.player.previousX = 137;
    game.platforms = [platform]; game.land(platform);
    for (let i = 0; i < 240; i++) {
      const right = Math.floor(i / 20) % 2 === 0;
      game.update(p.step, { right, left: !right });
      expect(game.player.support).toBe(platform);
      expect(game.player.hp).toBe(5);
    }
    expect(game.player.invincible).toBe(0); expect(game.state).toBe('playing');
    const events = game.drainEvents();
    expect(events.filter(event => event.type === 'hurt')).toHaveLength(1);
    expect(events.filter(event => event.type === 'land')).toHaveLength(1);
  });
  test.each([['right', 57], ['left', 33]])('walking off the %s spike edge cannot re-land and kill a player with five HP', (direction, steps) => {
    const game = playing(), platform = block('spike', 1, 100, 420);
    game.player.x = game.player.previousX = 120;
    game.platforms = [platform]; game.land(platform);
    for (let i = 0; i < 130; i++) game.update(p.step, {});
    game.drainEvents();
    for (let i = 0; i < steps; i++) game.update(p.step, { [direction]: true });
    if (direction === 'right') expect(game.player.x).toBeGreaterThan(200);
    else expect(game.player.x + game.player.width).toBeLessThan(100);
    expect(game.player.y).toBeGreaterThan(100);
    expect(game.state).toBe('playing'); expect(game.player.hp).toBe(5);
    expect(game.player.support).toBeNull(); expect(platform.occupant).toBeNull();
    expect(game.drainEvents().filter(event => ['hurt', 'land', 'game_over'].includes(event.type))).toEqual([]);
  });
  test('the same spike can damage only once per run even after leaving and landing again', () => {
    const hero = new Player(p), spike = block('spike', 1);
    hero.support = spike; spike.onLand(hero, noop);
    expect(hero.hp).toBe(5);
    spike.onLeave(hero); hero.invincible = 0;
    hero.support = spike; spike.onLand(hero, noop);
    expect(hero.hp).toBe(5);
    spike.onLeave(hero);
    block('spike', 2).onLand(hero, noop);
    expect(hero.hp).toBe(0);
  });
  test.each([[true, 0], [true, 1], [false, 1]])('ceiling kills once (supported=%s, immunity=%s)', (supported, immunity) => {
    const game = playing(), platform = block('normal', 1, 100, 30);
    if (supported) { game.platforms = [platform]; game.land(platform); }
    else { game.player.y = p.ceilingY + 0.1; game.player.vy = -100; }
    game.player.invincible = immunity;
    game.update(p.step, {}); game.update(p.step, {});
    expect(game.state).toBe('result'); expect(game.reason).toBe('ceiling');
    expect(game.player.support).toBeNull(); expect(game.player.hp).toBe(0);
    expect(platform.occupant).toBeNull();
    expect(game.drainEvents().filter(event => event.type === 'game_over')).toHaveLength(1);
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
