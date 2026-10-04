export const classicProfile = Object.freeze({
  width: 360, height: 480, playerSize: 26,
  platformWidth: 100, platformHeight: 12, platformGap: 60,
  moveSpeed: 170, gravity: 1500, initialScrollSpeed: 140,
  springVelocity: -500, conveyorSpeed: 100,
  maxHp: 10, ceilingDamage: 5, spikeDamage: 5, healing: 1,
  invincibleSeconds: 1, fakeWarningSeconds: 0.3, fakeBreakSeconds: 0.6,
  springDelaySeconds: 0.2, step: 1 / 120,
  platformsPerFloor: 5, floorsPerLevel: 5, speedIncrease: 0.1,
  challengeFloor: 100, ceilingY: 12, generationAttempts: 20,
  weights: Object.freeze([
    ['normal', 0.28], ['spike', 0.19], ['fake', 0.17],
    ['conveyorLeft', 0.09], ['conveyorRight', 0.09], ['spring', 0.18],
  ].map(Object.freeze)),
});
