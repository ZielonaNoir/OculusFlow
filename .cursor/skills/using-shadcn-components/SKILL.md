---
name: using-shadcn-components
description: Prefer shadcn/ui components for all UI (forms, dialogs, tabs, buttons, etc.). Use existing @/components/ui components instead of custom or native implementations.
---

# Using shadcn/ui Components

## Rule

**All UI that has a shadcn equivalent MUST use the shadcn component from `@/components/ui`.** Do not implement custom modals, tabs, dropdowns, or form controls when shadcn provides them.

## Installed shadcn components (use these)

| Component | Path | Use for |
|-----------|------|---------|
| **Button** | `@/components/ui/button` | All buttons (primary, secondary, icon, destructive) |
| **Input** | `@/components/ui/input` | Single-line text fields |
| **Label** | `@/components/ui/label` | Form labels |
| **Textarea** | `@/components/ui/textarea` | Multi-line text |
| **Select** | `@/components/ui/select` | Single selection dropdowns (see `using-shadcn-select` skill) |
| **Dialog** | `@/components/ui/dialog` | Modals, preview overlays, confirmations |
| **Tabs** | `@/components/ui/tabs` | Tabbed content (TabsList, TabsTrigger, TabsContent) |
| **Card** | `@/components/ui/card` | Card layout (CardHeader, CardTitle, CardContent, CardFooter) |
| **ScrollArea** | `@/components/ui/scroll-area` | Custom scroll regions |
| **Slider** | `@/components/ui/slider` | Range inputs |
| **Sheet** | `@/components/ui/sheet` | Side panels / drawers |
| **Separator** | `@/components/ui/separator` | Dividers |
| **Skeleton** | `@/components/ui/skeleton` | Loading placeholders |

## Add more when needed

```bash
npx shadcn@latest add <component> --yes
```

Examples: `alert-dialog`, `dropdown-menu`, `popover`, `tooltip`, `checkbox`, `radio-group`, `switch`, `badge`, etc.

## Where we use them

- **InputForm**: Input, Label, Textarea, Select (视觉风格), Button, **Dialog** (四视图大图预览)
- **PreviewPanel**: Button, ScrollArea, **Dialog** (选择 Prompt 模板 弹层)
- **PromptTemplateManager**: Select (类别、模块类型)
- **template-library**: Select (方案编辑), **Tabs** (Prompt 模板 | 方案)
- **ImageSlicer** (app/components): **Button** (清除图片), **Slider** (切片数量 2–20)

## Do not

- Use native `<select>` (use Select)
- Build custom modal with div + fixed (use Dialog)
- Build tab UI with manual state + buttons (use Tabs)
- Use raw `<button>` where Button variant/size is needed for consistency

## Related skills

- `using-shadcn-select` – dropdowns and single-select
- `using-shadcn-date-picker` – date picker (if installed)
