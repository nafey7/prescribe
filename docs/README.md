# Documentation Hub

This directory contains the reference documentation for `prescribe-v2`. For AI agents, start at the root [`CLAUDE.md`](../CLAUDE.md) instead — it provides reading order and domain routing.

## Quick links

| Doc | Purpose |
|-----|---------|
| [DOCUMENTATION_MAP.md](DOCUMENTATION_MAP.md) | Master index with role-based reading paths |
| [PRODUCT.md](PRODUCT.md) | Business context, user roles, domain rules, constraints |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, request flow, LangGraph pipeline |
| [FRONTEND_BACKEND_COLLABORATION.md](FRONTEND_BACKEND_COLLABORATION.md) | API contract, casing conventions, ownership |
| [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) | Docker setup, local dev, env vars, troubleshooting |
| [TESTING.md](TESTING.md) | Test strategy, commands, where new tests go |
| [PATIENT_DATA.md](PATIENT_DATA.md) | Patient file schema, naming, safety rules |
| [CODE_QUALITY.md](CODE_QUALITY.md) | Layering, type safety, validation, doc maintenance |

## Plans

Implementation plans live in [`plans/`](plans/). Use the `/create-plan` Cursor command to generate new plans following the standard template.

| Plan | Topic |
|------|-------|
| [PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md](plans/PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md) | Original chat prototype implementation |
| [PLAN_STREAMING_AND_THINKING_DISPLAY.md](plans/PLAN_STREAMING_AND_THINKING_DISPLAY.md) | SSE streaming and thinking UI |
| [PLAN_AI_DOCUMENTATION_STRUCTURE.md](plans/PLAN_AI_DOCUMENTATION_STRUCTURE.md) | This documentation system |

## Conventions

- **One source of truth per concept.** Each doc has a declared scope; update the right file, don't duplicate.
- **Keep docs thin.** If a topic can't sustain durable guidance, it belongs in `CLAUDE.md` or `README.md`, not a standalone file.
- **Plans go in `plans/`.** Name them `PLAN_<SHORT_SLUG>.md`.
