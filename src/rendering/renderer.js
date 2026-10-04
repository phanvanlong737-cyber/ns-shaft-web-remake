import { assetManifest } from '../data/assets.js';

const colors = { normal: '#68d7ca', spike: '#ff6e88', fake: '#ba97dc',
  spring: '#f5c76b', conveyorLeft: '#839ffb', conveyorRight: '#839ffb' };

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.assets = {};
    this.failedAssets = [];
    this.time = 0;
    this.clear();
    this.ready = Promise.all(Object.entries(assetManifest).map(([id, url]) => new Promise(resolve => {
      const image = new Image();
      image.onload = () => { this.assets[id] = image; resolve(); };
      image.onerror = () => { this.failedAssets.push(id); resolve(); };
      image.src = url;
    })));
  }

  clear() { this.particles = []; this.shake = 0; this.deathTime = 0; }

  burst(x, y, color, count, reducedMotion) {
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 75;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 30,
        life: 0.45 + Math.random() * 0.4, color, size: 1 + Math.random() * 2 });
    }
    this.particles = this.particles.slice(-180);
  }

  handleEvents(events, game, settings) {
    const hero = game.player;
    for (const event of events) {
      const x = event.x ?? (hero ? hero.x + hero.width / 2 : 180);
      const y = event.y ?? (hero ? hero.y + hero.height : 200);
      if (event.type === 'hurt') {
        this.shake = settings.shake && !settings.reducedMotion ? 0.2 : 0;
        this.burst(x, y - 12, '#ff6e88', 18, settings.reducedMotion);
      } else if (event.type === 'heal') this.burst(x, y - 8, '#84efcb', 8, settings.reducedMotion);
      else if (event.type === 'spring') this.burst(x, y, colors.spring, 12, settings.reducedMotion);
      else if (event.type === 'fake_break') this.burst(x, y, colors.fake, 16, settings.reducedMotion);
      else if (event.type === 'land') this.burst(x, y, colors[event.platformType], 4, settings.reducedMotion);
      else if (event.type === 'challenge_complete') this.burst(180, 120, '#84efcb', 48, settings.reducedMotion);
    }
  }

  drawPlatform(platform, alpha, reducedMotion) {
    const c = this.context;
    if (!platform.solid && platform.state !== undefined) return;
    const y = platform.previousY === undefined ? platform.y : platform.previousY + (platform.y - platform.previousY) * alpha;
    const image = this.assets[platform.type];
    c.save(); c.translate(platform.x, y);
    c.shadowColor = colors[platform.type]; c.shadowBlur = 5;
    if (platform.type === 'fake' && platform.state === 'cracking') {
      c.globalAlpha = reducedMotion ? 0.6 : 0.55 + Math.sin(this.time * 28) * 0.25;
    }
    if (platform.type === 'spring' && !reducedMotion) {
      if (platform.state === 'compressing') c.scale(1, 1 - Math.min(1, platform.elapsed / 0.2) * 0.35);
      if (platform.state === 'released') c.scale(1, 1 + Math.max(0, 1 - platform.elapsed / 0.2) * 0.4);
    }
    if (image) c.drawImage(image, 0, -12, 100, 24);
    else { c.fillStyle = colors[platform.type]; c.fillRect(0, 0, 100, 12); }
    c.shadowBlur = 0;
    if (platform.type.startsWith('conveyor') && !reducedMotion) {
      c.fillStyle = '#c4d0ff'; c.globalAlpha = 0.6;
      const offset = (this.time * 28) % 80;
      c.fillRect(platform.type === 'conveyorLeft' ? 90 - offset : 10 + offset, 1, 5, 1);
    }
    if (platform.seq > 0) {
      c.globalAlpha = 0.35; c.font = '7px monospace'; c.fillStyle = '#b3cad4';
      c.textAlign = 'center'; c.fillText(`— ${platform.seq} —`, 50, 24);
    }
    c.restore();
  }

  drawPlayer(player, alpha, reducedMotion) {
    const c = this.context;
    const x = player.previousX === undefined ? player.x : player.previousX + (player.x - player.previousX) * alpha;
    const y = player.previousY === undefined ? player.y : player.previousY + (player.y - player.previousY) * alpha;
    c.save(); c.translate(x + 13, y + 13);
    if (player.dead) {
      c.rotate(Math.min(1.4, this.deathTime * 2));
      c.globalAlpha = Math.max(0.3, 1 - this.deathTime);
    } else if (!reducedMotion) {
      if (player.support && Math.abs(player.vx) > 1) {
        c.rotate(Math.sin(this.time * 24) * 0.055);
        c.translate(0, Math.sin(this.time * 24) * 0.8);
      } else if (player.vy < -150) c.scale(0.92, 1.08);
      else if (!player.support && player.vy > 120) c.rotate((player.facing ?? 1) * 0.055);
      else c.translate(0, Math.sin(this.time * 3) * 0.6);
    }
    if (player.invincible > 0) c.globalAlpha = reducedMotion ? 0.7 : (Math.floor(this.time * 12) % 2 ? 0.55 : 1);
    if (player.facing < 0) c.scale(-1, 1);
    c.shadowColor = '#84efcb'; c.shadowBlur = player.invincible > 0 ? 12 : 5;
    if (this.assets.player) c.drawImage(this.assets.player, -13, -19, 26, 32);
    else { c.fillStyle = '#84efcb'; c.fillRect(-13, -13, 26, 26); }
    c.restore();
  }

  render(game, alpha, seconds, settings) {
    const { reducedMotion, shake } = settings;
    if (game.state === 'playing' || game.state === 'menu') this.time += seconds;
    if (game.state === 'result' && !reducedMotion) this.deathTime = Math.min(1, this.deathTime + seconds);
    const c = this.context;
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width; this.canvas.height = height;
    }
    c.setTransform(width / 360, 0, 0, height / 480, 0, 0);
    c.fillStyle = '#0e1723'; c.fillRect(0, 0, 360, 480);
    if (this.assets.background) c.drawImage(this.assets.background, 0, 0, 360, 480);
    c.save();
    if (this.shake > 0 && shake && !reducedMotion) {
      c.translate(Math.sin(this.time * 180) * this.shake * 12, Math.cos(this.time * 140) * this.shake * 7);
    }
    const drift = reducedMotion ? 0 : (game.runTime * 8) % 80;
    c.strokeStyle = '#68d7ca12'; c.lineWidth = 1;
    for (let y = 40 - drift; y < 500; y += 80) {
      c.beginPath(); c.moveTo(16, y); c.lineTo(23, y); c.moveTo(337, y); c.lineTo(344, y); c.stroke();
    }
    const platforms = game.player ? game.platforms : [
      { type: 'normal', x: 135, y: 106, seq: 0 },
      { type: 'fake', x: 24, y: 178, seq: 0 },
      { type: 'conveyorRight', x: 220, y: 256, seq: 0 },
      { type: 'spring', x: 150, y: 382, seq: 0 },
      { type: 'spike', x: 25, y: 456, seq: 0 },
    ];
    for (const platform of platforms) this.drawPlatform(platform, alpha, reducedMotion);
    if (game.player) this.drawPlayer(game.player, alpha, reducedMotion);
    else this.drawPlayer({ x: 172, y: 76, vy: 0, support: true, facing: 1 }, 1, reducedMotion);
    if (reducedMotion) this.particles = [];
    if (game.state === 'playing' || game.state === 'result') {
      this.shake = Math.max(0, this.shake - seconds);
      for (const particle of this.particles) {
        particle.x += particle.vx * seconds; particle.y += particle.vy * seconds;
        particle.vy += 90 * seconds; particle.life -= seconds;
      }
      this.particles = this.particles.filter(particle => particle.life > 0);
    }
    for (const particle of this.particles) {
      c.globalAlpha = Math.min(1, particle.life * 2); c.fillStyle = particle.color;
      c.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    c.globalAlpha = 1;
    c.fillStyle = '#ff6e8845'; c.fillRect(0, 0, 360, 2);
    c.fillStyle = '#cf738166'; c.beginPath();
    for (let x = 0; x < 360; x += 12) { c.moveTo(x, 0); c.lineTo(x + 6, 11); c.lineTo(x + 12, 0); }
    c.fill(); c.restore();
  }
}
