---
description: GitHub operations (issues, commits, pushes) with proper permissions
allowed-tools: Bash(gh:*), Bash(git:*)
---

# GitHub Operations

When creating GitHub issues, committing code, or pushing code using GitHub CLI or git commands, use `required_permissions: ['all']` to bypass sandbox restrictions.

## Why This Is Needed

The sandbox environment can block network access and cause certificate verification errors. Using `required_permissions: ['all']` disables the sandbox entirely, allowing GitHub CLI and git operations to work properly.

## Creating GitHub Issues

```bash
gh issue create --title "Issue Title" --body "Issue description"
```

**Always use:** `required_permissions: ['all']`

## Committing Code

```bash
git add .
git commit -m "Commit message"
```

**Always use:** `required_permissions: ['all']` or `required_permissions: ['git_write']`

## Pushing Code

```bash
git push origin branch-name
```

**Always use:** `required_permissions: ['all']` or `required_permissions: ['git_write', 'network']`

## Example: Creating an Issue

When using the `run_terminal_cmd` tool to create a GitHub issue:

```javascript
run_terminal_cmd({
  command: "gh issue create --title 'Title' --body 'Description'",
  required_permissions: ["all"],
});
```

This ensures the GitHub CLI can:

- Access the network without certificate issues
- Use existing authentication properly
- Successfully complete the operation
