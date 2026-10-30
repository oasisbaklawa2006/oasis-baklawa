"""Local exact vector rasterisation/contact sheets, never independent frame generation.

Review tooling only: CairoSVG 2.9.1, Pillow 13.0.0. No app dependencies change.
Run after render-carton-evidence.ts and verify-carton-web.mjs.
"""
import hashlib
import json
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

OUT = Path('docs/carton-builder/evidence')
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 23)
BG = '#f9f8f6'


def sheet(paths, columns, target, label):
    sizes = [Image.open(p).size for p in paths]
    width, height = max(s[0] for s in sizes), max(s[1] for s in sizes)
    image = Image.new('RGB', (columns * width, ((len(paths) + columns - 1) // columns) * (height + 40)), BG)
    draw = ImageDraw.Draw(image)
    for i, path in enumerate(paths):
        x, y = i % columns * width, i // columns * (height + 40)
        with Image.open(path) as frame:
            image.paste(frame.convert('RGB'), (x, y))
        draw.text((x + 12, y + height + 5), f'{label} / frame {i + 1}', fill='#49311e', font=FONT)
    image.save(target)


records = []
for config, count in [('bulk-6', 8), ('888x4', 6)]:
    paths = []
    runtime_paths = []
    for n in range(1, count + 1):
        svg = OUT / f'{config}-frame-{n}.svg'
        png = svg.with_suffix('.png')
        cairosvg.svg2png(url=str(svg), write_to=str(png), output_width=800, output_height=600)
        paths.append(png)
        runtime_paths.append(OUT / f'{config}-runtime-{n}.png')
        records.append({'file': png.name, 'sha256': hashlib.sha256(png.read_bytes()).hexdigest(), 'dimensions': [800, 600]})
    columns = 4 if config == 'bulk-6' else 3
    sheet(paths, columns, OUT / f'{config}-contact.png', config + ' / vector draft')
    if all(p.exists() for p in runtime_paths):
        sheet(runtime_paths, columns, OUT / f'{config}-runtime-contact.png', config + ' / diagnostic web component')
all_runtime = [OUT / f'{c}-runtime-{n}.png' for c, count in [('bulk-6', 8), ('888x4', 6)] for n in range(1, count + 1)]
if all(p.exists() for p in all_runtime):
    sheet(all_runtime, 4, OUT / 'web-contact.png', 'diagnostic web component')
(OUT / 'raster-manifest.json').write_text(json.dumps({'cairosvg': cairosvg.__version__, 'pillow': Image.__version__, 'frames': records}, indent=2) + '\n')
print('PASS: 14 vector rasters and ordered contact sheets regenerated.')
