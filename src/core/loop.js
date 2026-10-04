export class FixedLoop {
  constructor(game) {
    this.game = game;
    this.accumulator = 0;
  }

  reset() { this.accumulator = 0; }

  advance(seconds, input = {}) {
    if (this.game.state !== 'playing') {
      this.reset();
      return 1;
    }
    const step = this.game.profile.step;
    this.accumulator += Math.min(Math.max(0, seconds), 0.1);
    while (this.accumulator + 1e-10 >= step && this.game.state === 'playing') {
      const actions = typeof input === 'function' ? input(this.game.runTime) : input;
      this.game.update(step, actions);
      this.accumulator = Math.max(0, this.accumulator - step);
    }
    return this.game.state === 'playing' ? this.accumulator / step : 1;
  }
}
