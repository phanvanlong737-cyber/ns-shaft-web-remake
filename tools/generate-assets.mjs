import { mkdir, writeFile } from 'node:fs/promises';

const directory = new URL('../public/assets/', import.meta.url);
await mkdir(directory, { recursive: true });
const files = {};
const svg = (width, height, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
files['player.svg'] = svg(26, 32, `
  <path d="M4 18 1 23 3 25 7 21M22 18 25 23 23 25 19 21" fill="#84efcb"/>
  <rect x="6" y="17" width="14" height="11" rx="4" fill="#60cfb9"/>
  <path d="M7 25v6h5v-5M14 26v5h5v-6" fill="#b9f9e5"/>
  <rect x="3" y="3" width="20" height="18" rx="7" fill="#d9fff1"/>
  <path d="M6 7V5h14v2" fill="none" stroke="#60cfb9" stroke-width="2"/>
  <rect x="5" y="9" width="16" height="8" rx="4" fill="#1c3944"/>
  <path d="M8 12h3m4 0h3" stroke="#aaffea" stroke-width="2" stroke-linecap="round"/>
  <rect x="11" y="1" width="4" height="3" rx="1" fill="#ffcc72"/>
  <circle cx="13" cy="23" r="2" fill="#ffcc72"/>
`);
const base = (color, inner = '') => `<rect x="1" y="12" width="98" height="11" rx="4" fill="${color}" fill-opacity=".3" stroke="${color}"/><rect x="3" y="12" width="94" height="3" rx="1.5" fill="${color}"/><path d="M9 19h9m64 0h9" stroke="${color}" stroke-opacity=".8"/>${inner}`;
files['platform_normal.svg'] = svg(100, 24, base('#65f080', '<path d="M29 18h42" stroke="#65f080" stroke-opacity=".7"/>'));
files['platform_spike.svg'] = svg(100, 24, base('#ff3b5c', '<path d="M3 12 11 1 19 12 27 1 35 12 43 1 51 12 59 1 67 12 75 1 83 12 91 1 99 12" fill="#ff3b5c"/><path d="M11 5 14 10M27 5 30 10M43 5 46 10M59 5 62 10M75 5 78 10M91 5 94 10" stroke="#ffb6c4" stroke-width="1"/>'));
for (const [type, direction] of [['conveyorLeft', -1], ['conveyorRight', 1]]) {
  const color = direction < 0 ? '#39baff' : '#e56dff';
  const arrows = [30, 47, 64].map(x => `<path d="m${x + (direction < 0 ? 5 : 0)} 16 ${direction * 4} 3 ${-direction * 4} 3" fill="none" stroke="#f4fbff" stroke-width="1.5"/>`).join('');
  files[`platform_${type}.svg`] = svg(100, 24, base(color, `<circle cx="8" cy="18" r="2" fill="${color}"/><circle cx="92" cy="18" r="2" fill="${color}"/>${arrows}`));
}
files['platform_fake.svg'] = svg(100, 24, base('#ff9440', '<path d="m43 12 6 4-4 3 7 4M68 12l-5 4 4 4M22 14l3 4-3 2" stroke="#fff2d8" fill="none" stroke-width="1.6"/>'));
files['platform_spring.svg'] = svg(100, 24, '<rect x="2" y="12" width="96" height="3" rx="1.5" fill="#ffe45c"/><rect x="2" y="22" width="96" height="2" rx="1" fill="#c9b43e"/><path d="m17 15 7 2-7 2 7 2m20-6 7 2-7 2 7 2m20-6 7 2-7 2 7 2" stroke="#ffe45c" stroke-width="1.8" fill="none"/><path d="m46 8 4-5 4 5" stroke="#ffe45c" stroke-width="1.8" fill="none"/>');
files['background.svg'] = svg(360, 480, `
  <defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#102331"/><stop offset="1" stop-color="#0d1422"/></linearGradient><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#75bea3" stroke-opacity=".045"/></pattern></defs>
  <path fill="url(#bg)" d="M0 0h360v480H0z"/><path fill="url(#grid)" d="M0 0h360v480H0z"/>
  <path d="M16 0v480M344 0v480" stroke="#3b6670" stroke-opacity=".3" stroke-width="2"/>
  <path d="M28 0v480M332 0v480" stroke="#223b49" stroke-opacity=".4"/>
  <path d="M75 0v80h-8v140h8v70M286 150v160h10v170" stroke="#1e3542" stroke-width="1.5" fill="none"/>
  <circle cx="75" cy="80" r="3" fill="#294b55"/><circle cx="286" cy="150" r="3" fill="#294b55"/>
  <path d="M120 75h120M120 405h120" stroke="#294652" stroke-opacity=".2"/>
  <path d="m175 75 5 5 5-5m-10 330 5 5 5-5" stroke="#84efcb" stroke-opacity=".12" fill="none"/>
`);
files['logo.svg'] = svg(48, 48, '<rect width="48" height="48" rx="13" fill="#84efcb"/><path d="M24 10v27m-9-9 9 9 9-9" fill="none" stroke="#142e29" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>');
for (const [name, source] of Object.entries(files)) await writeFile(new URL(name, directory), source, 'utf8');
console.log(`Generated ${Object.keys(files).length} original editable SVG assets.`);
