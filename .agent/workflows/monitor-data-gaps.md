---
description: Analyze frontend UI requirements against the database schema to identify missing data storage
---

# Data Gap Analysis Workflow

Use this workflow to periodically audit the application's data layer health.

## 1. Fetch Current Database Schema

Retrieve the latest table definitions to understand the existing data structure.

```sql
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

## 2. Inspect Frontend UI Data Points

Launch a browser session to identify data fields currently displayed in the application but potentially missing from the database.

- **Target URL**: `http://localhost:3000` (or production URL)
- **Key Areas to Inspect**:
  - User Profile & Settings (Avatar, Preferences, Plan Status)
  - Feature Cards (Dynamic content, status flags)
  - Chat/Interaction History (Timestamps, content, categorization)
  - Lists & Grids (Sort order, filter criteria)

## 3. Gap Analysis & Reporting

Compare the findings from Step 1 and Step 2.

- **Identify Missing Tables**: Features with no corresponding table (e.g., `profiles`, `chat_history`).
- **Identify Missing Columns**: Existing tables lacking specific fields (e.g., `users` table missing `avatar_url`).
- **Identify Type Mismatches**: UI expecting `JSON` but DB providing `TEXT`.

## 4. Maintain Documentation

Update the `data_gap_analysis.md` artifact with the latest findings.

- **Format**:
  - **Date of Analysis**: [YYYY-MM-DD]
  - **Status**: [Healthy / Needs Attention]
  - **Critical Gaps**: [List of missing tables/columns]
  - **Proposed Schema Changes**: [SQL DDL statements]

## 5. Execution Loop (Optional)

If gaps are found:

1. Generate SQL migration scripts.
2. Apply changes using `mcp-server-neon_run_sql` or migration tools.
3. Re-run Step 1 to verify.
