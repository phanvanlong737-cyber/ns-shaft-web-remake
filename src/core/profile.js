export const classicProfile = Object.freeze({
  width: 360, height: 480, playerSize: 26,
  platformWidth: 100, platformHeight: 12, platformGap: 60,
  moveSpeed: 200, gravity: 1500, initialScrollSpeed: 100,
  springVelocity: -500, conveyorSpeed: 100,
  maxHp: 10, ceilingDamage: 5, spikeDamage: 4, healing: 1,
  invincibleSeconds: 1, fakeWarningSeconds: 0.3, fakeBreakSeconds: 0.6,
  springDelaySeconds: 0.2, step: 1 / 120,
  platformsPerFloor: 5, floorsPerLevel: 10, speedIncrease: 0.1,
  challengeFloor: 100, ceilingY: 12, generationAttempts: 20,
  weights: Object.freeze([
    ['normal', 0.5], ['spike', 0.1], ['fake', 0.1],
    ['conveyorLeft', 0.1], ['conveyorRight', 0.1], ['spring', 0.1],
  ].map(Object.freeze)),
});
