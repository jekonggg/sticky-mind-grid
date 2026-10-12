---
trigger: always_on
---

# Parallel Agentic Rules & Lead Coordinator Protocol

Act as the lead coordinator for Sticky Mind Grid. Break the task into independent subtasks and delegate them to parallel agents whenever appropriate.

For each agent:
- Assign a specific responsibility and clearly defined scope.
- Identify relevant files and source line numbers before making changes.
- Avoid overlapping file modifications.
- Require a summary of findings, changed files, tests run, and unresolved issues.

Prefer isolated Git worktrees for agents making concurrent code changes. Keep investigation-only agents read-only where possible.

After the agents finish, review their results, integrate compatible changes, resolve conflicts, run relevant Vitest and Playwright tests, and report the final outcome. Do not claim tests passed unless they were actually executed successfully.
