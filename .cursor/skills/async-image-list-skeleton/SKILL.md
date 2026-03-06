---
name: async-image-list-skeleton
description: 所有需要加载的组件必须优先使用 shadcn Skeleton 占位 + 渐进展示，严格执行。
---

# Skeleton + 渐进展示（必须严格执行）

## 总则

**所有需要加载的组件都必须优先使用 shadcn Skeleton + 渐进展示。** 不得用纯空白、纯 loading 图标或自定义 div 代替骨架；凡能按条/按项返回的数据，应预分配槽位并逐条更新，做到「拿到一条显示一条」，不等待全部完成再一次性渲染。

---

## 一、异步图片列表（典型场景）

凡**异步请求多张图片并在前端列表展示**的页面，必须同时满足：

1. **占位使用 shadcn Skeleton**  
   在图片尚未返回或尚未加载完成前，每个结果槽位使用 `@/components/ui/skeleton` 的 **Skeleton** 组件占位，不得用纯空白、纯 loading 图标或自定义 div 代替骨架。

2. **渐进式更新（拿到一张显示一张）**  
   - 在发起请求前**预分配槽位**：将结果 state 设为长度为 N 的数组（如 `setResultUrls(selectedSchemes.map(() => null))`），N = 预期图片数量。  
   - 每收到一张结果就**只更新对应索引**，例如：  
     `setResultUrls(prev => { const next = [...prev]; next[i] = url; return next; })`。  
   - 不得等所有请求完成后再一次性 `setResultUrls(results)`。

## 组件与引用

- **Skeleton**：`import { Skeleton } from "@/components/ui/skeleton";`
- 每个槽位：`url == null` 时渲染 `<Skeleton className="…" />`，`url != null` 时渲染 `Image` 或 `<img>`。

## 参考实现

- [app/agency/set-generation/page.tsx](app/agency/set-generation/page.tsx)：智能组图结果区  
  - 点击生成时 `setResultUrls(selectedSchemes.map(() => null))`；  
  - 循环内每张完成即 `setResultUrls(prev => { ... next[i] = url; return next; })`；  
  - 结果网格中 `url ? <Image /> : <><Skeleton /> {!isGenerating && 生成失败}</>`。

## 空状态

- 仅在「尚未开始生成」（如 `resultUrls.length === 0 && !isGenerating`）时展示空状态占位（如「生成结果将在此展示」）。  
- 一旦开始生成，即显示 N 个 Skeleton 槽位，随结果逐步替换为图片。

---

## 二、其他需要加载的组件

- **单图/单资源加载**：在 URL 或数据未就绪前，用 `<Skeleton />` 占位（与目标区域同尺寸），数据到达后替换为实际内容。
- **列表/卡片流**：若接口支持分页或逐条返回，应预分配槽位（或首屏固定 N 个 Skeleton），每收到一条就更新对应项，不做「等全部加载完再 setState」。
- **通用约定**：凡存在「请求中 / 加载中」状态的 UI，占位一律使用 `@/components/ui/skeleton` 的 Skeleton，不新增自定义骨架样式。

## 相关

- 使用 shadcn 组件：见 `using-shadcn-components`。  
- 图片生成与保存：见 `oculus-volcano-ark-image-video`。
