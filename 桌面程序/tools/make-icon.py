"""用一张方形 CCD 照片做 macOS 图标：苹果图标网格（1024 画布、824 圆角方形、22.5% 圆角）+ 右下角橙色日期戳 + 投影。
用法：python3 make-icon.py 照片.jpg 输出.png [--stamp "'26 10 31"] [--font DSEG7Classic-Bold.ttf]"""
import argparse
from PIL import Image, ImageDraw, ImageFilter, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("dst")
ap.add_argument("--stamp", default="'26 10 31"); ap.add_argument("--font", required=True)
a = ap.parse_args()
S, B = 1024, 824; off = (S - B) // 2; R = int(B * 0.225)
photo = Image.open(a.src).convert("RGB")
w, h = photo.size; s = min(w, h); photo = photo.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((B, B), Image.LANCZOS)
# 日期戳：橙色七段数码字 + 微弱辉光（--stamp "" 表示照片已自带日期戳，不再加）
stamp = Image.new("RGBA", (B, B), (0, 0, 0, 0)); d = ImageDraw.Draw(stamp)
f = ImageFont.truetype(a.font, 54)
tw = d.textlength(a.stamp, font=f); x, y = B - tw - 92, B - 150
if a.stamp: d.text((x, y), a.stamp, font=f, fill=(255, 150, 40, 255))
glow = stamp.filter(ImageFilter.GaussianBlur(6))
photo = Image.alpha_composite(Image.alpha_composite(photo.convert("RGBA"), glow), stamp)
# 内边一圈很细的高光，像相纸边缘
edge = Image.new("RGBA", (B, B), (0, 0, 0, 0)); ImageDraw.Draw(edge).rounded_rectangle((1, 1, B - 2, B - 2), R, outline=(255, 255, 255, 46), width=3)
photo = Image.alpha_composite(photo, edge)
mask = Image.new("L", (B, B), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, B - 1, B - 1), R, fill=255)
canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0)); ImageDraw.Draw(shadow).rounded_rectangle((off, off + 12, off + B, off + B + 12), R, fill=(0, 0, 0, 120))
canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(18)))
canvas.paste(photo, (off, off), mask)
canvas.save(a.dst); print(a.dst)
