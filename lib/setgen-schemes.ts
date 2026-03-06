/**
 * 智能组图方案类型配置（单一数据源）
 *
 * 方案 → suffix 规范表：
 * | 方案         | suffix           |
 * | 白底精修图   | ，白底精修展示图 |
 * | 3D立体效果图 | ，3D立体效果图   |
 * | 细节特写图   | ，细节特写图     |
 * | 卖点图       | ，卖点展示图     |
 *
 * 拼 prompt 时使用 promptInstruction（完整指令）优先，无则用 suffix。
 */

export interface Scheme {
  id: string;
  title: string;
  desc: string;
  icon: string;
  suffix: string;
  promptInstruction: string;
}

export const SCHEME_TYPES: Scheme[] = [
  {
    id: "white-retouch",
    title: "白底精修图",
    desc: "纯白背景的产品精修展示图",
    icon: "lucide:sparkles",
    suffix: "，白底精修展示图",
    promptInstruction:
      "，白底精修展示图。纯白背景，产品主体清晰无杂物，无重影，适合电商主图。",
  },
  {
    id: "3d",
    title: "3D立体效果图",
    desc: "具有立体感和层次感的产品展示",
    icon: "lucide:box",
    suffix: "，3D立体效果图",
    promptInstruction:
      "，3D立体效果图。强调立体感与层次，光影分明，适合产品展示。",
  },
  {
    id: "detail",
    title: "细节特写图",
    desc: "展示产品细节和材质的特写图",
    icon: "lucide:zoom-in",
    suffix: "，细节特写图",
    promptInstruction: "，细节特写图。突出材质与局部细节，清晰锐利。",
  },
  {
    id: "selling",
    title: "卖点图",
    desc: "突出产品核心卖点的营销展示图",
    icon: "lucide:megaphone",
    suffix: "，卖点展示图",
    promptInstruction: "，卖点展示图。突出核心卖点，适合营销与详情页。",
  },
];

export type SchemeId = Scheme["id"];

export function getSchemeById(id: string): Scheme | undefined {
  return SCHEME_TYPES.find((s) => s.id === id);
}
