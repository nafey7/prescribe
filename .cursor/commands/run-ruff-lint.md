# Run Ruff Linting

This guide explains how to check for linting and formatting issues using Ruff, and how to fix them.

## Prerequisites

Ruff should be available as a Python module. If not installed, it can be installed via Poetry (it's in the dev dependencies).

## Check for Linting Issues

To check for linting issues in the backend_python directory:

```bash
cd backend_python
python3 -m ruff check .
```

## Check for Formatting Issues

To check for formatting issues:

```bash
cd backend_python
python3 -m ruff format --check .
```

## Fix Linting Issues

### Auto-fix Safe Issues

Most linting issues can be auto-fixed:

```bash
cd backend_python
python3 -m ruff check --fix .
```

This will automatically fix issues like:

- Whitespace in blank lines (W293)
- Import sorting
- And other safe fixes

### Fix Issues Requiring Unsafe Fixes

Some issues require unsafe fixes (like sorting `__all__` lists or moving imports to type-checking blocks):

```bash
cd backend_python
python3 -m ruff check --fix --unsafe-fixes .
```

## Fix Formatting Issues

To automatically format all files:

```bash
cd backend_python
python3 -m ruff format .
```

## Complete Workflow

To check and fix all issues in one go:

```bash
cd backend_python

# 1. Check and fix linting issues (including unsafe fixes)
python3 -m ruff check --fix --unsafe-fixes .

# 2. Format all files
python3 -m ruff format .

# 3. Verify everything is fixed
python3 -m ruff check .
python3 -m ruff format --check .
```

## Common Issues Fixed

- **RUF022**: `__all__` is not sorted - Fixed with `--unsafe-fixes`
- **TC001**: Application imports should be in type-checking blocks - Fixed with `--unsafe-fixes`
- **W293**: Blank line contains whitespace - Fixed automatically
- **Formatting**: Line length, spacing, and other formatting issues - Fixed with `ruff format`

## Verification

After fixing issues, verify everything is clean:

```bash
# Should output: "All checks passed!"
python3 -m ruff check .

# Should output: "X files already formatted"
python3 -m ruff format --check .
```
