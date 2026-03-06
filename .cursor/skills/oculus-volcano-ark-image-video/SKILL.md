---
name: oculus-volcano-ark-image-video
description: 火山方舟即梦/Seedance 在本项目中的使用方式、5.0-lite 最佳实践、以及图片与视频生成结果的保存位置。
---

# Oculus 火山方舟图/视频 Agent：模型实践与产出保存

本 skill 说明本项目内「图片精修 (Retouch)」「Oculus Flow」等使用火山引擎方舟图片/视频 API 的 agent 的配置方式、Seedream 5.0 lite 最佳实践，以及**生成图片/视频的保存位置**。

---

## 1. 模型与接入方式

### 图片生成（即梦 / Seedream）

- **前端展示名**：如 Doubao-Seedream-5.0-lite、即梦 4.5 等，存于 `SettingsPanel` 的 `DEFAULT_IMAGE_MODELS`，用户选择后写入 `localStorage`（`oculus_image_model`）。
- **方舟 API 要求**：`model` 参数必须是 **Model ID**（如 `doubao-seedream-5-0-260128`）或 **推理接入点 ID**（`ep-xxx`），不能直接使用产品昵称 `doubao-seedream-5-0-lite`。
- **服务端解析**（[app/api/oculus/image/route.ts](app/api/oculus/image/route.ts)）：
  1. 若配置了 **`VOLCENGINE_IMAGE_ENDPOINT_ID`**，优先使用该 Endpoint ID 调方舟。
  2. 否则用请求里的 `modelId`，并通过 **`IMAGE_MODEL_ID_MAP`** 映射为方舟文档中的 Model ID（如 `doubao-seedream-5-0-lite` → `doubao-seedream-5-0-260128`）。
  3. 未配置 Endpoint 且无映射时，使用请求中的 `modelId` 或默认值。

### 视频生成（Seedance）

- 使用 **Doubao-Seedance-1.5-pro** 等，`modelId` 来自 `localStorage`（`oculus_video_model`），由 [app/api/oculus/video/route.ts](app/api/oculus/video/route.ts) 直接传给方舟。

---

## 2. Doubao-Seedream-5.0-lite 最佳实践

### 环境变量

- **`VOLCENGINE_API_KEY`**（必填）：方舟长效 API Key，控制台 → API Key 管理 获取。
- **`VOLCENGINE_IMAGE_ENDPOINT_ID`**（可选）：若使用「推理接入点」方式，在此填写即梦接入点 ID（`ep-xxx`）；不填则使用代码中的 Model ID 映射（如 5.0-lite → 5-0-260128）。

### 请求参数（与官方文档一致）

- **prompt**：必填；建议不超过 300 汉字或 600 英文单词，过长易被模型简化。
- **size**：支持方式 1（`2K`/`3K` + prompt 中描述宽高比）或方式 2（如 `2048x2048`）；本项目图片精修通过 `getSizeFromOptions(clarity, aspectRatio)` 生成 `宽x高`，需落在文档规定的总像素与宽高比范围内。
- **image**（图生图）：单张或多张，URL 或 Base64（`data:image/<格式>;base64,...`）；格式需小写；即梦 5.0-lite/4.5/4.0 最多 14 张参考图。
- **sequential_image_generation**：组图时用 `auto`，单图用 `disabled`（本项目默认单图）。
- **output_format**：仅 5.0-lite 支持，可选 `png`/`jpeg`（可按需在 `imageOptions` 中扩展）。

### 错误排查

- 报错「The model or endpoint doubao-seedream-5-0-lite does not exist」：说明方舟不认该字符串。应使用映射后的 Model ID（如 `doubao-seedream-5-0-260128`）或配置 `VOLCENGINE_IMAGE_ENDPOINT_ID`。
- 控制台可查看 `[Retouch] 请求参数摘要` 与 `[ImageGen] model=...` 确认实际使用的 model 与 size。

---

## 3. 生成图片 / 视频保存在哪里

**结论：本 agent 不提供持久化存储；所有生成结果仅存在于浏览器内存或临时 URL，由用户自行「打包下载」到本地。**

### 图片（图片精修、Oculus Flow 模块图等）

- **接口**：`POST /api/oculus/image` 返回 `image_url`（方舟 CDN 临时链接，约 24 小时有效）或 `b64_json`（Base64）。
- **前端**：结果保存在组件 state（如 Retouch 页的 `resultUrls`），仅在当前会话、当前页面有效；刷新或关闭页面即丢失。
- **持久化**：用户点击「打包下载」后，前端逐张触发浏览器下载（`<a download>` 或 fetch 后 Object URL），文件保存到**用户本机浏览器配置的下载目录**；项目服务端**不落盘、不建库**。

### 视频（Seedance）

- **接口**：`POST /api/oculus/video` 创建任务，轮询完成后返回 `video_url`（方舟临时链接）。
- **前端**：同图片，仅保存在当前会话的 state 中展示与播放。
- **持久化**：若提供「下载」按钮，同样通过浏览器下载到**用户本机**；服务端不保存视频文件。

### 总结表

| 产出类型 | 接口返回 | 前端状态 | 持久化位置 |
|----------|----------|----------|------------|
| 图片     | image_url 或 b64_json | 内存（resultUrls 等） | 仅用户点击「打包下载」后存到本机下载目录 |
| 视频     | video_url             | 内存 / 临时播放      | 仅用户手动下载后存到本机；服务端不存      |

如需「账号下所有生成图/视频集中保存、可跨设备查看」，需额外开发服务端存储（如对象存储 + 数据库）与列表/下载 API，当前 agent 不包含该能力。

---

## 4. 智能组图方案类型（Set Gen）

智能组图页按「方案类型」对同一需求描述生成多张不同风格的图，每类方案请求一次 `POST /api/oculus/image`，使用同一 `modelId`（默认 5.0 lite）。

- **配置单一数据源**：[lib/setgen-schemes.ts](lib/setgen-schemes.ts) 中的 `SCHEME_TYPES`。
- **方案与 suffix 规范表**：

| 方案         | suffix           |
|--------------|------------------|
| 白底精修图   | ，白底精修展示图 |
| 3D立体效果图 | ，3D立体效果图   |
| 细节特写图   | ，细节特写图     |
| 卖点图       | ，卖点展示图     |

- **拼 prompt**：`finalPrompt = basePrompt + (scheme.promptInstruction ?? scheme.suffix)`。`promptInstruction` 为发给模型的完整指令（如「，白底精修展示图。纯白背景，产品主体清晰无杂物…」），用于提升出图区分度；无则回退到 `suffix`。
- **前端**：[app/agency/set-generation/page.tsx](app/agency/set-generation/page.tsx) 从 `@/lib/setgen-schemes` 引入 `SCHEME_TYPES`，循环选中方案并传 `finalPrompt`、`modelId`、`refImages`、`imageOptions`。
