from PIL import Image, ImageOps, ImageDraw

src = Image.open('/tmp/arcade-ref.jpg').convert('RGB')
btn = src.crop((42, 12, 218, 206))   # button 1, neighbour excluded
w, h = btn.size
px = btn.load()

def minch(p): return min(p)

# Find the bezel's true bounds.
# Dark outline pixels (<100) mark the seam ring — bezel bottom sits a touch below the
# lowest dark pixel; the soft drop shadow below has no dark pixels.
dark_ys = [y for y in range(h) for x in range(w) if minch(px[x, y]) < 100]
dark_xs = [x for x in range(w) for y in range(h) if minch(px[x, y]) < 100]
seam_bottom = max(dark_ys)

# Content (anything not near-white) — scan only above shadow zone for left/right/top
content_xs, content_ys = [], []
for y in range(h):
    for x in range(w):
        if minch(px[x, y]) < 235:
            content_xs.append(x); content_ys.append(y)

left,  right  = min(content_xs), max(content_xs)
top           = min(content_ys)
bottom        = min(max(content_ys), seam_bottom + 36)   # include bezel front face, skip long shadow

print('ellipse bounds:', left, top, right, bottom)

# Build smooth elliptical alpha (supersampled)
S = 4
mask = Image.new('L', (w*S, h*S), 0)
d = ImageDraw.Draw(mask)
d.ellipse((left*S, top*S, right*S, bottom*S), fill=255)
mask = mask.resize((w, h), Image.LANCZOS)

rgba = btn.convert('RGBA')
rgba.putalpha(mask)
out = rgba.crop((left, top, right+1, bottom+1))
out.save('/tmp/btn2-white.png')
print('white:', out.size)

gray  = ImageOps.grayscale(out)
alpha = out.split()[3]

def make(name, hexcol):
    col  = tuple(int(hexcol[i:i+2], 16) for i in (1, 3, 5))
    dark = tuple(int(c*0.22) for c in col)
    t = ImageOps.colorize(gray, black=dark, white=(255, 255, 255), mid=col,
                          blackpoint=0, whitepoint=255, midpoint=232)
    t = t.convert('RGBA'); t.putalpha(alpha)
    t.save(f'/tmp/btn2-{name}.png')
    print(name, 'ok')

make('yellow', '#ffd23d')
make('red',    '#ff4040')
make('orange', '#ff6e4a')
make('blue',   '#4ad7ff')
