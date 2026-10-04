import { classicProfile } from './profile.js';
import { Player } from './player.js';
import { PlatformGenerator } from './generator.js';
import { findLanding } from './collision.js';

export class Game {
  constructor(profile = classicProfile) {
    this.profile = profile;
    this.state = 'menu';
    this.events = [];
    this.platforms = [];
    this.player = null;
    this.floor = this.deepestSeq = this.runTime = 0;
    this.completed = false;
    this.runId = 0;
    this.reason = null;
  }

  emit = (type, data = {}) => { this.events.push({ type, ...data }); };

  start(seed) {
    this.runId++;
    this.seed = seed >>> 0;
    this.state = 'playing';
    this.events = [];
    this.generator = new PlatformGenerator(this.profile, this.seed);
    this.platforms = [this.generator.next()];
    this.player = new Player(this.profile);
    this.floor = this.deepestSeq = this.runTime = 0;
    this.completed = false;
    this.reason = null;
    this.fillPlatforms();
    this.emit('start');
  }

  get scrollSpeed() {
    const p = this.profile;
    return p.initialScrollSpeed * (1 + Math.floor(this.floor / p.floorsPerLevel) * p.speedIncrease);
  }

  fillPlatforms() {
    const p = this.profile;
    while (this.platforms.at(-1).y < p.height + p.platformGap) {
      this.platforms.push(this.generator.next(this.platforms.at(-1)));
    }
  }

  pause() { if (this.state === 'playing') this.state = 'paused'; }
  resume() { if (this.state === 'paused') this.state = 'playing'; }
  menu() {
    this.state = 'menu';
    this.events = [];
    if (this.player?.support) this.player.support.onLeave(this.player);
    this.player = null;
    this.platforms = [];
  }

  die(reason) {
    if (this.state !== 'playing') return;
    this.state = 'result';
    this.reason = reason;
    this.player.dead = true;
    if (this.player.support) this.player.support.onLeave(this.player);
    this.emit('game_over', { reason });
  }

  land(platform) {
    const player = this.player;
    player.y = platform.y - player.height;
    player.vy = -this.scrollSpeed;
    player.support = platform;
    platform.onLand(player, this.emit);
    this.deepestSeq = Math.max(this.deepestSeq, platform.seq);
    const nextFloor = Math.floor(this.deepestSeq / this.profile.platformsPerFloor);
    if (nextFloor !== this.floor) {
      this.floor = nextFloor;
      this.emit('floor', { floor: this.floor });
    }
    if (!this.completed && this.floor >= this.profile.challengeFloor) {
      this.completed = true;
      this.emit('challenge_complete');
    }
  }

  update(dt, input = {}) {
    if (this.state !== 'playing') return;
    const p = this.profile;
    const player = this.player;
    const speed = this.scrollSpeed;
    this.runTime += dt;
    player.previousX = player.x;
    player.previousY = player.y;
    player.invincible = Math.max(0, player.invincible - dt);
    for (const platform of this.platforms) {
      platform.previousX = platform.x;
      platform.previousY = platform.y;
      platform.y -= speed * dt;
    }
    const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
    let conveyor = 0;
    if (player.support?.type === 'conveyorLeft') conveyor = -p.conveyorSpeed;
    if (player.support?.type === 'conveyorRight') conveyor = p.conveyorSpeed;
    player.vx = direction * p.moveSpeed + conveyor;
    if (direction) player.facing = direction;
    player.x = Math.min(p.width - player.width, Math.max(0, player.x + player.vx * dt));
    if (player.support && (player.x + player.width <= player.support.x ||
        player.x >= player.support.x + player.support.width)) {
      player.support.onLeave(player);
    }
    // Check leaving before platform timers so walking off a spring cancels its launch.
    for (const platform of this.platforms) platform.update(dt, this.emit);
    if (player.support && !player.support.solid) player.support.onLeave(player);
    if (player.support) {
      player.y = player.support.y - player.height;
      player.vy = -speed;
    } else {
      player.y += player.vy * dt + 0.5 * p.gravity * dt * dt;
      player.vy += p.gravity * dt;
      const landing = findLanding(player, this.platforms);
      if (landing) this.land(landing);
    }
    if (player.y <= p.ceilingY) {
      player.y = p.ceilingY;
      player.hp = 0;
      this.die('ceiling');
    } else if (player.hp <= 0) this.die('hp');
    else if (player.y > p.height) this.die('fall');
    this.platforms = this.platforms.filter(platform => {
      if (platform.y + platform.height >= 0) return true;
      if (platform.occupant) platform.onLeave(platform.occupant);
      return false;
    });
    this.fillPlatforms();
  }

  snapshot(bestFloor = 0) {
    return Object.freeze({ state: this.state, hp: this.player?.hp ?? this.profile.maxHp,
      floor: this.floor, bestFloor, runTime: this.runTime, completed: this.completed,
      reason: this.reason, runId: this.runId });
  }

  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}
