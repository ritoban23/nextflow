# Project Structure

## Top-Level Layout

- `app/`: Next.js App Router pages, layouts, and API route handlers
- `components/`: Reusable UI and node components
- `lib/`: Core runtime logic, utilities, data access, and state
- `src/trigger/`: Trigger.dev task definitions
- `prisma/`: Prisma schema and migration-related files
- `generated/`: Generated client artifacts (not hand-edited)
- `public/`: Static assets
- `docs/`: Architecture, release process, and standards docs
- `packages/`: Incrementally extracted internal packages
- `.github/`: CI workflows, templates, and repository automation config

## Key Runtime Paths

- Workflow editor: `app/(dashboard)/workflow/page.tsx`
- Auth pages: `app/(auth)/**`
- Run APIs: `app/api/runs/**`
- Workflow APIs: `app/api/workflows/**`
- Trigger tasks: `src/trigger/tasks.ts`
- Workflow execution core package: `packages/workflow-core/src/executeWorkflow.ts`

## Conventions

1. Keep business logic changes isolated from visual-only UI changes.
2. Prefer typed boundaries at API and task edges.
3. Keep generated files out of manual refactors.
4. Enforce quality checks through `npm run check` before merge.
