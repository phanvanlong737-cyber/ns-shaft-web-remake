export function findLanding(player, platforms) {
  let first = null;
  for (const platform of platforms) {
    if (!platform.solid) continue;
    const before = player.previousY + player.height - platform.previousY;
    const after = player.y + player.height - platform.y;
    const travel = after - before;
    // Relative downward crossing, including a platform moving upward into falling feet.
    if (before > 1e-8 || after < 0 || travel <= 0) continue;
    const time = Math.max(0, -before / travel);
    const x = player.previousX + (player.x - player.previousX) * time;
    const platformX = platform.previousX + (platform.x - platform.previousX) * time;
    if (x + player.width <= platformX || x >= platformX + platform.width) continue;
    if (!first || time < first.time || (time === first.time && platform.seq < first.platform.seq)) {
      first = { platform, time };
    }
  }
  return first?.platform ?? null;
}
