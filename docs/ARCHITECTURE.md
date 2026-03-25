# Architecture Overview

## Application Layers

1. UI Layer
   - Next.js App Router pages in `app/`
   - Shared presentational components in `components/`
2. State Layer
   - Workflow editor state in Zustand stores under `lib/`
3. Data/API Layer
   - Route handlers in `app/api/**`
   - Persistence through Prisma models and PostgreSQL
4. Async Execution Layer
   - Trigger.dev tasks in `src/trigger/**`

## Core Runtime Flows

1. Authentication
   - Clerk middleware guards private routes.
   - Public routes include landing and auth pages.
2. Workflow Authoring
   - React Flow canvas handles node/edge graph editing.
   - Local editor state is synchronized into server persistence.
3. Workflow Execution
   - API endpoints create and track workflow runs.
   - Trigger tasks process execution work asynchronously.
4. Observability
   - Workflow history and node run states are surfaced in UI.

## Design Principles

1. Keep workflow logic stable during UI iterations.
2. Prefer strongly typed data boundaries across routes and tasks.
3. Ship changes in small, reviewable increments.
4. Require lint, typecheck, and formatting checks before merge.
