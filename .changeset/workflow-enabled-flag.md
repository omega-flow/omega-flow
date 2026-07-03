---
"@omega-flow/types": minor
"@omega-flow/engine": minor
---

Add `WorkflowOptions.enabled` so a workflow can be switched off without deleting it. `WorkflowManager.processEvent` skips any workflow with `options.enabled === false` (neither starting new instances nor resuming active ones; their contexts are preserved). Backward compatible: `undefined` is treated as enabled.
