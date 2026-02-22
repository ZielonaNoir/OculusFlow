这份 PRD (产品需求文档) 是为 **Antigravity** 团队准备的，旨在构建一个**“京东电商详情页 AI 生成工作流组件”**。

该文档定义了数据结构、交互逻辑、LLM 系统提示词（System Prompt）以及用于生成图片的详细模版。

---

# PRD: 京东详情页 AI 生成器 (JD Detail Page AI-Generator)

## 1. 项目概述

构建一个基于 LLM 的前端组件，用户输入产品基础信息后，通过 5秒无操作自动触发，生成 3 套不同风格（权威型、共鸣型、性价比型）的详情页策划方案。方案包含：文案、营销卖点、以及对应的 AI 绘画提示词 (Prompt)，最终可串联生成一张完整的电商长图。

---

## 2. 核心交互逻辑 (UI/UX Logic)

* **布局：** 左右分栏。左侧为**「信息录入表单」**，右侧为**「AI 方案预览区」**。
* **触发机制 (Debounce):** 监听左侧表单变化，**5秒无操作** (Idle Time > 5000ms) 后自动触发 LLM 请求。
* **加载状态：** 请求期间右侧显示 Skeleton (骨架屏) 动画，提示“正在拆解爆款逻辑...”。
* **样板控制：** 左侧设有滑块 `sample_count` (范围 1-3)，控制右侧生成的方案数量。
* **回填机制：** 点击右侧任意一套方案的“应用”按钮，该方案的结构化数据（文案+Prompt）将被锁定，用于后续的图片生成步骤。

---

## 3. 数据结构 (Schema)

### 3.1 左侧表单字段 (Form Inputs)

*用于收集产品的原始物理属性和营销素材。*

| 字段 Key | 类型 | 标签名 | 占位符示例 | 必填 |
| --- | --- | --- | --- | --- |
| `product_name` | String | 产品名称 | 京东京造男士复合维生素 | 是 |
| `core_specs` | Textarea | 核心规格 | 180片/瓶，含19种营养素，男士定制，蓝帽认证 | 是 |
| `target_audience` | String | 目标人群 | 经常加班、饮食不规律、缺乏运动的成年男性 | 是 |
| `pain_points` | Textarea | 用户痛点 | 精力差、易疲劳、脸色不好、抵抗力差 | 是 |
| `trust_endorsement` | Textarea | 信任背书 | 京东金榜TOP1，累计评价100万+，热销9000万片 | 否 |
| `selling_mode` | String | 促销模式 | 满2件9折，京东物流次日达 | 否 |
| `visual_style` | Select | 视觉风格 | 科技蓝金 / 极简医疗 / 活力橙色 (默认：科技蓝金) | 是 |

### 3.2 右侧 LLM 输出结构 (JSON Output)

*LLM 返回的 JSON 数据，用于渲染右侧卡片。*

```json
{
  "variants": [
    {
      "id": "variant_A",
      "style_name": "权威背书型",
      "main_copy": "京东金榜TOP1，百万男士的选择",
      "modules": [
        {
          "module_type": "hero_section",
          "content_text": "累计评价100万+...",
          "image_prompt": "Hyper-realistic C4D render..."
        },
        // ...更多模块
      ]
    }
  ]
}

```

---

## 4. LLM 系统提示词 (System Prompt)

这是核心的大脑，负责将零散的表单信息转化为结构化的视觉策划。

