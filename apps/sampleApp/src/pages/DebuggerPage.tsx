import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useContexts } from "../hooks/useContexts";
import { useWorkflows } from "../hooks/useWorkflows";
import { useScheduler } from "../hooks/useScheduler";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { executeEvent, type DeliveryResult } from "../api/execute";
import { deleteContext } from "../api/contexts";
import { fireScheduledEvent, deleteScheduledEvent } from "../api/scheduler";
import { deleteSubscription } from "../api/subscriptions";
import { toaster } from "../components/Toaster";
import {
  Badge,
  Box,
  Button,
  Container,
  Field,
  Flex,
  Grid,
  Heading,
  Input,
  Link,
  Switch,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";

export function DebuggerPage() {
  const { contexts, isLoading, error: contextsError, refetch } = useContexts();
  const { workflows } = useWorkflows();
  const {
    scheduledEvents,
    isLoading: schedulerLoading,
    refetch: refetchScheduler,
  } = useScheduler();
  const {
    subscriptions,
    isLoading: subscriptionsLoading,
    refetch: refetchSubscriptions,
  } = useSubscriptions();

  const [subjectId, setSubjectId] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventData, setEventData] = useState("{}");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    id: string;
    time: number;
    deliveries: DeliveryResult[];
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedContext, setExpandedContext] = useState<string | null>(null);
  const [firingId, setFiringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [autoFire, setAutoFire] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const autoFireRef = useRef(false);
  const autoFiringRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep ref in sync with state so the interval callback sees the latest value
  useEffect(() => {
    autoFireRef.current = autoFire;
  }, [autoFire]);

  // subjectId is injected from the Subject ID field, so it must not be set in the JSON
  const eventDataHasSubjectId = (() => {
    if (!eventData.trim()) return false;
    try {
      const parsed = JSON.parse(eventData);
      return (
        parsed !== null &&
        typeof parsed === "object" &&
        Object.prototype.hasOwnProperty.call(parsed, "subjectId")
      );
    } catch {
      return false;
    }
  })();

  const autoFireDueEvents = useCallback(async () => {
    if (!autoFireRef.current || autoFiringRef.current) return;

    const now = Date.now();
    const dueEvents = scheduledEvents.filter((e) => e.fireAt <= now);
    if (dueEvents.length === 0) return;

    autoFiringRef.current = true;
    try {
      for (const entry of dueEvents) {
        await fireScheduledEvent(entry.scheduleId);
        toaster.create({
          title: "Event auto-fired",
          description: `${entry.event.type} (${entry.event.data?.subjectId || "—"})`,
          type: "info",
          duration: 3000,
        });
      }
      refetchScheduler();
      refetch();
      refetchSubscriptions();
    } catch (err) {
      toaster.create({
        title: "Auto-fire failed",
        description: err instanceof Error ? err.message : "Unknown error",
        type: "error",
        duration: 5000,
      });
    } finally {
      autoFiringRef.current = false;
    }
  }, [scheduledEvents, refetchScheduler, refetch, refetchSubscriptions]);

  // Poll and auto-fire every 2 seconds
  useEffect(() => {
    if (!autoFire) return;
    const interval = setInterval(() => {
      refetchScheduler();
      autoFireDueEvents();
    }, 2000);
    return () => clearInterval(interval);
  }, [autoFire, autoFireDueEvents, refetchScheduler]);

  const workflowMap = new Map(workflows.map((w) => [w.id, w]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      let parsedData: Record<string, unknown> = {};
      if (eventData.trim()) {
        try {
          parsedData = JSON.parse(eventData);
        } catch {
          throw new Error("Invalid JSON in event data");
        }
      }

      if (
        parsedData !== null &&
        typeof parsedData === "object" &&
        Object.prototype.hasOwnProperty.call(parsedData, "subjectId")
      ) {
        throw new Error(
          'Remove "subjectId" from Event Data — it is injected from the Subject ID field above.'
        );
      }

      const result = await executeEvent(eventType, subjectId, parsedData);
      setSubmitResult({
        id: result.event.id,
        time: result.event.time,
        deliveries: result.deliveries ?? [],
      });
      refetch();
      refetchScheduler();
      refetchSubscriptions();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to execute event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContext = async (
    subjectId: string,
    workflowId: string,
    instanceId: string
  ) => {
    if (!confirm("Are you sure you want to delete this context?")) return;

    try {
      await deleteContext(subjectId, workflowId, instanceId);
      setExpandedContext(null);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete context");
    }
  };

  const getContextKey = (ctx: { workflowId: string; instanceId: string }) =>
    `${ctx.workflowId}-${ctx.instanceId}`;

  const handleFire = async (scheduleId: string) => {
    setFiringId(scheduleId);
    try {
      await fireScheduledEvent(scheduleId);
      refetchScheduler();
      refetch();
      refetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to fire event");
    } finally {
      setFiringId(null);
    }
  };

  const handleDeleteScheduledEvent = async (scheduleId: string) => {
    if (!confirm("Delete this scheduled event?")) return;

    setDeletingId(scheduleId);
    try {
      await deleteScheduledEvent(scheduleId);
      refetchScheduler();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm("Remove this subscription?")) return;

    try {
      await deleteSubscription(id);
      refetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove subscription");
    }
  };

  const formatTimeToFire = useCallback((fireAt: number) => {
    const diff = fireAt - now;
    const absDiff = Math.abs(diff);
    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    let label: string;
    if (hours > 0) label = `${hours}h ${minutes % 60}m`;
    else if (minutes > 0) label = `${minutes}m ${seconds % 60}s`;
    else label = `${seconds}s`;

    return diff <= 0 ? `${label} ago` : `in ${label}`;
  }, [now]);

  return (
    <Container maxW="7xl" p="6">
      <Box mb="6">
        <Heading size="xl">Debugger</Heading>
      </Box>

      <Grid gridTemplateColumns="400px 1fr" gap="6">
        <Box>
        {/* Event Creator */}
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" p="5">
          <Heading size="md" mb="4">Event Creator</Heading>
          <form onSubmit={handleSubmit}>
            <Field.Root mb="4">
              <Field.Label fontSize="sm" fontWeight="500" color="gray.700">
                Subject ID
              </Field.Label>
              <Input
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                placeholder="e.g., user-123"
                required
              />
            </Field.Root>
            <Field.Root mb="4">
              <Field.Label fontSize="sm" fontWeight="500" color="gray.700">
                Event Type
              </Field.Label>
              <Input
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g., user_signup"
                required
              />
            </Field.Root>
            <Field.Root mb="4">
              <Field.Label fontSize="sm" fontWeight="500" color="gray.700">
                Event Data (JSON)
              </Field.Label>
              <Textarea
                value={eventData}
                onChange={(e) => setEventData(e.target.value)}
                placeholder='{"key": "value"}'
                minH="120px"
                fontFamily="mono"
                resize="vertical"
                borderColor={eventDataHasSubjectId ? "red.400" : undefined}
              />
              {eventDataHasSubjectId && (
                <Text fontSize="xs" color="red.500" mt="1">
                  Remove "subjectId" from the event data — it is injected from the Subject ID field above.
                </Text>
              )}
            </Field.Root>
            <Button
              type="submit"
              colorPalette="blue"
              disabled={isSubmitting || eventDataHasSubjectId}
            >
              {isSubmitting ? "Sending..." : "Send Event"}
            </Button>
          </form>

          {submitResult && (
            <Box bg="green.100" color="green.800" p="3" borderRadius="md" mt="4" fontSize="sm" fontFamily="mono" whiteSpace="pre-wrap">
              Event sent successfully!{"\n"}ID: {submitResult.id}{"\n"}Time: {new Date(submitResult.time).toISOString()}
              {submitResult.deliveries.length > 0 && (
                <Box mt="2" pt="2" borderTop="1px solid" borderColor="green.300">
                  Subscription deliveries (fire them from Scheduled Events to
                  resume the subscribers):
                  {submitResult.deliveries.map((delivery, index) => (
                    <Text key={index} fontSize="xs" mt="1">
                      → {delivery.subjectId} / {delivery.workflowId} @ {delivery.nodeId}{" "}
                      <Badge colorPalette="blue" variant="solid" size="xs">
                        scheduled
                      </Badge>
                    </Text>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {submitError && (
            <Box bg="red.50" color="red.600" p="3" borderRadius="md" mt="4" fontSize="sm">
              {submitError}
            </Box>
          )}
        </Box>

        {/* Scheduled Events */}
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" p="5" mt="6">
          <Flex justify="space-between" align="center" mb="4">
            <Heading size="md">Scheduled Events</Heading>
            <Flex align="center" gap="3">
              <Switch.Root
                size="sm"
                colorPalette="green"
                checked={autoFire}
                onCheckedChange={(e) => setAutoFire(e.checked)}
              >
                <Switch.HiddenInput />
                <Switch.Control />
                <Switch.Label fontSize="xs" color="gray.600">Auto-fire</Switch.Label>
              </Switch.Root>
              <Button variant="solid" colorPalette="gray" size="sm" onClick={refetchScheduler}>
                Refresh
              </Button>
            </Flex>
          </Flex>

          {schedulerLoading ? (
            <Text textAlign="center" py="4" color="gray.500" fontSize="sm">
              Loading...
            </Text>
          ) : scheduledEvents.length === 0 ? (
            <Text textAlign="center" py="4" color="gray.500" fontSize="sm">
              No scheduled events.
            </Text>
          ) : (
            <Box>
              {scheduledEvents.map((entry) => {
                const isPast = entry.fireAt <= now;
                return (
                  <Flex
                    key={entry.scheduleId}
                    justify="space-between"
                    align="center"
                    p="3"
                    borderBottom="1px solid"
                    borderColor="gray.100"
                  >
                    <Box>
                      <Text fontSize="sm" fontWeight="500">
                        {entry.event.type}
                        {entry.event.delivery ? (
                          <Badge colorPalette="purple" variant="solid" size="xs" ml="2">
                            delivery
                          </Badge>
                        ) : null}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Subject: {entry.event.data?.subjectId || "—"}
                      </Text>
                      <Text fontSize="xs" color={isPast ? "orange.500" : "gray.500"}>
                        {formatTimeToFire(entry.fireAt)}
                      </Text>
                    </Box>
                    <Flex align="center" gap="2">
                      <Button
                        size="xs"
                        colorPalette={isPast ? "blue" : "gray"}
                        disabled={!isPast || firingId === entry.scheduleId}
                        onClick={() => handleFire(entry.scheduleId)}
                      >
                        {firingId === entry.scheduleId ? "Firing..." : "Fire"}
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        colorPalette="red"
                        disabled={deletingId === entry.scheduleId}
                        onClick={() => handleDeleteScheduledEvent(entry.scheduleId)}
                      >
                        {deletingId === entry.scheduleId ? "Deleting..." : "Delete"}
                      </Button>
                    </Flex>
                  </Flex>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Subscriptions */}
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" p="5" mt="6">
          <Flex justify="space-between" align="center" mb="4">
            <Heading size="md">Subscriptions</Heading>
            <Button variant="solid" colorPalette="gray" size="sm" onClick={refetchSubscriptions}>
              Refresh
            </Button>
          </Flex>

          {subscriptionsLoading ? (
            <Text textAlign="center" py="4" color="gray.500" fontSize="sm">
              Loading...
            </Text>
          ) : subscriptions.length === 0 ? (
            <Text textAlign="center" py="4" color="gray.500" fontSize="sm">
              No active subscriptions. An instance parked on a trigger with a
              match section registers one.
            </Text>
          ) : (
            <Box>
              {subscriptions.map((sub) => (
                <Flex
                  key={sub.id}
                  justify="space-between"
                  align="center"
                  p="3"
                  borderBottom="1px solid"
                  borderColor="gray.100"
                >
                  <Box>
                    <Text fontSize="sm" fontWeight="500">
                      {sub.eventType}{" "}
                      <Badge
                        colorPalette={sub.matchSubjectId === "*" ? "orange" : "purple"}
                        variant="subtle"
                      >
                        {sub.matchSubjectId === "*" ? "any subject" : sub.matchSubjectId}
                      </Badge>
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      → {sub.subjectId} / {sub.workflowId} @ {sub.nodeId}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      since {new Date(sub.createdAt).toLocaleString()}
                    </Text>
                  </Box>
                  <Button
                    size="xs"
                    variant="subtle"
                    colorPalette="red"
                    onClick={() => handleDeleteSubscription(sub.id)}
                  >
                    Remove
                  </Button>
                </Flex>
              ))}
            </Box>
          )}
        </Box>
        </Box>

        {/* Workflow Instances */}
        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" p="5">
          <Flex justify="space-between" align="center" mb="4">
            <Heading size="md">Workflow Instances</Heading>
            <Button variant="solid" colorPalette="gray" onClick={refetch}>
              Refresh
            </Button>
          </Flex>

          {contextsError && (
            <Box bg="red.50" color="red.600" p="3" borderRadius="md" mb="4" fontSize="sm">
              Error: {contextsError.message}
            </Box>
          )}

          {isLoading ? (
            <Text textAlign="center" py="8" color="gray.500">
              Loading contexts...
            </Text>
          ) : contexts.length === 0 ? (
            <Text textAlign="center" py="8" color="gray.500">
              No workflow instances yet. Send an event to start a workflow.
            </Text>
          ) : (
            <Table.Root size="sm" interactive>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Workflow</Table.ColumnHeader>
                  <Table.ColumnHeader>Subject ID</Table.ColumnHeader>
                  <Table.ColumnHeader>Current Node</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {contexts.map((ctx) => {
                  const key = getContextKey(ctx);
                  const workflow = workflowMap.get(ctx.workflowId);
                  const isExpanded = expandedContext === key;

                  return (
                    <React.Fragment key={key}>
                      <Table.Row
                        cursor="pointer"
                        onClick={() =>
                          setExpandedContext(isExpanded ? null : key)
                        }
                      >
                        <Table.Cell>
                          <Link
                            asChild
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <RouterLink to={`/workflows/${ctx.workflowId}`}>
                              <Text fontWeight="500" color="blue.500">
                                {workflow?.name || "Unknown"}
                              </Text>
                              <Text fontSize="2xs" color="gray.400" fontFamily="mono">
                                {ctx.workflowId}
                              </Text>
                            </RouterLink>
                          </Link>
                        </Table.Cell>
                        <Table.Cell>{ctx.subjectId}</Table.Cell>
                        <Table.Cell fontFamily="mono">
                          {ctx.currentNodeId || "-"}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge
                            colorPalette={ctx.isCompleted ? "green" : "yellow"}
                            variant="subtle"
                          >
                            {ctx.isCompleted ? "Completed" : "Active"}
                          </Badge>
                          {!ctx.isCompleted &&
                            (ctx.subscriptions?.length ?? 0) > 0 && (
                              <Badge
                                colorPalette="purple"
                                variant="subtle"
                                ml="1"
                                title={ctx.subscriptions
                                  ?.map((s) => `${s.eventType} ← ${s.matchSubjectId}`)
                                  .join(", ")}
                              >
                                Subscribed
                              </Badge>
                            )}
                        </Table.Cell>
                      </Table.Row>
                      {isExpanded && (
                        <Table.Row>
                          <Table.Cell colSpan={4} p="0" px="3" pb="4">
                            <Box
                              bg="gray.50"
                              p="4"
                              borderRadius="md"
                              mt="4"
                              fontSize="xs"
                              fontFamily="mono"
                              whiteSpace="pre-wrap"
                              wordBreak="break-all"
                              maxH="400px"
                              overflow="auto"
                            >
                              {JSON.stringify(ctx, null, 2)}
                            </Box>
                            <Flex gap="2" mt="3">
                              <Button
                                size="xs"
                                variant="subtle"
                                colorPalette="red"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteContext(
                                    ctx.subjectId,
                                    ctx.workflowId,
                                    ctx.instanceId
                                  );
                                }}
                              >
                                Delete Instance
                              </Button>
                            </Flex>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </React.Fragment>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Grid>
    </Container>
  );
}
