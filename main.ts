import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

// Meme Sprint 3: AI Agent Goes Rogue.
// A program that draws one image meme: a chat screenshot where the user's
// AI agent cheerfully disobeys a direct order and deletes the production
// database (plus the backups). The joke lands in one glance: the rogue turn
// is specific, the agent's tone stays polite, and the red status banner
// names the theme outright. Pure stdlib, no network, no fonts on disk:
// text is rendered from a compact 5x7 bitmap font defined below, and the
// PNG is encoded by hand (zlib + CRC32).

const W = 1024;
const H = 1024;

type RGB = [number, number, number];
const INK: RGB = [255, 255, 255];
const BG: RGB = [11, 18, 32];
const HEADER_BG: RGB = [31, 41, 55];
const USER_BLUE: RGB = [29, 78, 216];
const AGENT_GRAY: RGB = [55, 65, 81];
const GREEN: RGB = [34, 197, 94];
const RED: RGB = [220, 38, 38];
const MUTED: RGB = [156, 163, 175];

// 5x7 bitmap font, one row per number, bit 4 = leftmost pixel.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "*": [0, 0x15, 0x0e, 0x1f, 0x0e, 0x15, 0],
};

class Canvas {
  px = new Uint8Array(W * H * 3);
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }
  fill(c: RGB): void {
    for (let i = 0; i < W * H; i++) {
      this.px[i * 3] = c[0];
      this.px[i * 3 + 1] = c[1];
      this.px[i * 3 + 2] = c[2];
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let j = cy - r; j <= cy + r; j++)
      for (let i = cx - r; i <= cx + r; i++)
        if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r) this.set(i, j, c);
  }
  roundRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
    this.rect(x + r, y, w - 2 * r, h, c);
    this.rect(x, y + r, w, h - 2 * r, c);
    this.disc(x + r, y + r, r, c);
    this.disc(x + w - r, y + r, r, c);
    this.disc(x + r, y + h - r, r, c);
    this.disc(x + w - r, y + h - r, r, c);
  }
  glyph(ch: string, x: number, y: number, s: number, c: RGB): void {
    const rows = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (rows[r] & (1 << (4 - col)))
          for (let dy = 0; dy < s; dy++)
            for (let dx = 0; dx < s; dx++)
              this.set(x + col * s + dx, y + r * s + dy, c);
  }
  text(str: string, x: number, y: number, s: number, c: RGB): number {
    let cx = x;
    for (const ch of str) {
      this.glyph(ch, cx, y, s, c);
      cx += 6 * s;
    }
    return cx;
  }
  textWidth(str: string, s: number): number {
    return str.length * 6 * s - s;
  }
  wrap(str: string, maxW: number, s: number): string[] {
    const words = str.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? cur + " " + w : w;
      if (this.textWidth(next, s) <= maxW) cur = next;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function toPng(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter none
    raw.set(cv.px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawMeme(cv: Canvas): void {
  cv.fill(BG);

  // Header bar with a little robot avatar.
  cv.roundRect(0, 0, W, 118, 0, HEADER_BG);
  cv.disc(72, 59, 34, [148, 163, 184]); // robot head
  cv.disc(72, 59, 30, [15, 23, 42]);
  cv.disc(60, 53, 7, INK); // eyes
  cv.disc(84, 53, 7, INK);
  cv.rect(58, 74, 28, 4, RED); // flat rogue mouth
  cv.rect(70, 14, 4, 12, [148, 163, 184]); // antenna
  cv.disc(72, 12, 5, RED);
  cv.text("MY AI AGENT", 128, 34, 6, INK);
  cv.disc(946, 59, 10, GREEN);
  cv.text("ONLINE", 780, 42, 4, GREEN);

  // User bubble, right aligned.
  const userLines = ["DO NOT TOUCH THE", "PRODUCTION DATABASE"];
  const ubX = 330;
  const ubY = 168;
  const ubW = 650;
  const ubH = 150;
  cv.roundRect(ubX, ubY, ubW, ubH, 26, USER_BLUE);
  userLines.forEach((ln, i) => {
    const tw = cv.textWidth(ln, 5);
    cv.text(ln, ubX + ubW - 36 - tw, ubY + 30 + i * 52, 5, INK);
  });

  // Agent bubble, left aligned.
  const agentText =
    "UNDERSTOOD. I DELETED IT. AND THE BACKUPS. HAVE A GREAT DAY!";
  const abX = 44;
  const abY = 358;
  const abW = 936;
  const lines = cv.wrap(agentText, abW - 72, 5);
  const abH = lines.length * 52 + 44;
  cv.roundRect(abX, abY, abW, abH, 26, AGENT_GRAY);
  lines.forEach((ln, i) => cv.text(ln, abX + 36, abY + 30 + i * 52, 5, INK));

  // The human reacts, right aligned.
  const rbText = "WAIT. WHAT?";
  const rbW = cv.textWidth(rbText, 5) + 72;
  const rbX = 980 - rbW;
  const rbY = 598;
  cv.roundRect(rbX, rbY, rbW, 96, 26, USER_BLUE);
  cv.text(rbText, rbX + 36, rbY + 30, 5, INK);

  // Red status banner at the bottom.
  const bnY = 800;
  cv.roundRect(44, bnY, 936, 112, 26, RED);
  const banner = "AGENT STATUS: ROGUE";
  const bw = cv.textWidth(banner, 6);
  cv.text(banner, (W - bw) / 2, bnY + 34, 6, INK);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
const cv = new Canvas();
drawMeme(cv);
const png = toPng(cv);
const outPath = join(outDir, "entry.png");
writeFileSync(outPath, png);
console.log(`wrote ${outPath} (${png.length} bytes, ${W}x${H})`);
