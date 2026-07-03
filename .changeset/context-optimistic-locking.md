---
"@omega-flow/types": minor
"@omega-flow/engine": minor
"@omega-flow/store-aws": minor
---

Add optimistic locking to `DynamoDBWorkflowMemory`. `Context` gains an optional `version` that the engine round-trips through `WorkflowModel.setContext`/`getContext`; `saveContext` now performs a conditional write on that version and throws the new `OptimisticLockError` on a concurrent-modification conflict. Backward compatible: in-memory usage and never-persisted instances leave `version` undefined.
