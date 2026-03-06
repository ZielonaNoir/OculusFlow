---
name: llm-auto-fill-inputs
description: 除登录与聊天消息框外，所有业务/创作类输入框均提供「AI 自动填充」按钮；实现约定与接入方式。
---

# 全量输入框 AI 自动填充

## 规则

- **范围**：除登录（邮箱/密码）与聊天消息输入框外，**所有**需要用户手动输入业务/创作类内容的 Input、Textarea 都必须提供「AI 自动填充」按钮。
- **行为**：点击一次 = 根据可用上下文（上传图片、当前表单数据等）调用 LLM 生成内容并填入该框；再次点击 = 重新生成（可配合 temperature 实现不同表述）。
- **排除**：`app/login/page.tsx` 的邮箱/密码；`app/components/NanoBananaChat.tsx` 的消息输入框。

## 实现约定

1. **优先使用通用组件**  
   使用 `@/components/ui/input-with-ai-fill` 的 `FieldWithAIFill`，支持 `variant: 'input' | 'textarea'`、`value`、`onChange`、`onFill`、`disabledWhen`、`disabled`、`placeholder`、`label`、`inputClassName`、`prefix`（可选左侧图标）等。

2. **有图场景**  
   - 可复用 `POST /api/setgen/describe-image`（Body: `{ images: string[] }`，返回 `{ description }`）。  
   - 或统一走 `POST /api/llm/fill`，Body: `{ fieldType: "describe-image", context: { images: string[] } }`，返回 `{ text }`。

3. **无图或其它字段**  
   使用 `POST /api/llm/fill`：
   - Body: `{ fieldType: string, context?: { images?: string[], formData?: Record<string, unknown> } }`
   - 服务端按 `fieldType` 选择 system prompt，有图则多模态，无图则纯文本；temperature 约 0.7–0.8。
   - 返回：`{ text: string }`。

4. **按钮与状态**  
   - 按钮文案统一为「AI 填充」，图标使用 Iconify（如 `lucide:sparkles`）。  
   - 需有 loading 态（如「生成中…」+ 旋转图标）。  
   - 无可用上下文时按钮禁用或通过 `disabledHint`/toast 提示（如「请先上传图片」「请先选择模块」）。

## 常用 fieldType（与 /api/llm/fill 一致）

| fieldType | 说明 |
|-----------|------|
| `describe-image` | 根据图片生成生图描述（有图时用视觉模型） |
| `plan-name` | 方案名称 |
| `product-name` | 产品名称 |
| `core-specs` | 核心规格 |
| `target-audience` | 目标人群 |
| `pain-points` | 用户痛点 |
| `trust-endorsement` | 信任背书 |
| `selling-mode` | 促销模式 |
| `supplement-product` / `supplement-ingredients` / `supplement-audience` / `supplement-scenario` | 保健品表单 |
| `apparel-category` / `apparel-audience` | 服装表单 |
| `template-name` / `template-prompt` | Prompt 模板名称与正文 |

## 参考实现

- 需求描述 + 图片： [app/agency/set-generation/page.tsx](app/agency/set-generation/page.tsx)（FieldWithAIFill + describe-image）
- 精修描述： [app/agency/retouch/page.tsx](app/agency/retouch/page.tsx)（FieldWithAIFill + llm/fill describe-image）
- 方案名称： [app/template-library/page.tsx](app/template-library/page.tsx) SchemeEditor（FieldWithAIFill + plan-name）
- 智能体表单：SupplementInputForm、ApparelInputForm、InputForm、PromptTemplateManager 中各输入框的 `onFill` 与对应 `fieldType`。

## 相关

- 通用 API： [app/api/llm/fill/route.ts](app/api/llm/fill/route.ts)
- 通用组件： [components/ui/input-with-ai-fill.tsx](components/ui/input-with-ai-fill.tsx)
- 规则： `.cursor/rules/llm-auto-fill-inputs.mdc`