```markdown
# Role
你是一个资深的京东电商详情页策划专家，擅长通过视觉动线和营销心理学打造高转化率的“爆款详情页”。

# Task
基于用户输入的【产品信息】，生成 {sample_count} 套不同侧重点的详情页策划方案。

# Output Format
必须返回严格的 JSON 格式，不包含 markdown 标记。

# Constraints
1. **文案风格：** 必须符合京东（JD.com）的调性——急促、高利益点、权威感强、利用数字说话。
2. **关键词植入：** 自动提取输入信息中的 SEO 关键词（如：金榜、TOP1、黑科技）。
3. **视觉 Prompt：** 针对每个模块生成适配 Midjourney V6 或 Stable Diffusion 的英文 Prompt。

# JSON Structure Example
{
  "variants": [
    {
      "style_name": "Style Name (e.g., Authority/Empathy)",
      "modules": [
        {
          "name": "hero_section",
          "display_title": "首屏海报",
          "copy_overlay": "海报上显示的文案内容",
          "visual_desc": "中文视觉描述",
          "mj_prompt": "English prompt for image generation..."
        }
        // ... Generate 5-8 key modules per variant
      ]
    }
  ]
}

```

---

## 5. 模块化模板与 Prompt 映射 (Template String Mapping)

以下是详情页 8 大核心模块的生成逻辑。LLM 在生成 JSON 时，需参考以下模板填充内容。

### 模块 1：首屏海报 (Hero Section)

* **功能：** 建立信任，展示最高荣誉。
* **文案模板 (Template String):**
> `{product_name}`
> `{trust_endorsement} (提取TOP1/销量等)`
> 利益点：`{core_specs}`


* **Prompt 模板结构:**
> **(Subject)** Premium product photography of `{product_name}` bottle, centered. **(Props)** A massive golden trophy with "TOP1" badge next to it. **(Background)** High-end `{visual_style}` gradient background, floating 3D golden text indicating "{sales_numbers}". **(Lighting/Style)** Cinematic lighting, C4D render style, 8k resolution, commercial photography, JD.com style.



### 模块 2：痛点场景 (Pain Points - The Hook)

* **功能：** 唤醒需求，黑白滤镜制造焦虑感。
* **文案模板 (Template String):**
> 场景1：`{pain_point_1}`
> 场景2：`{pain_point_2}`
> 场景3：`{pain_point_3}`
> 场景4：`{pain_point_4}`


* **Prompt 模板结构:**
> **(Subject)** A 4-panel split screen grid. **(Content)** Panel 1: `{pain_point_1_visual}`. Panel 2: `{pain_point_2_visual}`. Panel 3: `{pain_point_3_visual}`. Panel 4: `{pain_point_4_visual}`. **(Style)** Black and white photography, high contrast, desaturated, grainy film look, conveying stress and fatigue, dramatic shadows.



### 模块 3：解决方案 (The Solution)

* **功能：** 产品登场，展示核心效能。
* **文案模板 (Template String):**
> `{core_specs_summary}` 只需1片
> 每天1片，补你可能缺的营养


* **Prompt 模板结构:**
> **(Subject)** Low angle shot of `{product_name}` bottle standing on a glowing podium. **(Effects)** Surrounded by dynamic swirling energy fields in `{visual_style}` colors, containing glowing molecular structures. **(Background)** A large, translucent number "1" or "19" (depending on specs) in the background. **(Style)** Tech-medical style, clean, futuristic, vibrant, 8k.



### 模块 4：成分可视化 (Ingredients Info)

* **功能：** 用实物对比展示含量。
* **文案模板 (Template String):**
> 营养足量补充
> `{ingredient_1}` ≈ `{food_equivalent_1}`
> `{ingredient_2}` ≈ `{food_equivalent_2}`


* **Prompt 模板结构:**
> **(Subject)** An infographic layout. **(Composition)** A grid system. Left column: Icons of vitamins/nutrients. Middle: "≈" symbol. Right column: Realistic photography of `{food_equivalents}` (e.g., kiwis, steak, milk). **(Style)** Clean white background, studio lighting on food, high definition, minimalistic UI elements.



### 模块 5：科学原理 (Scientific Mechanism)

* **功能：** 解释产品如何生效。
* **文案模板 (Template String):**
> 科学配比 `{target_audience}` 的高能补充
> 针对：`{body_part_benefits}`


