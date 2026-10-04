export class Renderer {
  constructor(canvas) { this.canvas = canvas; this.context = canvas.getContext('2d'); }
  clear() {}
  handleEvents() {}
  render(game, alpha) {
    const c = this.context;
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.fillStyle = '#0e1723'; c.fillRect(0, 0, 360, 480);
    const platforms = game.player ? game.platforms : [
      { x: 50, y: 120, width: 100, height: 12, solid: true },
      { x: 200, y: 220, width: 100, height: 12, solid: true },
      { x: 90, y: 340, width: 100, height: 12, solid: true },
    ];
    for (const platform of platforms) {
      if (!platform.solid) continue;
      c.fillStyle = platform.type === 'spike' ? '#ff6e88' : '#68d7ca';
      const y = platform.previousY === undefined ? platform.y : platform.previousY + (platform.y - platform.previousY) * alpha;
      c.fillRect(platform.x, y, platform.width, platform.height);
    }
    if (game.player) {
      const player = game.player;
      c.fillStyle = '#84efcb';
      c.fillRect(player.previousX + (player.x - player.previousX) * alpha,
        player.previousY + (player.y - player.previousY) * alpha, player.width, player.height);
    }
  }
}
