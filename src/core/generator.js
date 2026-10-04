import { createRng } from './rng.js';
import { Platform } from './platform.js';

export class PlatformGenerator {
  constructor(profile, seed) {
    this.profile = profile;
    this.random = createRng(seed);
    this.seq = 0;
  }

  reachableRange(previous) {
    const p = this.profile;
    // Leave with platform velocity: relative initial vertical velocity is zero.
    const fallSeconds = Math.sqrt(2 * p.platformGap / p.gravity);
    // Permit a route from an edge-standing position, not an easy center-to-center chain.
    const reach = p.moveSpeed * fallSeconds + p.platformWidth + p.playerSize - 1;
    return [Math.max(0, previous.x - reach),
      Math.min(p.width - p.platformWidth, previous.x + reach)];
  }

  next(previous) {
    const p = this.profile;
    if (!previous) {
      return new Platform('normal', this.seq++, (p.width - p.platformWidth) / 2,
        p.height - p.platformGap, p);
    }
    const roll = this.random();
    let accumulated = 0;
    let type = p.weights.at(-1)[0];
    for (const [candidate, weight] of p.weights) {
      accumulated += weight;
      if (roll < accumulated) { type = candidate; break; }
    }
    const [minX, maxX] = this.reachableRange(previous);
    let x;
    for (let attempt = 0; attempt < p.generationAttempts; attempt++) {
      x = this.random() * (p.width - p.platformWidth);
      if (x >= minX && x <= maxX) break;
    }
    x = Math.min(maxX, Math.max(minX, x));
    return new Platform(type, this.seq++, x, previous.y + p.platformGap, p);
  }
}
