# Iterative Fix Loop

Follow the Edit → Verify → Fix cycle for **up to 20 rounds**:

1. **Identify**: Run `npx tsc --noEmit` and `npm run lint` to see current errors. Categorize (Type Errors, Lint Warnings, Logic Bugs).
2. **Isolate**: Fix one category at a time. Type Errors first, then Lint, then Logic.
3. **Verify**: Run the relevant command after each fix (`npx tsc --noEmit` for types, `npm run lint` for lint).
4. **Regression**: Run `npx tsc --noEmit && npm run lint` before proceeding.
5. **Repeat** until 0 errors or round 20.
