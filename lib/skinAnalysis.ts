/**
 * Client-side skin analysis from image pixel data.
 * Redness: R/G ratio over skin pixels (EQscore-style, melanin-insensitive).
 * Shine: high luminance + low saturation regions.
 * Dryness: local luminance variance (texture proxy for flaking).
 */

export type SkinAnalysisResult = {
  rednessIndex: number;
  shineMapImageData: ImageData | null;
  drynessRegions: { x: number; y: number; intensity: number }[];
  suggestedFlakingSeverity: 0 | 1 | 2 | 3;
};

// HSV bounds for skin (wider range for different skin types)
const SKIN_HSV_H_MIN = 0;
const SKIN_HSV_H_MAX = 33;
const SKIN_HSV_S_MIN = 58;
const SKIN_HSV_V_MIN = 30;

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
}

function isSkinPixel(r: number, g: number, b: number): boolean {
  const { h, s, v } = rgbToHsv(r, g, b);
  if (h < SKIN_HSV_H_MIN || h > SKIN_HSV_H_MAX) return false;
  if (s < SKIN_HSV_S_MIN) return false;
  if (v < SKIN_HSV_V_MIN) return false;
  return true;
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Redness index 0–100 from within-image spread of R/G (redder vs less-red areas).
 * EQscore-style: comparing affected vs normal in same image; spread is robust to lighting.
 */
function computeRedness(data: ImageData): number {
  const ratios: number[] = [];
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    if (!isSkinPixel(r, g, b)) continue;
    if (g < 1) continue;
    ratios.push(r / g);
  }
  if (ratios.length < 50) return 0;
  ratios.sort((a, b) => a - b);
  const p25 = ratios[Math.floor(ratios.length * 0.25)] ?? ratios[0];
  const p90 = ratios[Math.floor(ratios.length * 0.9)] ?? ratios[ratios.length - 1];
  const spread = p90 - p25;
  // Map spread to 0–100: ~0.08 normal, ~0.2–0.4 inflamed (tune divisor if needed)
  const SPREAD_FOR_FULL = 0.4;
  const raw = (spread / SPREAD_FOR_FULL) * 100;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

/**
 * Shine map: pixels with high luminance and low saturation (specular highlights).
 * Returns new ImageData with alpha set to intensity of shine (0–255) in alpha channel.
 */
function computeShineMap(data: ImageData): ImageData {
  const out = new ImageData(data.width, data.height);
  const { width, height } = data;
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
    if (!isSkinPixel(r, g, b)) {
      out.data[i + 3] = 0;
      continue;
    }
    const L = luminance(r, g, b);
    const { s } = rgbToHsv(r, g, b);
    // Shine: bright and low saturation (specular highlights)
    const shine =
      L > 160 && s < 40
        ? Math.min(
            255,
            255 * ((L - 160) / 95) * (1 - s / 40),
          )
        : 0;
    out.data[i + 3] = Math.round(shine);
  }
  return out;
}

const PATCH_SIZE = 12;
const DRYNESS_VARIANCE_THRESHOLD = 18;
const MAX_DRYNESS_REGIONS = 40;

/**
 * Dryness/flaking: high local luminance variance in patches.
 * Returns list of patch centers with intensity (0–1) and suggested flaking 0–3.
 */
function computeDryness(
  data: ImageData,
): { regions: { x: number; y: number; intensity: number }[]; suggestedFlaking: 0 | 1 | 2 | 3 } {
  const { width, height } = data;
  const lum: number[] = [];
  for (let i = 0; i < data.data.length; i += 4) {
    lum.push(
      luminance(data.data[i], data.data[i + 1], data.data[i + 2]),
    );
  }
  const regions: { x: number; y: number; intensity: number }[] = [];
  for (let py = 0; py + PATCH_SIZE <= height; py += PATCH_SIZE) {
    for (let px = 0; px + PATCH_SIZE <= width; px += PATCH_SIZE) {
      const values: number[] = [];
      for (let dy = 0; dy < PATCH_SIZE; dy++) {
        for (let dx = 0; dx < PATCH_SIZE; dx++) {
          const idx = (py + dy) * width + (px + dx);
          if (isSkinPixel(data.data[idx * 4], data.data[idx * 4 + 1], data.data[idx * 4 + 2])) {
            values.push(lum[idx]);
          }
        }
      }
      if (values.length < PATCH_SIZE * PATCH_SIZE * 0.3) continue;
      const mean = values.reduce((a, x) => a + x, 0) / values.length;
      const variance =
        values.reduce((a, x) => a + (x - mean) ** 2, 0) / values.length;
      const std = Math.sqrt(variance);
      if (std >= DRYNESS_VARIANCE_THRESHOLD) {
        const intensity = Math.min(1, (std - DRYNESS_VARIANCE_THRESHOLD) / 30);
        regions.push({
          x: px + PATCH_SIZE / 2,
          y: py + PATCH_SIZE / 2,
          intensity,
        });
      }
    }
  }
  regions.sort((a, b) => b.intensity - a.intensity);
  const top = regions.slice(0, MAX_DRYNESS_REGIONS);
  const avgIntensity =
    top.length === 0 ? 0 : top.reduce((a, r) => a + r.intensity, 0) / top.length;
  let suggestedFlaking: 0 | 1 | 2 | 3 = 0;
  if (avgIntensity > 0.6 && top.length >= 8) suggestedFlaking = 3;
  else if (avgIntensity > 0.4 && top.length >= 4) suggestedFlaking = 2;
  else if (avgIntensity > 0.2 || top.length >= 2) suggestedFlaking = 1;
  return { regions: top, suggestedFlaking };
}

/**
 * Run full analysis on ImageData (e.g. from a canvas).
 */
export function analyzeSkin(imageData: ImageData): SkinAnalysisResult {
  const rednessIndex = computeRedness(imageData);
  const shineMapImageData = computeShineMap(imageData);
  const { regions: drynessRegions, suggestedFlaking: suggestedFlakingSeverity } =
    computeDryness(imageData);
  return {
    rednessIndex,
    shineMapImageData,
    drynessRegions,
    suggestedFlakingSeverity,
  };
}
