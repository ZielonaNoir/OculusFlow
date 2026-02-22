---
description: Standardized workflow for implementing a new CRUD feature module (Database -> Server Actions -> UI).
---

# Implementing a CRUD Module

## Context

Use this skill when adding a new functional module (e.g., Pet Management, Insurance Policies) that involves database storage, backend logic, and frontend UI.

## Workflow

### 1. Database Schema

- **Gap Analysis**: Check if existing tables cover the requirements.
- **Migration**: accessible via `mcp-server-neon` tools.
  - `prepare_database_migration`: Create the table/columns.
  - `run_sql`: Verify on temp branch.
  - `complete_database_migration`: Apply to main.

### 2. Server Actions (`lib/module-name.ts`)

- **Pattern**: Use `pg` pool (`import { Pool } from 'pg'`) for compatibility.
- **Auth**: Always verify session using `auth.api.getSession`.
- **Typing**: Define TypeScript interfaces for the data model.
- **Functions**:
  - `getItems(userId)`: Fetch list.
  - `createItem(formData)`: Insert record.
  - `updateItem(id, formData)`: Update record.
  - `deleteItem(id)`: Remove record.

### 3. Frontend UI (`app/dashboard/module-name`)

- **List Page** (`page.tsx`):
  - Fetch data in `useEffect` or use React Server Components (RSC) if possible (currently using client-side fetch for interactive dashboard).
  - Empty State: Show clear call-to-action (CTA).
  - Grid/List View: Use `framer-motion` for entry animations.
- **Form Page** (`new/page.tsx` or `[id]/page.tsx`):
  - Use `zod` for validation (optional but recommended).
  - Use `react-hook-form` or native `FormData` for simplicity.
  - Submit via Server Action.
  - Handle loading/error states explicitly.

### 4. Navigation

- **Sidebar**: Update `components/layout/Sidebar.tsx`.
  - Add `NavItem` with appropriate icon.
  - Ensure routing works.

## Best Practices

- **"Snapshot" Logic**: For insurance/financial data, store snapshots of related data (e.g., pet age at time of claim) rather than just references.
- **Array Fields**: Use `text[]` for multiple file uploads (photos, docs).
- **Icons**: Use `@iconify/react` with `lucide` set.
