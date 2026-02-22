---
name: no-emoji-use-iconify
description: Enforce using Iconify icons instead of emoji characters in all code
---

# No Emoji, Use Iconify

## Rule

**Never use emoji characters in source code.** Always use Iconify icons instead.

## Why

1. **Consistent Rendering**: Emojis render differently across platforms (iOS/Android/Windows/macOS)
2. **Better Control**: Iconify icons can be styled, colored, and sized programmatically
3. **Accessibility**: Iconify provides better screen reader support
4. **Professional**: Icons look more polished and professional than emoji
5. **Bundle Size**: Iconify loads icons on-demand, emojis are always in Unicode

## How to Replace Emoji with Iconify

### 1. Import Icon Component

```tsx
import { Icon } from "@iconify/react";
```

### 2. Find Equivalent Icons

Use [Icones.js.org](https://icones.js.org/) or [Iconify Icon Sets](https://icon-sets.iconify.design/) to find icons.

Common emoji replacements:

| Emoji | Iconify Icon                                   |
| ----- | ---------------------------------------------- |
| 📸    | `lucide:camera` or `mdi:camera`                |
| 🪪    | `lucide:id-card` or `mdi:card-account-details` |
| 🐕    | `lucide:dog` or `mdi:dog`                      |
| 🐱    | `lucide:cat` or `mdi:cat`                      |
| 💉    | `lucide:syringe` or `mdi:needle`               |
| 🏥    | `lucide:hospital` or `mdi:hospital-building`   |
| 📋    | `lucide:clipboard` or `mdi:clipboard-text`     |
| ✅    | `lucide:check-circle` or `mdi:check-circle`    |
| ❌    | `lucide:x-circle` or `mdi:close-circle`        |
| ⚠️    | `lucide:alert-triangle` or `mdi:alert`         |
| 🔒    | `lucide:lock` or `mdi:lock`                    |
| 🔓    | `lucide:unlock` or `mdi:lock-open`             |
| 🎨    | `lucide:palette` or `mdi:palette`              |
| 📊    | `lucide:bar-chart` or `mdi:chart-bar`          |
| 🚀    | `lucide:rocket` or `mdi:rocket`                |
| 💰    | `lucide:dollar-sign` or `mdi:currency-usd`     |
| 🎯    | `lucide:target` or `mdi:bullseye-arrow`        |

### 3. Replace Emoji

**Bad:**

```tsx
<h2>📸 宠物照片</h2>
<button>🪪 犬证信息</button>
```

**Good:**

```tsx
<h2><Icon icon="lucide:camera" className="inline-block" /> 宠物照片</h2>
<button><Icon icon="lucide:id-card" className="inline-block" /> 犬证信息</button>
```

### 4. Styling Icons

```tsx
// Size control
<Icon icon="lucide:camera" className="w-5 h-5" />

// Color control
<Icon icon="lucide:camera" className="text-violet-400" />

// Inline with text
<Icon icon="lucide:camera" className="inline-block align-middle" />
```

## When to Check

- **Before creating new components**
- **When reviewing code** that contains emoji
- **During refactoring** sessions
- **When updating UI text**

## How to Find Emoji in Project

```bash
# Search for emoji characters in TypeScript/TSX files
grep -r "[😀-🙏🌀-🗿🚀-🛿]" --include="*.tsx" --include="*.ts" .
```

## Exceptions

**None.** Always use Iconify icons instead of emoji in source code.

Emoji are **only acceptable** in:

- User-generated content (database data)
- Markdown documentation (README.md, guides)
- Git commit messages (optional)

## Related Skills

- `using-iconify` - How to use Iconify in this project
