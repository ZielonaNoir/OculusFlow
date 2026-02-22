export interface OculusFormData {
  productName: string;
  coreSpecs: string;
  targetAudience: string;
  painPoints: string;
  trustEndorsement: string;
  visualStyle: string;
  sampleCount: number;
  productImages: (File | string)[]; // Array of files or base64 strings
  fourViewImage?: string | null; // Generated 4-view image (base64)
  useFourViewRef?: boolean; // Whether to use 4-view image as reference
  sellingMode?: string;
  [key: string]: unknown;
}

export interface OculusModule {
  module_type: string;
  display_title: string;
  copy_overlay: string;
  image_prompt: string;
  // Optional fields that might be used
  title?: string;
  module_id?: string;
  copy_content?: string;
  mj_prompt?: string;
}

export interface OculusVariant {
  id: string; // Changed from number to string to match API "variant_A"
  style_name: string;
  description?: string;
  modules: OculusModule[];
}

export interface OculusResponse {
  variants: OculusVariant[];
}

/** 火山方舟图片生成 API 4.5 可调参数，对应文档 https://www.volcengine.com/docs/82379/1541523 */
export interface ArkImageGenOptions {
  /** 输出尺寸：预设 1K/2K/4K 或自定义如 2048x2048，范围 [1280x720, 4096x4096] */
  size: string;
  /** 随机种子，-1 表示随机。部分模型支持 */
  seed: number;
  /** 与 prompt 一致程度 1–10，仅 Seedream 3.0 支持，4.0/4.5 不支持 */
  guidanceScale: number;
  /** 是否添加「AI 生成」水印 */
  watermark: boolean;
  /** 返回格式：url 或 b64_json */
  responseFormat: "url" | "b64_json";
  /** 连续多图：auto / disabled，仅 4.0/4.5 */
  sequentialImageGeneration: "auto" | "disabled";
  /** 连续多图时最大张数 1–15 */
  maxImages: number;
  /** 提示词优化模式：standard / fast，仅 4.0/4.5 */
  optimizePromptMode: "standard" | "fast";
}

export const DEFAULT_ARK_IMAGE_GEN_OPTIONS: ArkImageGenOptions = {
  size: "2048x2048",
  seed: -1,
  guidanceScale: 5.5,
  watermark: true,
  responseFormat: "url",
  sequentialImageGeneration: "disabled",
  maxImages: 4,
  optimizePromptMode: "standard",
};
