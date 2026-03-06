/**
 * 图片精修（火山图生图/文生图）选项与 size 计算
 * 用于将清晰度 + 比例映射为火山方舟 API 的 size（宽x高）
 */

export const ASPECT_RATIO_OPTIONS = [
  { value: "1:1", label: "1:1 正方形" },
  { value: "2:3", label: "2:3 竖版" },
  { value: "3:2", label: "3:2 横版" },
  { value: "3:4", label: "3:4 竖版" },
  { value: "4:3", label: "4:3 横版" },
  { value: "4:5", label: "4:5 竖版" },
  { value: "5:4", label: "5:4 横版" },
  { value: "9:16", label: "9:16 手机竖屏" },
  { value: "16:9", label: "16:9 宽屏" },
  { value: "21:9", label: "21:9 超宽屏" },
] as const;

export const CLARITY_OPTIONS = [
  { value: "0.5K", label: "0.5K 快速" },
  { value: "1K", label: "1K 标准" },
  { value: "2K", label: "2K 高清" },
  { value: "4K", label: "4K 超清" },
] as const;

const CLARITY_TO_PX: Record<string, number> = {
  "0.5K": 512,
  "1K": 1024,
  "2K": 2048,
  "4K": 4096,
};

/** 火山方舟图片 API：总像素上限（宽×高） */
const MAX_PIXELS = 10404496;

function roundToMultiple(n: number, step: number): number {
  return Math.floor(n / step) * step;
}

/**
 * 根据清晰度与比例计算火山方舟 API 的 size 字符串（宽x高）。
 * 以短边为基准按比例计算，取整到 64 的倍数，且总像素不超过 MAX_PIXELS。
 */
export function getSizeFromOptions(
  clarity: string,
  aspectRatio: string
): string {
  const shortEdgePx = CLARITY_TO_PX[clarity] ?? 2048;
  const parts = aspectRatio.split(":").map(Number);
  const w = parts[0] ?? 1;
  const h = parts[1] ?? 1;
  if (w <= 0 || h <= 0) return "2048x2048";

  const isPortrait = w < h;
  let width: number;
  let height: number;
  if (isPortrait) {
    width = shortEdgePx;
    height = Math.round((shortEdgePx * h) / w);
  } else {
    height = shortEdgePx;
    width = Math.round((shortEdgePx * w) / h);
  }

  width = roundToMultiple(width, 64);
  height = roundToMultiple(height, 64);
  if (width < 64) width = 64;
  if (height < 64) height = 64;

  let pixels = width * height;
  if (pixels > MAX_PIXELS) {
    const scale = Math.sqrt(MAX_PIXELS / pixels);
    width = roundToMultiple(Math.floor(width * scale), 64);
    height = roundToMultiple(Math.floor(height * scale), 64);
    if (width < 64) width = 64;
    if (height < 64) height = 64;
    pixels = width * height;
    if (pixels > MAX_PIXELS) {
      if (width >= height) width = roundToMultiple(Math.floor(width * (MAX_PIXELS / pixels)), 64);
      else height = roundToMultiple(Math.floor(height * (MAX_PIXELS / pixels)), 64);
      if (width < 64) width = 64;
      if (height < 64) height = 64;
    }
  }

  return `${width}x${height}`;
}
