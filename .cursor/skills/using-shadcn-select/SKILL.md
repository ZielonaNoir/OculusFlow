---
name: using-shadcn-select
description: Enforce using shadcn/ui Select (and related form controls) for all dropdowns, single/multi selection, and native select replacements in the project
---

# Using shadcn/ui Select for Dropdowns

## Rule

**All dropdown / single-select components MUST use shadcn/ui Select.** Do not use native `<select>` or custom dropdown implementations. Any UI that presents a list of options for the user to choose one (or “none”) must use `@/components/ui/select`.

## Why

1. **Consistent UX**: Same look, keyboard navigation, and behavior across the app
2. **Accessibility**: Radix Select is ARIA-compliant and keyboard-friendly
3. **Themeable**: Styled with Tailwind; matches dark/light and project tokens
4. **Maintained**: Part of shadcn/ui and Radix ecosystem
5. **Controlled API**: `value` + `onValueChange` integrate cleanly with React state

## When to Use

- Single selection from a fixed list (e.g. 视觉风格、类别、模块类型)
- “Choose one template per module” (e.g. 方案编辑里为每个模块选模板)
- Any place you would otherwise use `<select>` + `<option>`

## Import

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

## Basic Usage

### Required selection (no empty option)

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="…">
    <SelectValue placeholder="请选择" />
  </SelectTrigger>
  <SelectContent className="…">
    <SelectItem value="a">选项 A</SelectItem>
    <SelectItem value="b">选项 B</SelectItem>
  </SelectContent>
</Select>
```

### Optional selection (“未选择” / empty)

Radix Select does not support `value=""` well. Use a sentinel value and map to empty when reading/writing state:

```tsx
const EMPTY = "__none__";

<Select
  value={currentValue || EMPTY}
  onValueChange={(v) => setValue(v === EMPTY ? "" : v)}
>
  <SelectTrigger className="…">
    <SelectValue placeholder="未选择" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={EMPTY}>未选择</SelectItem>
    <SelectItem value="id1">模板 1</SelectItem>
  </SelectContent>
</Select>
```

## Styling (dark theme)

- `SelectTrigger`: e.g. `className="… border-white/10 bg-zinc-900 … focus:ring-violet-500/50 h-auto"` for compact forms
- `SelectContent`: e.g. `className="border-white/10 bg-zinc-950/95"`
- `SelectItem`: e.g. `className="… focus:bg-violet-500/20 focus:text-violet-200"`

## Do Not

- Use native `<select>` / `<option>` for new UI
- Build custom dropdowns with div + click handlers instead of Select
- Use other UI libraries’ select components unless the skill explicitly allows

## Existing shadcn usage

- **InputForm** (视觉风格): already uses `Select` from `@/components/ui/select`
- **PromptTemplateManager** (新建模板): category and moduleType use `Select`
- **template-library 方案编辑**: per-module template choice uses `Select`

When adding new dropdowns (e.g. filters, settings, scheme editors), add them with shadcn Select and keep styling consistent with the above.
