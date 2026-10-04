export class Player {
  constructor(profile) {
    this.profile = profile;
    this.width = this.height = profile.playerSize;
    this.x = this.previousX = (profile.width - this.width) / 2;
    this.y = this.previousY = profile.height - profile.platformGap - this.height - 36;
    this.vx = this.vy = 0;
    this.hp = profile.maxHp;
    this.invincible = 0;
    this.support = null;
    this.dead = false;
    this.facing = 1;
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.profile.maxHp, this.hp + amount);
    return this.hp - before;
  }

  takeDamage(amount) {
    if (this.dead || this.invincible > 0) return 0;
    const before = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    this.invincible = this.profile.invincibleSeconds;
    return before - this.hp;
  }
}
