import { Badge, Box, Grid, Heading, Progress, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchLecturerProctoringEvents, type ProctoringEventRecord } from "../../lib/examApi";
import type { LecturerLayoutOutletContext } from "./LecturerDashboardLayout";
import {
  flaggedStudentMetrics,
  lecturerAverageIntegrityScore,
  suspiciousBreakdownMetrics,
  type FlaggedStudentMetric,
  type SuspiciousBreakdownMetric,
} from "./lecturerDashboardData";

function severityPenalty(severity: ProctoringEventRecord["severity"]) {
  if (severity === "high") return 12;
  if (severity === "medium") return 6;
  return 2;
}

function getBreakdownLabel(eventType: string) {
  if (eventType.includes("tab_switch") || eventType.includes("window_blur") || eventType.includes("fullscreen")) {
    return "Focus / tab violations";
  }

  if (eventType.includes("speech") || eventType.includes("noise") || eventType.includes("microphone")) {
    return "Sound anomalies";
  }

  if (eventType.includes("face_not_detected")) {
    return "Face not detected";
  }

  if (eventType.includes("multiple_faces")) {
    return "Multiple face detection";
  }

  if (eventType.includes("shortcut") || eventType.includes("clipboard") || eventType.includes("context_menu")) {
    return "Restricted action attempts";
  }

  if (eventType.includes("network_offline")) {
    return "Connectivity anomalies";
  }

  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildFlaggedStudents(events: ProctoringEventRecord[]) {
  const byStudent = new Map<string, { id: string; studentName: string; flagCount: number; penalty: number; eventCount: number }>();

  for (const event of events) {
    const key = event.studentId;
    const current = byStudent.get(key) ?? {
      id: `metric-${event.studentId}`,
      studentName: event.studentFullName ?? event.studentEmail,
      flagCount: 0,
      penalty: 0,
      eventCount: 0,
    };

    current.eventCount += 1;
    current.penalty += severityPenalty(event.severity);

    if (event.severity === "high" || event.severity === "medium") {
      current.flagCount += 1;
    }

    byStudent.set(key, current);
  }

  const metrics = [...byStudent.values()]
    .map((item) => ({
      id: item.id,
      studentName: item.studentName,
      flagCount: item.flagCount,
      averageIntegrityScore: Math.max(0, 100 - Math.round(item.penalty / Math.max(1, item.eventCount))),
    }))
    .sort((first, second) => {
      if (first.flagCount !== second.flagCount) {
        return second.flagCount - first.flagCount;
      }
      return second.averageIntegrityScore - first.averageIntegrityScore;
    })
    .slice(0, 8);

  return metrics satisfies FlaggedStudentMetric[];
}

function buildSuspiciousBreakdown(events: ProctoringEventRecord[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    const label = getBreakdownLabel(event.eventType);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const metrics = [...counts.entries()]
    .map(([label, count], index) => ({
      id: `breakdown-${index}-${label}`,
      label,
      count,
    }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 10);

  return metrics satisfies SuspiciousBreakdownMetric[];
}

function computeAverageIntegrity(events: ProctoringEventRecord[]) {
  if (events.length === 0) {
    return lecturerAverageIntegrityScore;
  }

  const totalPenalty = events.reduce((total, event) => total + severityPenalty(event.severity), 0);
  return Math.max(0, Math.round(100 - totalPenalty / events.length));
}

export default function LecturerReportsPage() {
  const { user } = useOutletContext<LecturerLayoutOutletContext>();
  const [events, setEvents] = useState<ProctoringEventRecord[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [reportsFeedback, setReportsFeedback] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setReportsFeedback(null);

    try {
      const fetchedEvents = await fetchLecturerProctoringEvents(user, { limit: 800 });
      setEvents(fetchedEvents);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load report analytics right now.";
      setReportsFeedback(message);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [user]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const flaggedStudents = useMemo(() => {
    if (events.length === 0) {
      return flaggedStudentMetrics;
    }

    const generated = buildFlaggedStudents(events);
    return generated.length > 0 ? generated : flaggedStudentMetrics;
  }, [events]);

  const suspiciousBreakdown = useMemo(() => {
    if (events.length === 0) {
      return suspiciousBreakdownMetrics;
    }

    const generated = buildSuspiciousBreakdown(events);
    return generated.length > 0 ? generated : suspiciousBreakdownMetrics;
  }, [events]);

  const averageIntegrityScore = useMemo(() => {
    if (events.length === 0) {
      return lecturerAverageIntegrityScore;
    }

    return computeAverageIntegrity(events);
  }, [events]);

  const totalBreakdownCount = suspiciousBreakdown.reduce((total, metric) => total + metric.count, 0);

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Reports
        </Heading>
        <Text color="gray.600">Analyze risk trends, student integrity distribution, and suspicious behavior patterns.</Text>
      </Box>

      {reportsFeedback ? (
        <Box rounded="xl" border="1px solid" borderColor="orange.300" bg="orange.50" px={4} py={3}>
          <Text fontSize="sm" color="orange.800">
            {reportsFeedback}
          </Text>
        </Box>
      ) : null}

      <Text fontSize="sm" color="gray.600">
        {isLoadingEvents
          ? "Loading latest proctoring metrics..."
          : events.length > 0
            ? `Using ${events.length} recorded proctoring events from active sessions.`
            : "No live proctoring events yet. Showing baseline sample analytics."}
      </Text>

      <Grid templateColumns={{ base: "1fr", xl: "1.25fr 1fr" }} gap={4}>
        <Box
          rounded="2xl"
          border="1px solid"
          borderColor="rgba(15, 23, 42, 0.08)"
          bg="white"
          shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
          p={5}
        >
          <Heading size="sm" color="gray.800" mb={4}>
            Most Flagged Students
          </Heading>

          <VStack align="stretch" gap={3}>
            {flaggedStudents.map((student, index) => (
              <Grid key={student.id} templateColumns="38px 1.8fr 1fr 1fr" alignItems="center" gap={3}>
                <Box
                  rounded="full"
                  w="38px"
                  h="38px"
                  bg="gray.100"
                  border="1px solid"
                  borderColor="gray.200"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="gray.700"
                  fontWeight="bold"
                  fontSize="sm"
                >
                  {index + 1}
                </Box>
                <Text color="gray.800" fontWeight="semibold">
                  {student.studentName}
                </Text>
                <Badge colorPalette={student.flagCount > 10 ? "red" : "orange"} w="fit-content">
                  {student.flagCount} flags
                </Badge>
                <Text color="gray.700" fontSize="sm">
                  Integrity {student.averageIntegrityScore}%
                </Text>
              </Grid>
            ))}
          </VStack>
        </Box>

        <Box
          rounded="2xl"
          border="1px solid"
          borderColor="rgba(15, 23, 42, 0.08)"
          bg="white"
          shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
          p={5}
          h="fit-content"
        >
          <Heading size="sm" color="gray.800" mb={2}>
            Average Integrity Score
          </Heading>
          <Text fontSize="2xl" fontWeight="bold" color="teal.700" mb={3}>
            {averageIntegrityScore}%
          </Text>
          <Progress.Root value={averageIntegrityScore} colorPalette="teal" rounded="md" size="md">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Text fontSize="sm" color="gray.600" mt={3}>
            Aggregated from proctored exams across your current teaching load.
          </Text>
        </Box>
      </Grid>

      <Box
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        p={5}
      >
        <Heading size="sm" color="gray.800" mb={4}>
          Suspicious Activity Breakdown
        </Heading>
        <VStack align="stretch" gap={4}>
          {suspiciousBreakdown.map((metric) => {
            const ratio = totalBreakdownCount > 0 ? Math.round((metric.count / totalBreakdownCount) * 100) : 0;

            return (
              <Box key={metric.id}>
                <Grid templateColumns={{ base: "1fr auto auto", md: "1.4fr auto auto" }} gap={3} alignItems="center" mb={2}>
                  <Text color="gray.800" fontWeight="semibold">
                    {metric.label}
                  </Text>
                  <Text color="gray.600" fontSize="sm">
                    {metric.count} cases
                  </Text>
                  <Badge colorPalette="teal">{ratio}%</Badge>
                </Grid>
                <Progress.Root value={ratio} colorPalette="teal" rounded="md" size="sm">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Box>
            );
          })}
        </VStack>
      </Box>
    </VStack>
  );
}
