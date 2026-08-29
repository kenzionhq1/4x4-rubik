/**
 * Color Detection and HSV Classification Utilities
 * Converts RGB samples into HSV color space and performs robust hue-based classification.
 */

import { CubeColor, StickerState } from '../types';

export interface HSV {
  h: number; // 0 - 360
  s: number; // 0 - 1
  v: number; // 0 - 1
}

/**
 * Converts standard RGB (0-255) to HSV
 */
export function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  if (diff === 0) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / diff) % 6;
  } else if (max === g) {
    h = (b - r) / diff + 2;
  } else {
    h = (r - g) / diff + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : diff / max;
  const v = max;

  return { h, s, v };
}

/**
 * Calculates shortest circular angular distance between two angles (0-360)
 */
function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Classifies an RGB sample into one of the 6 Rubik's cube colors using HSV metrics.
 */
export function classifyColor(r: number, g: number, b: number): { color: CubeColor; uncertain: boolean; confidence: number } {
  const { h, s, v } = rgbToHsv(r, g, b);

  // 1. White Detection (Low saturation and moderate/high brightness)
  // Glare can increase V and wash out colors, but white has uniformly low S
  if (s < 0.22 && v > 0.45) {
    const whiteConfidence = Math.max(0, 1 - (s / 0.22) * 0.5);
    return { color: 'W', uncertain: false, confidence: whiteConfidence };
  }
  if (s < 0.28 && v > 0.65) {
    // Borderline white under slight warm lighting
    return { color: 'W', uncertain: s > 0.22, confidence: 0.6 };
  }

  // Very dark shadow / dark glare check
  if (v < 0.18) {
    return { color: 'B', uncertain: true, confidence: 0.2 };
  }

  // 2. Hue-based Color Classification:
  // Red: ~350 - 15 (wraps around 0)
  // Orange: ~16 - 42
  // Yellow: ~43 - 72
  // Green: ~75 - 165
  // Blue: ~175 - 260

  // Check Yellow
  if (h >= 43 && h <= 72 && s >= 0.25) {
    const dist = Math.abs(h - 55);
    const uncertain = dist > 14 || s < 0.35 || v < 0.35;
    const confidence = Math.max(0.2, 1 - dist / 20);
    return { color: 'Y', uncertain, confidence };
  }

  // Check Orange
  if (h >= 14 && h < 43 && s >= 0.35) {
    const dist = Math.abs(h - 26);
    const uncertain = dist > 12 || s < 0.42;
    const confidence = Math.max(0.2, 1 - dist / 20);
    return { color: 'O', uncertain, confidence };
  }

  // Check Red (wraps around 0)
  const isRedHue = (h >= 345 && h <= 360) || (h >= 0 && h < 14);
  if (isRedHue && s >= 0.35) {
    const dist = hueDistance(h, 0);
    const uncertain = dist > 12 || s < 0.42;
    const confidence = Math.max(0.2, 1 - dist / 20);
    return { color: 'R', uncertain, confidence };
  }

  // Check Green
  if (h >= 73 && h <= 165 && s >= 0.25) {
    const dist = Math.abs(h - 125);
    const uncertain = dist > 35 || s < 0.32;
    const confidence = Math.max(0.2, 1 - dist / 45);
    return { color: 'G', uncertain, confidence };
  }

  // Check Blue
  if (h > 165 && h < 280 && s >= 0.25) {
    const dist = Math.abs(h - 215);
    const uncertain = dist > 40 || s < 0.32;
    const confidence = Math.max(0.2, 1 - dist / 45);
    return { color: 'B', uncertain, confidence };
  }

  // Fallback to closest canonical hue
  const targets: { color: CubeColor; hue: number }[] = [
    { color: 'R', hue: 0 },
    { color: 'O', hue: 25 },
    { color: 'Y', hue: 55 },
    { color: 'G', hue: 125 },
    { color: 'B', hue: 215 },
  ];

  let bestColor: CubeColor = 'W';
  let minDiff = 999;

  for (const t of targets) {
    const d = hueDistance(h, t.hue);
    if (d < minDiff) {
      minDiff = d;
      bestColor = t.color;
    }
  }

  return {
    color: bestColor,
    uncertain: true,
    confidence: Math.max(0.1, 1 - minDiff / 60),
  };
}

