---
description: Analyze terminal logs during development and deployment to distinguish between critical errors and benign warnings.
---

# Analyzing Deployment Logs

## Context

When running `bun run dev` or deploying Next.js applications, the terminal output can be noisy. It is crucial to distinguish between logs that require immediate action (Errors) and those that are informational or future-proofing (Warnings).

## Log Categories

### 1. Critical Errors (Action Required)

These prevent the application from starting or functioning correctly.

- **Signs**: `Error:`, `Exception`, `Failed to compile`, `Module not found`, `500 Internal Server Error`.
- **Examples**:
  - `Error: P3005: The database schema is not synced` (Prisma/DB verification failed).
  - `TypeError: Cannot read properties of undefined` (Runtime crash).
  - `EADDRINUSE: address already in use` (Port conflict).

### 2. Deprecation Warnings (No Immediate Action)

These warn about future breaking changes but do not affect current functionality.

- **Signs**: `DeprecationWarning`, `The "middleware" file convention is deprecated`.
- **Action**: Note for future refactoring, but ignore during current feature work unless specifically tasked to upgrade.
- **Example**: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.` (Safe to ignore in Next.js 16.x for now).

### 3. Security/Configuration Warnings (Verify & Ignore)

These highlight potential security or config nuances.

- **Signs**: `SECURITY WARNING`, `PostgreSQL SSL mode`.
- **Example**:
  ```text
  Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
  In the next major version... these modes will adopt standard libpq semantics.
  ```
- **Analysis**: If using Neon or standard cloud Postgres, the current default `sslmode` is usually sufficient. This warning is about _future_ behavior in `pg` v9.0. **Action**: Ignore if current connection works.

### 4. Runtime 404s (Context Dependent)

- **Signs**: `GET /resource 404`.
- **Example**: `GET /sw.js 404`.
- **Analysis**: Browser trying to load a Service Worker. If PWA is not implemented, this is expected behavior. **Action**: Ignore.

## Workflow

1. **Filter**: mentally filter out lines starting with `⚠` or `Warning:` unless functionality is broken.
2. **Focus**: Look for `⨯` (red cross), `Error`, or stack traces.
3. **Verify**: If the app loads (`GET / 200`), the "Error" might have been transient or non-fatal.