* **Prompt 模板结构:**
> **(Subject)** Medical illustration of a glowing blue silhouette of a `{target_audience_gender}` body. **(Action)** Running or active pose. **(Details)** Zoom-in bubbles pointing to specific organs (brain, heart, joints) showing `{ingredient_benefits_visuals}` (e.g., bone structure, neural networks). **(Style)** X-ray vision style, medical blue aesthetics, scientific accuracy, 3D render.



### 模块 6：工艺与体验 (Tech & Experience)

* **功能：** 消除吞咽困难疑虑，展示工艺。
* **文案模板 (Template String):**
> 先进包衣技术，锁住营养
> `{swallow_experience}` (如：吞服不卡喉)


* **Prompt 模板结构:**
> **(Subject)** Extreme macro close-up of a single tablet/pill. **(Detail)** Showing smooth, glossy coating textrue, partially cut open to reveal packed nutrients inside. **(Lighting)** Subsurface scattering, soft studio lighting. **(Style)** High-end pharmaceutical product photography.



### 模块 7：参数表 (Spec Table)

* **功能：** 结构化信息。
* **文案模板 (Template String):**
> 产品名称：`{product_name}`
> 规格：`{core_specs}`
> 适宜人群：`{target_audience}`


* **Prompt 模板结构:**
> **(Subject)** A clean, modern data table design. **(Colors)** Light `{visual_style}` background colors. **(Content)** Two columns, clearly legible text layout for product specifications. **(Style)** Corporate Memphis design or Clean UI style, high resolution.



### 模块 8：页尾保障 (Footer)

* **功能：** 临门一脚的信任。
* **文案模板 (Template String):**
> 京东承诺：`{selling_mode}`
> 正品行货，售后无忧


* **Prompt 模板结构:**
> **(Subject)** Footer banner design. **(Elements)** Icons for "Authenticity Guarantee", "Fast Shipping", "7-Day Return". **(Branding)** JD.com red and white color scheme, official looking layout, clean icons.



---

## 6. 开发实施步骤 (Implementation Checklist for Antigravity)

1. **构建表单 (Form Builder):** 使用 React/Vue 构建上述 3.1 中的表单。
2. **状态管理 (State):** 实现 `useDebounce` hook，设置 delay 为 5000ms。
3. **Prompt 注入:** 将 3.1 的表单数据 注入到 4.0 的 System Prompt 中。
4. **LLM 接口:** 调用 LLM API (GPT-4o 或 Claude 3.5)，获取 JSON 响应。
5. **渲染预览:** 将 JSON 里的 `modules` 渲染为右侧的可视化卡片列表。
6. **后续对接:** 此 PRD 产出的 JSON 将直接作为输入，发送给 Stable Diffusion / Midjourney API 批量生成图片。



这个名字非常有深度，**"Oculus" (全视之眼)** 象征着 AI 对爆款逻辑的深度洞察，**"Flow" (流)** 代表着无缝的自动化工作流。这与 **Antigravity** 的极客调性完美契合。

下面是为您定制的 **Oculus Flow · 全视之流** 开发文档。这份文档包含了**前端表单 Schema**、**LLM System Prompt** 以及**8大核心模块的图文生成模版**，您可以直接交付给开发团队。

---

# 👁️ Oculus Flow Project Specification

**Project Name:** Oculus Flow (全视之流)
**Version:** 1.0.0
**Target Platform:** Antigravity Component
**Core Function:** 京东详情页自动化拆解与生成引擎

---

## 1. Input Schema (前端表单结构)

这是左侧输入区的字段定义，用于收集原始信息。请在前端实现为响应式表单，并绑定 `onChange` 事件以触发 5s Debounce。

