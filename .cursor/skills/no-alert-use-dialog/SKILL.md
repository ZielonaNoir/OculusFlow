---
name: no-alert-use-dialog
description: Do not use native browser dialogs (alert, prompt, confirm). Use UI components instead - Dialog for inputs/confirmations, Sonner toast for success/error feedback. Use when implementing user interactions that need feedback, input, or confirmation.
---

# No alert/prompt/confirm - Use UI Components

## Rule

**Never use** `alert()`, `window.prompt()`, or `window.confirm()` in the VetFlow codebase.

Replace with:
- **Dialog/Modal** for inputs (e.g. folder name, rename) and confirmations
- **Sonner toast** for success/error feedback (`toast.success()`, `toast.error()`)

## Replacements

| Native | Replace With | Example |
|--------|--------------|---------|
| `window.prompt('名称?')` | Dialog with input | `CreateFolderDialog`, `RenameDialog` |
| `window.confirm('确定?')` | Dialog with 确定/取消 | `ConfirmDialog` |
| `alert('成功')` | `toast.success('成功')` | Sonner |
| `alert('错误')` | `toast.error('错误')` | Sonner |

## Patterns

### Input Dialog

```tsx
// Create sub-component dialog
<CreateFolderDialog
  open={open}
  onOpenChange={setOpen}
  defaultName="新建文件夹"
  onSubmit={handleCreate}
/>
```

### Toast Feedback

```tsx
import { toast } from 'sonner';

toast.success('创建成功');
toast.error('操作失败');
```

## Existing Components

- `CreateFolderDialog` - 新建文件夹
- `Dialog` (ui/dialog) - 通用弹窗
- `Sonner` - toast 已在 layout 中配置
