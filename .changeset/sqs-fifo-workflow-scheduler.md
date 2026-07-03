---
"@omega-flow/store-aws": minor
---

Add `SqsFifoWorkflowScheduler`: an EventBridge Scheduler-backed `WorkflowScheduler` that targets an SQS FIFO queue directly, setting `MessageGroupId` so Wait-node wake-ups stay strictly ordered and serialized with the webhook events for the same subject. Exported alongside `EventBusWorkflowScheduler`.
