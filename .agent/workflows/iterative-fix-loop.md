---
description: Standardized workflow for fixing code issues through an iterative Edit -> Verify -> Fix cycle (max 20 rounds).
---

# Iterative Fix Loop Workflow

This workflow describes the process for systematically fixing code issues, ensuring type safety and code quality. **Run up to 20 rounds**—stop when 0 errors or round 20 reached.

## Prerequisites

- Node.js/Bun environment set up.
- TypeScript configured in the project.
- ESLint configured in the project.

## Steps

### 1. Identify Issues

Run the verification commands to see current errors:

```bash
npx tsc --noEmit
npm run lint
```

Analyze the output to categorize errors (e.g., Type Errors, Lint Warnings, Logic Bugs).

### 2. Isolate and Fix

Choose **one** category of error to fix at a time.

- **Type Errors (TS)**: Fix types first as they often reveal logic issues.
- **Lint Warnings**: Fix stylistic or potential runtime issues.
- **Logic Bugs**: Fix based on behavior.

**Action**: Edit the code to resolve the selected errors.
**Tip**: Use `as const` for literal types if TS infers broadly.

### 3. Verify Fix

Run the specific command related to the fix to verify it worked:

```bash
# If fixed types:
npx tsc --noEmit

# If fixed linting:
npm run lint
```

### 4. Regression Check

Run _both_ commands to ensure the fix didn't break anything else.
// turbo

```bash
npx tsc --noEmit && npm run lint
```

### 5. Repeat (max 20 rounds)

If errors remain and round < 20, go back to Step 1.
If 0 errors or round 20, proceed to commit or next task.
