# Release Process

## Branching

1. Branch from `main` for each feature or fix.
2. Keep commits focused and descriptive.
3. Open pull requests early for visibility.

## Pre-merge Checklist

1. `npm run lint`
2. `npm run typecheck`
3. `npm run prettier-check`
4. Verify critical flows manually (auth, workflow editor, run history)

## Merge Strategy

1. Ensure required checks are green.
2. Resolve review comments and approvals.
3. Merge into `main` with clear PR title and summary.

## Post-merge Verification

1. Confirm CI workflows on `main` complete successfully.
2. Smoke test production sign-in and workflow creation paths.
3. Record follow-up issues for non-blocking items.

## Rollback Guidance

1. Revert the problematic commit(s) on `main`.
2. Redeploy and re-run smoke checks.
3. Add a regression test or guard before reintroducing changes.
