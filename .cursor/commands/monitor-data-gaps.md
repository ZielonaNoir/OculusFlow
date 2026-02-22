# Monitor Data Gaps

Audit frontend UI requirements against database schema:

1. **Fetch schema**: `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public'`.
2. **Inspect UI**: Profile, Chat, Lists - what data is displayed?
3. **Compare**: Missing tables, missing columns, type mismatches.
4. **Document**: Update `docs/data_gap_analysis.md` or `.agent/workflows/data_gap_analysis.md` with findings and proposed SQL.
