# @nextflow/workflow-core

Core workflow execution logic extracted from `lib/` to keep root-level
application code lean and easier to navigate.

## Scope

- Workflow graph execution orchestration
- Node execution sequencing and run status updates
- Trigger.dev invocation and execution persistence integration

## Notes

This package is currently consumed through a compatibility shim at
`lib/executeWorkflow.ts`.
