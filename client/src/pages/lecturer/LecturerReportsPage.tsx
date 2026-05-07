import { Badge, Box, Grid, Heading, Progress, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchLecturerProctoringEvents, type ProctoringEventRecord } from "../../lib/examApi";
import { calculateIntegrityScore, getProctoringBreakdownLabel, getProctoringPenalty } from "../../lib/proctoring";
import type { LecturerLayoutOutletContext } from "./LecturerDashboardLayout";
import {
  flaggedStudentMetrics,
  lecturerAverageIntegrityScore,
  suspiciousBreakdownMetrics,
  type FlaggedStudentMetric,
  type SuspiciousBreakdownMetric,
} from "./lecturerDashboardData";

function buildFlaggedStudents(events: ProctoringEventRecord[]) {
  const byStudent = new Map<string, { id: string; studentName: string; flagCount: number; events: ProctoringEventRecord[] }>();

  for (const event of events) {
    const key = event.studentId;
    const current = byStudent.get(key) ?? {
      id: `metric-${event.studentId}`,
      studentName: event.studentFullName ?? event.studentEmail,
      flagCount: 0,
      events: [],
    };

    current.events.push(event);

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
      averageIntegrityScore: calculateIntegrityScore(item.events),
      violationScore: item.events.reduce((total, event) => total + getProctoringPenalty(event.eventType, event.severity), 0),
    }))
    .sort((first, second) => {
      if (first.violationScore !== second.violationScore) {
        return second.violationScore - first.violationScore;
      }
      return second.flagCount - first.flagCount;
    })
    .slice(0, 8);

  return metrics.map((metric) => ({
    id: metric.id,
    studentName: metric.studentName,
    flagCount: metric.flagCount,
    averageIntegrityScore: metric.averageIntegrityScore,
  })) satisfies FlaggedStudentMetric[];
}

function buildSuspiciousBreakdown(events: ProctoringEventRecord[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    const label = getProctoringBreakdownLabel(event.eventType);
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

  return calculateIntegrityScore(events);
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
