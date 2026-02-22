---
description: Resolve TypeScript errors related to Framer Motion variants and literal types using `as const`.
---

# Fixing Framer Motion Type Errors

## Context

When using `framer-motion` with TypeScript in `strict` mode, defining animation variants can lead to tricky type errors, especially with transition properties like `type: "spring"`.

## Common Error: `Type 'string' is not assignable to type '"spring" | "tween" | "inertia" | "keyframes" | undefined'`

This occurs when TypeScript infers the property as a general `string` instead of a specific literal type required by Framer Motion.

### Solution: Use `as const`

Force TypeScript to treat the object properties as literal values instead of mutable strings.

**Before (Error):**

```tsx
const itemVariants = {
  visible: {
    opacity: 1,
    transition: {
      type: "spring", // TS infers 'string', but Framer needs specific literal
      stiffness: 300,
    },
  },
};
```

**After (Fix):**

```tsx
const itemVariants = {
  visible: {
    opacity: 1,
    transition: {
      type: "spring" as const, // TS infers literal "spring"
      stiffness: 300,
    },
  },
};
```

## Strategy: Avoid `Variants` Type Annotation if possible

Sometimes, explicitly typing the object as `Variants` can cause conflicts if your structure slightly deviates or if you rely on type inference for custom props. It is often cleaner to let TypeScript infer the structure and only use `as const` where necessary.

**Before (Potential Conflict):**

```tsx
const containerVariants: Variants = { ... }
```

**After (Inferred):**

```tsx
const containerVariants = { ... }
```

## Key Takeway

- Use `as const` for any string literal configuration properties (e.g., `type: "spring"`, `ease: "easeInOut"`).
- Verify with `npx tsc --noEmit` locally before deployment.