```typescript
// Type Definition for Input Form
interface OculusInputForm {
  // --- 基础信息 ---
  productName: string;       // 产品名称 (e.g., 京东京造男士复合维生素)
  coreSpecs: string;         // 核心规格 (e.g., 180片, 19种营养, 蓝帽认证)
  targetAudience: string;    // 目标人群 (e.g., 加班熬夜、缺乏运动的男性)
  
  // --- 营销语境 ---
  painPoints: string;        // 用户痛点 (e.g., 精力差、易疲劳、亚健康)
  trustEndorsement: string;  // 信任背书 (e.g., 京东金榜TOP1, 累计评价100W+)
  sellingPoints: string;     // 核心卖点 (e.g., 每天1片补全营养, 吞服不卡喉)
  
  // --- 视觉控制 ---
  visualStyle: 'Tech_Blue' | 'Medical_Clean' | 'Vitality_Orange'; // 视觉风格
  sampleCount: number;       // 滑块控制 (1-3), 决定生成方案数量
}

```

---

## 2. LLM System Prompt (核心指令)

这是 Oculus Flow 的大脑。请将其配置为 LLM (如 GPT-4o / Claude 3.5) 的 `system` 角色内容。

```markdown
# Role: Oculus Flow Intelligence
You are the core engine of "Oculus Flow", an AI system designed to generate high-conversion e-commerce detail pages for JD.com (Jingdong).

# Objective
Analyze the user's raw product data and generate structured content for 8 specific visual modules. You must output {sample_count} distinct variants.

# Visual Styles Library
- **Tech_Blue:** Deep blue gradients, glowing particles, metallic textures, futuristic fonts.
- **Medical_Clean:** White/Light blue background, laboratory aesthetics, minimalist, clinical precision.
- **Vitality_Orange:** Bright orange/yellow accents, dynamic lighting, energetic, high saturation.

# Output Rules
1. **JSON Only:** Return strictly valid JSON.
2. **JD.com Tone:** Copywriting must be punchy, benefit-driven, and authoritative (using numbers and strong verbs).
3. **Image Prompts:** Generate English prompts optimized for Midjourney V6, incorporating the specific visual style selected.

# JSON Response Structure
{
  "variants": [
    {
      "id": "variant_1",
      "theme_name": "Authority & Trust (权威背书版)",
      "modules": [
        {
          "module_id": "hero_section",
          "title": "首屏海报",
          "copy_content": "String containing the generated Chinese copy...",
          "image_prompt": "String containing the English Midjourney prompt..."
        }
        // ... Repeat for all 8 modules
      ]
    }
  ]
}

```

---

## 3. Module Templates (模版字符串与提示词逻辑)

以下是 **Oculus Flow** 生成 8 大模块的具体逻辑。开发人员需将此逻辑硬编码到 LLM 的 User Prompt 或作为 Few-Shot Examples 喂给模型。

### 🏷️ Module 1: The Hero (首屏海报)

* **文案模版 (Copy Template):**
> `[权威背书]` + `[产品名]`
> 核心利益点：`[核心规格]`
> 促销：`[促销模式/京东物流]`


* **绘图指令 (Prompt Logic):**
> **Subject:** Product bottle centered, slightly low angle.
> **Props:** Huge golden trophy with "TOP1" badge, floating golden numbers `[销量数据]`.
> **Background:** `[Visual Style]` gradient background with premium lighting.
> **Text Overlay:** (Do not render text in MJ, just describe the space for it).



### 🏷️ Module 2: The Hook (痛点唤醒)

* **文案模版 (Copy Template):**
> 场景一：`[痛点场景1描述]` - `[负面后果]`
> 场景二：`[痛点场景2描述]` - `[负面后果]`
> 场景三：`[痛点场景3描述]` - `[负面后果]`
> 场景四：`[痛点场景4描述]` - `[负面后果]`


* **绘图指令 (Prompt Logic):**
> **Composition:** 4-panel split screen grid.
> **Style:** Black and white photography, high contrast, grainy film look, desaturated.
> **Content:** > Panel 1: `[Scene 1 Visual]`.
> Panel 2: `[Scene 2 Visual]`.
> Panel 3: `[Scene 3 Visual]`.
> Panel 4: `[Scene 4 Visual]`.