/**
 * Samples a 5x5 patch around given pixel coordinate in canvas to smooth out noise
 */
export function samplePixelPatch(ctx: CanvasRenderingContext2D, px: number, py: number, patchRadius = 2): [number, number, number] {
  const x0 = Math.max(0, Math.floor(px - patchRadius));
  const y0 = Math.max(0, Math.floor(py - patchRadius));
  const size = patchRadius * 2 + 1;

  try {
    const imgData = ctx.getImageData(x0, y0, size, size);
    const data = imgData.data;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      count++;
    }

    if (count === 0) return [128, 128, 128];
    return [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)];
  } catch {
    return [128, 128, 128];
  }
}

/**
 * Calculates the median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Aggregates 16-cell sticker color samples across multiple video frames
 * Discards transient glare / reflection anomalies and performs temporal median HSV classification.
 */
export function aggregateTemporalColorSamples(
  framesColorSamples: Array<Array<{ r: number; g: number; b: number }>>
): StickerState[] {
  if (framesColorSamples.length === 0) return [];
  const numStickers = 16;
  const result: StickerState[] = [];

  for (let sIdx = 0; sIdx < numStickers; sIdx++) {
    const rawSamples: Array<{ r: number; g: number; b: number; hsv: HSV }> = [];

    for (let fIdx = 0; fIdx < framesColorSamples.length; fIdx++) {
      const sample = framesColorSamples[fIdx]?.[sIdx];
      if (sample) {
        rawSamples.push({
          ...sample,
          hsv: rgbToHsv(sample.r, sample.g, sample.b),
        });
      }
    }

    if (rawSamples.length === 0) {
      result.push({
        color: 'W',
        uncertain: true,
        confidence: 0.1,
        rawRgb: [128, 128, 128],
      });
      continue;
    }

    // Filter out specular glare outliers if majority of frames show color saturation
    const saturatedSamples = rawSamples.filter((s) => s.hsv.s > 0.25);
    const validSamples =
      saturatedSamples.length >= Math.ceil(rawSamples.length * 0.4)
        ? rawSamples.filter((s) => !(s.hsv.v > 0.92 && s.hsv.s < 0.18))
        : rawSamples;

    const finalSamples = validSamples.length > 0 ? validSamples : rawSamples;

    const medR = median(finalSamples.map((s) => s.r));
    const medG = median(finalSamples.map((s) => s.g));
    const medB = median(finalSamples.map((s) => s.b));

    const { color, uncertain, confidence } = classifyColor(medR, medG, medB);

    // Measure variance across frames to enhance confidence
    const classifications = rawSamples.map((s) => classifyColor(s.r, s.g, s.b).color);
    const agreementCount = classifications.filter((c) => c === color).length;
    const agreementRatio = agreementCount / classifications.length;

    const boostedConfidence = Math.min(1.0, confidence * 0.7 + agreementRatio * 0.3);
    const isStillUncertain = uncertain && agreementRatio < 0.7;

    result.push({
      color,
      uncertain: isStillUncertain,
      confidence: boostedConfidence,
      rawRgb: [medR, medG, medB],
    });
  }

  return result;
}

/**
 * Creates a temporal noise-reduced composite canvas from multiple captured video frames
 */
export function createTemporalCompositeCanvas(
  frameCanvases: HTMLCanvasElement[],
  width: number,
  height: number
): HTMLCanvasElement {
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = width;
  compositeCanvas.height = height;
  const ctx = compositeCanvas.getContext('2d');
  if (!ctx || frameCanvases.length === 0) return compositeCanvas;

  if (frameCanvases.length === 1) {
    ctx.drawImage(frameCanvases[0], 0, 0);
    return compositeCanvas;
  }

  // Fast multi-frame alpha-blend accumulator for full image frame
  ctx.clearRect(0, 0, width, height);
  const n = frameCanvases.length;

  for (let i = 0; i < n; i++) {
    // Cumulative rolling weight: 1/(i+1)
    ctx.globalAlpha = 1 / (i + 1);
    ctx.drawImage(frameCanvases[i], 0, 0);
  }
  ctx.globalAlpha = 1.0;

  return compositeCanvas;
}
