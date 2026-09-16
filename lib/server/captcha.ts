// ============================================================
// CAPTCHA auto-solver for the AU portal (server-only)
//
// The AU login captcha is a noisy, color-distorted alphanumeric PNG
// with thick connected shapes. Strategy: preprocess the image into
// several variants (grayscale, Otsu binary, 2x upscale, inverted),
// OCR each with tesseract.js, and keep the highest-confidence answer.
// Retrying with a fresh captcha is handled by the caller.
// ============================================================

import { PNG } from "pngjs";
import { createWorker, type Worker } from "tesseract.js";

const WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export interface CaptchaResult {
  text: string | null;
  confidence: number;
  variant: string;
}

let worker: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!worker) {
    worker = await createWorker("eng", 1, { logger: () => {} });
    await worker.setParameters({
      tessedit_char_whitelist: WHITELIST,
      preserve_interword_spaces: "0",
    });
  }
  return worker;
}

// ------------------------------------------------------------------
// Pure pixel helpers (pngjs)
// ------------------------------------------------------------------

function toGrayscale(buffer: Buffer): Buffer {
  const png = PNG.sync.read(buffer);
  const out = new PNG({ width: png.width, height: png.height });
  for (let i = 0; i < png.width * png.height; i++) {
    const r = png.data[i * 4];
    const g = png.data[i * 4 + 1];
    const b = png.data[i * 4 + 2];
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    out.data[i * 4] = lum;
    out.data[i * 4 + 1] = lum;
    out.data[i * 4 + 2] = lum;
    out.data[i * 4 + 3] = 255;
  }
  return PNG.sync.write(out);
}

/** Otsu threshold → black-and-white image (dark pixels = text). */
function toOtsuBinary(buffer: Buffer): Buffer {
  const png = PNG.sync.read(buffer);
  const { width, height, data } = png;
  const total = width * height;
  const hist = new Int32Array(256);
  for (let i = 0; i < total; i++) hist[data[i * 4]]++;

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let maxBetween = -1;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxBetween) {
      maxBetween = between;
      threshold = t;
    }
  }

  const out = new PNG({ width, height });
  for (let i = 0; i < total; i++) {
    const lum = data[i * 4];
    const v = lum >= threshold ? 255 : 0;
    out.data[i * 4] = v;
    out.data[i * 4 + 1] = v;
    out.data[i * 4 + 2] = v;
    out.data[i * 4 + 3] = 255;
  }
  return PNG.sync.write(out);
}

function upscale2x(buffer: Buffer): Buffer {
  const src = PNG.sync.read(buffer);
  const out = new PNG({ width: src.width * 2, height: src.height * 2 });
  for (let y = 0; y < src.height * 2; y++) {
    for (let x = 0; x < src.width * 2; x++) {
      const si = (Math.floor(y / 2) * src.width + Math.floor(x / 2)) * 4;
      const di = (y * src.width * 2 + x) * 4;
      for (let c = 0; c < 4; c++) out.data[di + c] = src.data[si + c];
    }
  }
  return PNG.sync.write(out);
}

function invert(buffer: Buffer): Buffer {
  const png = PNG.sync.read(buffer);
  for (let i = 0; i < png.width * png.height; i++) {
    png.data[i * 4] = 255 - png.data[i * 4];
    png.data[i * 4 + 1] = 255 - png.data[i * 4 + 1];
    png.data[i * 4 + 2] = 255 - png.data[i * 4 + 2];
  }
  return PNG.sync.write(png);
}

function sanitize(text: string): string {
  return text.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

// ------------------------------------------------------------------
// Solve
// ------------------------------------------------------------------

export async function solveCaptcha(
  imageBuffer: Buffer
): Promise<CaptchaResult> {
  const gray = toGrayscale(imageBuffer);
  const otsu = toOtsuBinary(gray);
  const variants: { name: string; buffer: Buffer }[] = [
    { name: "raw", buffer: imageBuffer },
    { name: "gray", buffer: gray },
    { name: "otsu", buffer: otsu },
    { name: "otsu2x", buffer: upscale2x(otsu) },
    { name: "gray2x", buffer: upscale2x(gray) },
    { name: "invert-otsu2x", buffer: invert(upscale2x(otsu)) },
  ];

  const w = await getWorker();
  let best: CaptchaResult = { text: null, confidence: -1, variant: "" };
  const candidates: { text: string; confidence: number }[] = [];

  for (const v of variants) {
    try {
      const { data } = await w.recognize(v.buffer);
      const text = sanitize(data.text);
      const confidence = Number(data.confidence ?? 0);
      if (!text) continue;
      candidates.push({ text, confidence });
      // Bias toward the typical captcha length (4-6 chars)
      const lengthBonus = text.length >= 4 && text.length <= 6 ? 15 : 0;
      const score = confidence + lengthBonus;
      if (score > best.confidence) {
        best = { text, confidence: score, variant: v.name };
      }
    } catch (err) {
      console.warn("[Captcha] variant failed:", v.name, String(err).slice(0, 120));
    }
  }

  // Majority vote among confident candidates as an extra sanity check.
  if (candidates.length > 1) {
    const byText: Record<string, { count: number; conf: number }> = {};
    for (const c of candidates) {
      const entry = byText[c.text] ?? { count: 0, conf: 0 };
      entry.count++;
      entry.conf = Math.max(entry.conf, c.confidence);
      byText[c.text] = entry;
    }
    let top: { text: string; count: number; conf: number } | null = null;
    for (const text of Object.keys(byText)) {
      const e = byText[text];
      if (!top || e.count > top.count) top = { text, ...e };
    }
    if (top && top.count >= 2) {
      return { text: top.text, confidence: top.conf, variant: "vote" };
    }
  }

  return best;
}

export async function destroyCaptchaWorker(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}