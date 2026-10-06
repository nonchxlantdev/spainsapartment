import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';

const img = await loadImage('apps/api/assets/signature.png');
const canvas = createCanvas(img.width, img.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const data = ctx.getImageData(0, 0, img.width, img.height);
const d = data.data;
let minY = img.height, maxY = 0, minX = img.width, maxX = 0;
for (let y = 0; y < img.height; y++) {
  for (let x = 0; x < img.width; x++) {
    const a = d[(y * img.width + x) * 4 + 3];
    if (a > 20) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
}
console.log({ w: img.width, h: img.height, minX, maxX, minY, maxY });

// Crop to content with small padding
const pad = 4;
const x0 = Math.max(0, minX - pad);
const y0 = Math.max(0, minY - pad);
const x1 = Math.min(img.width, maxX + pad + 1);
const y1 = Math.min(img.height, maxY + pad + 1);
const cw = x1 - x0;
const ch = y1 - y0;
const out = createCanvas(cw, ch);
out.getContext('2d').drawImage(img, x0, y0, cw, ch, 0, 0, cw, ch);
fs.writeFileSync('apps/api/assets/signature.png', out.toBuffer('image/png'));
console.log('cropped', cw, ch);
