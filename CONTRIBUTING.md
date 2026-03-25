# Contributing

Thanks for your interest in contributing to NextFlow.

## Development Setup

1. Install dependencies:
   - `npm ci`
2. Copy environment file:
   - `cp .env.example .env`
3. Start development server:
   - `npm run dev`

## Branching

1. Create a feature branch from `main`.
2. Keep PRs focused and small where possible.
3. Write clear commit messages with scope and intent.

## Quality Gates

Run these before opening a PR:

- `npm run lint`
- `npm run typecheck`
- `npm run prettier-check`

If formatting fails, run:

- `npm run format`

## Pull Requests

1. Describe what changed and why.
2. Include screenshots or recordings for UI changes.
3. Mention any tradeoffs and follow-up work.
4. Link related issues if applicable.

## Security

Do not disclose vulnerabilities publicly. Follow reporting guidance in
SECURITY.md.

## Code of Conduct

By participating, you agree to follow CODE_OF_CONDUCT.md.
