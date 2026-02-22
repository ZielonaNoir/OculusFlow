---
description: Systematically capture learnings, update skills, and create workflows after resolving complex issues or completing tasks.
---

# Knowledge Capture Workflow

## When to use

- After resolving a difficult bug.
- After implementing a complex feature with a repeatable pattern.
- At the end of a task or development branch.
- When the user explicitly requests to "maintain skills".

## Steps

### 1. Identify New Knowledge

Reflect on the work just completed. Ask:

- "Did I encounter a problem that wasn't documented?"
- "Did I invent a new way of doing things?"
- "Did I have to look up external documentation that should be local?"
- "Did I fix a recurring issue?"

### 2. Check Existing Skills

Use `list_dir` on `.agent/skills` to see what exists.

- **Match Found**: If a relevant skill exists, read it. Does it need updating?
- **No Match**: Does this warrant a new skill?

### 3. Update or Create Skill

**If updating**:

- Edit the `SKILL.md` file.
- Add the new edge case, error message, or solution.
- Keep it concise.

**If creating**:

- Create a new directory `.agent/skills/<skill-name>`.
- Create `SKILL.md` with:
  - `name`: Kebab-case name.
  - `description`: When to use this skill.
  - Content: Context, Steps, Common Errors, Code Snippets.

### 4. Standardize Workflows

If the solution involved a sequence of steps (e.g., "Edit -> Verify -> Fix"), consider creating a workflow.

- Create `.agent/workflows/<workflow-name>.md`.
- Define the steps clearly.
- Use `// turbo` for auto-runnable command steps.

### 5. Document in Project History

Update `task.md` or `walkthrough.md` to mention the new/updated skills. This reinforces the "Knowledge Capture" phase in the project lifecycle.

## Checklist

- [ ] Identified key learnings.
- [ ] Updated existing skills (if applicable).
- [ ] Created new skills (if applicable).
- [ ] Created new workflows (if applicable).
- [ ] Documented changes in `task.md`.
