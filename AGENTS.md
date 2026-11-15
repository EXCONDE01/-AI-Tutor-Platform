# CRITICAL RULES - MUST FOLLOW

## RESPONSES

- Keep responses concise and to the point - unless the user asks otherwise

## PLANNING MODE

- Always ask clarifying questions
- Never assume design, tech stack or features
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user

## CHANGE / EDIT MODE

- Never implement features yourself when possible - use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently
- When using sub-agents to implement features, act as a coordinator only
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always run commands like lint, type check and next build to check code quality

## DATABASE SCHEMA CHANGES

- Whenever you make changes to the database schema, ALWAYS run the drizzle generate and migrate commands
- NEVER run drizzle push!

## TESTING

- Use any testing tools, libraries available to the project for testing your changes
- Never assume your changes simply work, always test!
- If the project does not have any testing tools, scripts, MCP tools, skills, etc. available for testing, ask the user whether testing should be skipped.

## MASTER PROJECT PLAN

All work on this project must follow `MASTER_PROJECT_PLAN.md`, which defines:

- **Project Scope** (§1): AI Tutor for Teachers & Students (Web + PWA), multi-tenant, FERPA/COPPA compliant
- **Architecture** (§2): Next.js + PWA (Vercel), Neon Functions, Neon Lakebase Postgres, Neon Realtime, Neon Object Storage, OpenRouter
- **Technical Decisions** (§3): LTI 1.3, Vercel AI SDK, Neon Auth (Managed Better Auth), SSE streaming, drizzle-kit migrations (never `push`), Web Push API
- **Implementation Phases** (§4): Phase 1 Foundation → Phase 6 Compliance & Polish
- **Database Development** (§5): `db/schema/`, migrations, RLS, pgvector, key tables and RLS policies
- **Web UI Development** (§6): component structure and app routes under `components/` and `app/`
- **Validation & Quality Gates** (§7): typecheck, lint, build, drizzle generate/migrate, LTI test, PWA audit, push test, realtime test, load test
- **Critical Blockers** (§8): resolve OpenRouter API key, LTI keys, Google/Microsoft OAuth, VAPID keys, Neon project before coding
- **Cost Estimate** (§9): pilot ~$10-50/mo
- **Open Questions** (§10): standards alignment, tutor persona, student auth, pilot scope, push triggers, language support, analytics depth
- **Next Deliverables** (§11): pick one of 6 deliverables to start

Before starting any work, confirm which phase and deliverable apply, and check §8 blockers are resolved.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
