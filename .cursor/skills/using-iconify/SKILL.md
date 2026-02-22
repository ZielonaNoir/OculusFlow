---
name: using-iconify
description: How to use Iconify for icons in the project.
---

# Using Iconify

This project uses `@iconify/react` for all icons to maintain consistency and reduce bundle size.

## Rules

1.  **No Raw SVGs**: Do not use `<svg>` tags directly in the code (unless for complex custom illustrations that are not icons).
2.  **Use the Icon Component**: Import `Icon` from `@iconify/react`.
    ```tsx
    import { Icon } from "@iconify/react";
    ```
3.  **Naming Convention**: Use the `collection:name` format (e.g., `lucide:home`, `mdi:account`).
    - Preferred collection: `lucide` (for consistency with Shadcn UI).
    - Secondary collection: `mdi` (Material Design Icons) if Lucide lacks a specific icon.
4.  **Styling**: Use Tailwind CSS classes for sizing and color.
    ```tsx
    <Icon icon="lucide:check" className="h-4 w-4 text-green-500" />
    ```

## Finding Icons

- Search for icons at [https://icon-sets.iconify.design/](https://icon-sets.iconify.design/).
- Prefer outlined icons from `lucide` to match the existing design system.

## Refactoring Legacy Code

When encountering `<svg>` tags:

1.  Identify the icon.
2.  Find a matching equivalent in `lucide`.
3.  Replace with `<Icon icon="..." />`.
