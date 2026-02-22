---
name: iterative-fix-loop
description: Use when fixing code issues (type errors, lint, logic bugs) - follow Edit → Verify → Fix cycle; fix one category at a time; run up to 20 rounds until 0 errors
---

# Iterative Fix Loop

Resolve code issues systematically by repeating: **Identify → Isolate → Verify → Regression → Repeat**. **Run up to 20 rounds**—stop when 0 errors or round 20 reached.

## The Loop (max 20 rounds)

1. **Identify**: Run `npx tsc --noEmit` and `npm run lint` to see current errors. Categorize:
   - Type Errors (compiler)
   - Lint Warnings (eslint)
   - Logic Bugs (tests, runtime)
2. **Isolate**: Fix **one category at a time**. Order: Type Errors first → Lint → Logic.
3. **Verify**: Run the relevant command after each fix (`npx tsc --noEmit` for types, `npm run lint` for lint, `npm run test` for logic).
4. **Regression**: Run `npx tsc --noEmit && npm run lint` (and tests if logic changed) before proceeding to next category.
5. **Repeat** until 0 errors **or round 20**.

## Rules

- Do not fix multiple categories in one batch—isolate to avoid cascading confusion.
- Do not claim "fixed" until verification command passes.
- If a fix introduces new errors, revert or adjust before moving on.
- When logic bugs exist, add or run unit tests to avoid regressions.

## Verification Commands

| Category    | Verify With                  |
|-------------|------------------------------|
| Type Errors | `npx tsc --noEmit`           |
| Lint        | `npm run lint`               |
| Logic/Tests | `npm run test`               |
| Full gate   | `npx tsc --noEmit && npm run lint && npm run test` |

## Related

- `verification-before-completion` – Never claim completion without fresh verification.
- `test-driven-development` – When adding or fixing logic, use tests as the gate.
