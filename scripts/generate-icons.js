const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const iconDir = path.join(root, "icons");

const colors = {
  green: [47, 125, 89, 255],
  paper: [247, 244, 237, 255],
  ink: [24, 32, 38, 255],
};

function crc32(buffer) {
  let crc = -1;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function png(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 512;

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const index = (Math.floor(y) * size + Math.floor(x)) * 4;
    pixels[index] = color[0];
    pixels[index + 1] = color[1];
    pixels[index + 2] = color[2];
    pixels[index + 3] = color[3];
  }

  function fillRect(x, y, width, height, color) {
    for (let yy = Math.floor(y); yy < y + height; yy += 1) {
      for (let xx = Math.floor(x); xx < x + width; xx += 1) setPixel(xx, yy, color);
    }
  }

  function fillRoundRect(x, y, width, height, radius, color) {
    for (let yy = Math.floor(y); yy < y + height; yy += 1) {
      for (let xx = Math.floor(x); xx < x + width; xx += 1) {
        const dx = Math.max(x - xx, 0, xx - (x + width - 1));
        const dy = Math.max(y - yy, 0, yy - (y + height - 1));
        const cornerX = xx < x + radius ? x + radius : xx > x + width - radius ? x + width - radius : xx;
        const cornerY = yy < y + radius ? y + radius : yy > y + height - radius ? y + height - radius : yy;
        const rounded = dx === 0 && dy === 0;
        const nearCorner = (xx - cornerX) ** 2 + (yy - cornerY) ** 2 <= radius ** 2;
        if (rounded || nearCorner) setPixel(xx, yy, color);
      }
    }
  }

  function fillCircle(cx, cy, radius, color) {
    for (let yy = cy - radius; yy <= cy + radius; yy += 1) {
      for (let xx = cx - radius; xx <= cx + radius; xx += 1) {
        if ((xx - cx) ** 2 + (yy - cy) ** 2 <= radius ** 2) setPixel(xx, yy, color);
      }
    }
  }

  function drawLine(x1, y1, x2, y2, width, color) {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      fillCircle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color);
    }
  }

  fillRect(0, 0, size, size, colors.green);
  fillRoundRect(80 * scale, 74 * scale, 352 * scale, 364 * scale, 48 * scale, colors.paper);
  drawLine(144 * scale, 178 * scale, 368 * scale, 178 * scale, 28 * scale, colors.ink);
  drawLine(144 * scale, 252 * scale, 368 * scale, 252 * scale, 28 * scale, colors.ink);
  drawLine(144 * scale, 326 * scale, 282 * scale, 326 * scale, 28 * scale, colors.ink);
  fillCircle(348 * scale, 330 * scale, 50 * scale, colors.green);
  drawLine(325 * scale, 329 * scale, 342 * scale, 347 * scale, 20 * scale, colors.paper);
  drawLine(342 * scale, 347 * scale, 380 * scale, 298 * scale, 20 * scale, colors.paper);

  return png(size, size, pixels);
}

fs.mkdirSync(iconDir, { recursive: true });
fs.writeFileSync(path.join(iconDir, "icon-192.png"), drawIcon(192));
fs.writeFileSync(path.join(iconDir, "icon-512.png"), drawIcon(512));
console.log("Generated PNG icons.");
