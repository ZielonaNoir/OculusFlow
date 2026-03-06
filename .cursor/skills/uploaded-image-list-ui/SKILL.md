---
name: uploaded-image-list-ui
description: 上传图片后的展示与操作（查看大图、删除、下载），使用通用组件与 shadcn，避免手写重复逻辑。
---

# 上传图片列表 UI：查看 / 删除 / 下载

## 规则

**需要展示用户已上传图片、并支持「查看大图」「删除」「下载」时，必须使用本项目的通用组件 [UploadedImageList](components/agency/UploadedImageList.tsx)，不要手写一套缩略图 + 弹窗 + 按钮逻辑。**

## 通用组件

| 组件 | 路径 | 用途 |
|------|------|------|
| **UploadedImageList** | `@/components/agency/UploadedImageList` | 已上传图片的缩略图网格，每张支持：点击/按钮查看大图、下载、删除（可选） |

### Props

- **images** `string[]`：图片列表（data URL 或 远程 URL）。
- **onRemove** `(index: number) => void`（可选）：移除某张图片的回调；不传则不显示删除按钮。
- **maxDisplay** `number`（可选，默认 24）：最多展示的缩略图数量，超出时显示「已显示前 N 张，共 M 张」。
- **className** / **itemClassName**（可选）：网格容器与单格样式。

### 依赖

- **shadcn**：`Dialog`（大图预览）、`Button`（查看/下载/删除）。
- **Iconify**：`lucide:zoom-in`、`lucide:download`、`lucide:trash-2`。
- **Next.js**：`Image` 用于缩略图；大图用 `<img>` 以支持任意 data URL / 跨域 URL。

## 使用示例

```tsx
import { UploadedImageList } from "@/components/agency/UploadedImageList";

// 状态：files 为 data URL 数组
const [files, setFiles] = useState<string[]>([]);

const removeUploadedImage = (index: number) => {
  setFiles((prev) => prev.filter((_, i) => i !== index));
};

// 上传区域下方
{files.length > 0 && (
  <UploadedImageList
    images={files}
    onRemove={removeUploadedImage}
    maxDisplay={24}
  />
)}
```

## 已使用页面

- [app/agency/set-generation/page.tsx](app/agency/set-generation/page.tsx)：智能组图「产品图 / 参考图」上传后的展示与操作。

## 扩展

- 若需「仅展示、不可删除」：不传 `onRemove` 即可。
- 若需更多操作（如设为主图、排序）：可在 `UploadedImageList` 上扩展 props 或在外层用 `UploadedImageList` + 自定义工具栏组合。

## 相关 skills

- `using-shadcn-components`：Dialog、Button 等一律用 shadcn。
- `no-emoji-use-iconify`：图标用 Iconify，不用 emoji。
