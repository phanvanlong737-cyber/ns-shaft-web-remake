const base = import.meta.env.BASE_URL;
export const assetManifest = Object.freeze({
  player: `${base}assets/player.svg`, background: `${base}assets/background.svg`,
  normal: `${base}assets/platform_normal.svg?palette=2`, spike: `${base}assets/platform_spike.svg?palette=2`,
  fake: `${base}assets/platform_fake.svg?palette=2`, spring: `${base}assets/platform_spring.svg?palette=2`,
  conveyorLeft: `${base}assets/platform_conveyorLeft.svg?palette=2`,
  conveyorRight: `${base}assets/platform_conveyorRight.svg?palette=2`,
});
