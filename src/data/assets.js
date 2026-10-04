const base = import.meta.env.BASE_URL;
export const assetManifest = Object.freeze({
  player: `${base}assets/player.svg`, background: `${base}assets/background.svg`,
  normal: `${base}assets/platform_normal.svg`, spike: `${base}assets/platform_spike.svg`,
  fake: `${base}assets/platform_fake.svg`, spring: `${base}assets/platform_spring.svg`,
  conveyorLeft: `${base}assets/platform_conveyorLeft.svg`,
  conveyorRight: `${base}assets/platform_conveyorRight.svg`,
});