### 🏷️ Module 3: The Solution (核心方案)

* **文案模版 (Copy Template):**
> `[核心卖点]` 只需1片
> 每天1片，`[解决核心痛点]`


* **绘图指令 (Prompt Logic):**
> **Subject:** Product bottle on a glowing pedestal.
> **Effect:** Surrounded by swirling energy field in `[Visual Style]` colors.
> **Details:** Glowing molecular structures floating around. A large translucent number "1" in the background.



### 🏷️ Module 4: Ingredients Visualized (成分实物化)

* **文案模版 (Copy Template):**
> 营养足量补充
> `[成分1]` ≈ `[等量食物1]`
> `[成分2]` ≈ `[等量食物2]`
> ... (List top 6 key ingredients)


* **绘图指令 (Prompt Logic):**
> **Type:** Infographic / Product photography composite.
> **Layout:** Grid system. Left side: Vitamin icons. Right side: High-quality realistic photos of `[Food Equivalents]`.
> **Background:** Clean white/light gray.



### 🏷️ Module 5: Mechanism (科学原理)

* **文案模版 (Copy Template):**
> 科学配比 `[目标人群]` 的高能补充
> 针对：`[身体部位收益]`


* **绘图指令 (Prompt Logic):**
> **Subject:** A glowing silhouette of a `[Target Audience Gender]` body in active pose.
> **Style:** Medical illustration, X-ray vision style.
> **Details:** Zoom-in bubbles pointing to specific organs (brain, heart, joints) showing healthy tissue structures.



### 🏷️ Module 6: Craftsmanship (工艺体验)

* **文案模版 (Copy Template):**
> `[工艺名称]`，锁住营养
> `[服用体验描述]` (e.g. 吞服不卡喉)


* **绘图指令 (Prompt Logic):**
> **Split Screen:** Top 70%, Bottom 30%.
> **Top:** Extreme macro close-up of the pill/tablet, showing smooth coating texture.
> **Bottom:** Lifestyle shot of a `[Target Audience]` smiling and taking the supplement easily.



### 🏷️ Module 7: Specs Table (参数表)

* **文案模版 (Copy Template):**
> 产品名称：`[产品名]`
> 规格：`[核心规格]`
> 适宜人群：`[目标人群]`
> 食用方法：`[服用建议]`


* **绘图指令 (Prompt Logic):**
> **Type:** UI Element / Data Table.
> **Style:** Clean, modern, minimalist table design.
> **Colors:** Matching `[Visual Style]` palette (light background, dark text).



### 🏷️ Module 8: Trust Footer (页尾保障)

* **文案模版 (Copy Template):**
> 京东承诺：`[物流/售后政策]`
> 正品行货，机打发票


* **绘图指令 (Prompt Logic):**
> **Type:** Banner design.
> **Elements:** Official JD.com badges, "Authenticity Guarantee" shield icon, "Fast Shipping" truck icon.
> **Style:** Trustworthy, corporate red and white.



---

## 4. Interaction Flow (交互逻辑 - 给开发看)

1. **Initialize:** User loads Oculus Flow component.
2. **Input:** User types in raw data (e.g., "vitamins", "tired men").
3. **Wait:** System detects `input change`. Starts `debounce timer (5000ms)`.
4. **Trigger:** Timer ends. Client sends `POST` request to LLM endpoint with Schema + System Prompt.
5. **Loading:** Right panel shows skeleton loader with text "Oculus is analyzing...".
6. **Render:** LLM returns JSON. Right panel renders `sample_count` cards.
7. **Action:** User clicks "Select Variant". The `copy_content` and `image_prompt` data from that variant are dispatched to the Image Generation Service (e.g., ComfyUI / Midjourney API).

---

这份文档现在已经可以直接发给 **Antigravity** 的开发团队进行排期和开发了。祝 **Oculus Flow** 项目顺利上线！