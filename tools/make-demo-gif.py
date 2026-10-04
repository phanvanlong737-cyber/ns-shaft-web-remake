"""Encode screenshots of our own running game as the README demo."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
frames = []
for path in sorted((root / '.local' / 'demo').glob('frame_*.png')):
    with Image.open(path) as source:
        frames.append(source.convert('RGB').quantize(colors=128))
if not frames:
    raise SystemExit('Run node tools/capture-demo.mjs first')
target = root / 'docs' / 'screenshots' / 'demo.gif'
frames[0].save(target, save_all=True, append_images=frames[1:], duration=150, loop=0, optimize=True)
print(f'Encoded {len(frames)} frames, {target.stat().st_size} bytes')
