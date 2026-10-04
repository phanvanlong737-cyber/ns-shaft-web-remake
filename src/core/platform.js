export class Platform {
  constructor(type, seq, x, y, profile) {
    this.type = type;
    this.seq = seq;
    this.x = this.previousX = x;
    this.y = this.previousY = y;
    this.width = profile.platformWidth;
    this.height = profile.platformHeight;
    this.profile = profile;
    this.elapsed = null;
    this.state = 'idle';
    this.occupant = null;
  }

  get solid() { return this.state !== 'broken'; }

  getCollisionBox() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  onLand(player, emit) {
    this.occupant = player;
    if (this.type === 'spike') {
      const amount = player.takeDamage(this.profile.spikeDamage);
      if (amount) emit('hurt', { amount, source: 'spike' });
    } else {
      const amount = player.heal(this.profile.healing);
      if (amount) emit('heal', { amount });
    }
    if (this.type === 'fake' && this.elapsed === null) this.elapsed = 0;
    if (this.type === 'spring') {
      this.elapsed = 0;
      this.state = 'compressing';
    }
    emit('land', { platformType: this.type, seq: this.seq });
  }

  onLeave(player) {
    if (this.occupant === player) this.occupant = null;
    if (player.support === this) player.support = null;
    if (this.type === 'spring' && this.state === 'compressing') {
      this.elapsed = null;
      this.state = 'idle';
    }
  }

  update(dt, emit) {
    if (this.elapsed === null) return;
    this.elapsed += dt;
    if (this.type === 'fake') {
      if (this.elapsed + 1e-9 >= this.profile.fakeBreakSeconds && this.state !== 'broken') {
        this.state = 'broken';
        if (this.occupant) this.onLeave(this.occupant);
        emit('fake_break', { x: this.x + this.width / 2, y: this.y });
      } else if (this.elapsed + 1e-9 >= this.profile.fakeWarningSeconds && this.state === 'idle') {
        this.state = 'cracking';
        emit('fake_crack', { x: this.x + this.width / 2, y: this.y });
      }
    } else if (this.type === 'spring' && this.state === 'compressing' &&
        this.elapsed + 1e-9 >= this.profile.springDelaySeconds) {
      const player = this.occupant;
      if (player?.support === this) {
        player.support = null;
        player.vy = this.profile.springVelocity;
        emit('spring', { x: this.x + this.width / 2, y: this.y });
      }
      this.occupant = null;
      this.state = 'released';
      this.elapsed = 0;
    } else if (this.type === 'spring' && this.state === 'released' &&
        this.elapsed >= this.profile.springDelaySeconds) {
      this.state = 'idle';
      this.elapsed = null;
    }
  }
}
