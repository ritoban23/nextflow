# NextFlow

![NextFlow Logo](public/nextflow.png)

NextFlow is a visual workflow builder focused on LLM and media-assisted automation.
It is built around a canvas-style editor with typed node connections, execution
history, and authenticated user-scoped persistence.

## Why This Project Exists

1. Provide a polished, node-based workflow authoring experience.
2. Support LLM and media workflows with execution visibility.
3. Keep UI quality high while preserving strict workflow logic guarantees.

## Tech Stack

1. Next.js App Router + TypeScript
2. React Flow for canvas interactions
3. Clerk for authentication and user identity
4. Prisma + PostgreSQL for persistence
5. Trigger.dev for asynchronous workflow execution
6. Tailwind CSS + Lucide React for UI
7. Zustand for client state management

## Local Development

### Prerequisites

1. Node.js 20+
2. npm (package manager pinned in package.json)

### Setup

```bash
npm ci
cp .env.example .env
```

Populate required environment variables in .env.

### Run

```bash
npm run dev
```

Open http://localhost:3000.

## Quality Commands

```bash
npm run lint
npm run typecheck
npm run prettier-check
npm run format
```

## CI Standards in This Repo

1. CI workflow runs lint, typecheck, and format checks on PRs and main branch pushes.
2. Path-scoped Trigger checks run only when Trigger-related code paths change.
3. Formatting is enforced through Prettier configuration and check scripts.

## Security

See SECURITY.md for vulnerability reporting and response expectations.

## Contributing

1. Keep functional workflow logic unchanged unless explicitly requested.
2. Prefer small, focused PRs with clear scope.
3. Run lint, typecheck, and prettier-check before opening a PR.
