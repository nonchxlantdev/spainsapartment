import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';

const img = await loadImage('apps/api/assets/signature.png');
const canvas = createCanvas(img.width, img.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const data = ctx.getImageData(0, 0, img.width, img.height);
const d = data.data;
for (let i = 0; i < d.length; i += 4) {
  if (d[i + 3] < 8) continue;
  // Keep alpha (stroke weight), force ink to black
  d[i] = 0;
  d[i + 1] = 0;
  d[i + 2] = 0;
}
ctx.putImageData(data, 0, 0);
fs.writeFileSync('apps/api/assets/signature.png', canvas.toBuffer('image/png'));
console.log('signature recolored black', img.width, img.height);
