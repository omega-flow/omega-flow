---
"@omega-flow/store-aws": minor
---

**BREAKING**: Remove `EventBusWorkflowScheduler` (and its config type). `SqsFifoWorkflowScheduler` is the scheduler for AWS deployments — it targets the SQS FIFO queue directly, preserving per-subject `MessageGroupId` ordering, which the EventBridge-bus route could not guarantee. Migrate by replacing `EventBusWorkflowScheduler({ client, eventBusArn, roleArn })` with `SqsFifoWorkflowScheduler({ client, queueArn, roleArn, messageGroupIdExtractor })` and pointing the schedule target role's IAM at `sqs:SendMessage` on the queue instead of `events:PutEvents` on the bus.
