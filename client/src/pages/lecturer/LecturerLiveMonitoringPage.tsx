import { Badge, Box, Button, Flex, Grid, Heading, Portal, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchLecturerProctoringEvents, type ProctoringEventRecord } from "../../lib/examApi";
import {
  calculateIntegrityScore,
  calculateViolationScore,
  getProctoringBreakdownLabel,
  getProctoringEventLabel,
  getReviewColor,
  getReviewRecommendation,
} from "../../lib/proctoring";
import type { LecturerLayoutOutletContext } from "./LecturerDashboardLayout";
import {
  liveMonitoringRecords,
  type CameraStatus,
  type EventSeverity,
  type FaceStatus,
  type LiveMonitoringRecord,
} from "./lecturerDashboardData";

interface MonitoringGroup {
  examId: string;
  studentId: string;
  studentName: string;
  examTitle: string;
  events: ProctoringEventRecord[];
}

function getCameraStatusColor(status: LiveMonitoringRecord["cameraStatus"]) {
  if (status === "online") return "green";
  if (status === "unstable") return "orange";
  return "red";
}

function getCameraStatusLabel(status: LiveMonitoringRecord["cameraStatus"]) {
  if (status === "online") return "Online";
  if (status === "unstable") return "Unstable";
  return "Offline";
}

function getFaceStatusColor(status: LiveMonitoringRecord["faceStatus"]) {
  if (status === "verified") return "green";
  if (status === "multiple_faces") return "red";
  return "orange";
}

function getFaceStatusLabel(status: LiveMonitoringRecord["faceStatus"]) {
  if (status === "verified") return "Verified";
  if (status === "multiple_faces") return "Multiple Faces";
  return "Face Not Detected";
}

function getSeverityColor(severity: EventSeverity) {
  if (severity === "high") return "red";
  if (severity === "medium") return "orange";
  return "gray";
}

function formatIntegrityColor(score: number) {
  if (score >= 90) return "green";
  if (score >= 75) return "orange";
  return "red";
}

function formatEventTimeLabel(isoDate: string) {
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown time";
  }

  return parsedDate.toLocaleString();
}

function toEventSeverity(severity: ProctoringEventRecord["severity"]): EventSeverity {
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

function inferCameraStatus(events: ProctoringEventRecord[]): CameraStatus {
  const eventTypes = events.map((event) => event.eventType);

  if (eventTypes.some((eventType) => eventType.includes("camera_offline") || eventType.includes("device_access_blocked"))) {
    return "offline";
  }

  if (eventTypes.some((eventType) => eventType.includes("camera") || eventType.includes("fullscreen"))) {
    return "unstable";
  }

  return "online";
}

function inferFaceStatus(events: ProctoringEventRecord[]): FaceStatus {
  if (events.some((event) => event.eventType.includes("multiple_faces"))) {
    return "multiple_faces";
  }

  if (events.some((event) => event.eventType.includes("face_not_detected"))) {
    return "not_detected";
  }

  return "verified";
}

function buildMonitoringRecords(events: ProctoringEventRecord[]) {
  const groupedMap = new Map<string, MonitoringGroup>();

  for (const event of events) {
    const key = `${event.examId}:${event.studentId}`;
    const currentGroup = groupedMap.get(key);

    if (currentGroup) {
      currentGroup.events.push(event);
      continue;
    }

    groupedMap.set(key, {
      examId: event.examId,
      studentId: event.studentId,
      studentName: event.studentFullName ?? event.studentEmail,
      examTitle: event.examTitle ?? "Exam Session",
      events: [event],
    });
  }

  const groupedRecords = [...groupedMap.values()].map((group) => {
    const eventsByRecency = group.events.slice().sort((first, second) => {
      return new Date(second.detectedAt).getTime() - new Date(first.detectedAt).getTime();
    });

    const highCount = eventsByRecency.filter((event) => event.severity === "high").length;
    const mediumCount = eventsByRecency.filter((event) => event.severity === "medium").length;
    const suspiciousEventsCount = highCount + mediumCount;
    const violationScore = calculateViolationScore(eventsByRecency);
    const integrityScore = calculateIntegrityScore(eventsByRecency);
    const breakdownCounts = new Map<string, number>();

    for (const event of eventsByRecency) {
      const label = getProctoringBreakdownLabel(event.eventType);
      breakdownCounts.set(label, (breakdownCounts.get(label) ?? 0) + 1);
    }

    const violationBreakdown = [...breakdownCounts.entries()]
      .map(([label, count], index) => ({
        id: `breakdown-${group.examId}-${group.studentId}-${index}`,
        label,
        count,
      }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 6);

    return {
      id: `live-${group.examId}-${group.studentId}`,
      studentName: group.studentName,
      examTitle: group.examTitle,
      cameraStatus: inferCameraStatus(eventsByRecency),
      faceStatus: inferFaceStatus(eventsByRecency),
      suspiciousEventsCount,
      violationScore,
      integrityScore,
      reviewRecommendation: getReviewRecommendation(violationScore),
      screenshots: eventsByRecency
        .filter((event) => {
          const evidence = event.evidence ?? {};
          const frameDataUrl = evidence["frameDataUrl"];
          return typeof frameDataUrl === "string" && frameDataUrl.length > 0;
        })
        .slice(0, 8)
        .map((event) => ({
          id: `shot-${event.id}`,
          capturedAt: formatEventTimeLabel(event.detectedAt),
          reason: event.message,
          imageUrl: String((event.evidence ?? {})["frameDataUrl"]),
          severity: toEventSeverity(event.severity),
        })),
      activityLogs: eventsByRecency.slice(0, 18).map((event) => ({
        id: `log-${event.id}`,
        timestamp: formatEventTimeLabel(event.detectedAt),
        category: getProctoringBreakdownLabel(event.eventType),
        event: `${getProctoringEventLabel(event.eventType)} - ${event.message}`,
        severity: toEventSeverity(event.severity),
      })),
      violationBreakdown,
      latestDetectedAt: eventsByRecency[0]?.detectedAt ?? "",
    };
  });

  groupedRecords.sort((first, second) => {
    if (first.violationScore !== second.violationScore) {
      return second.violationScore - first.violationScore;
    }

    return new Date(second.latestDetectedAt).getTime() - new Date(first.latestDetectedAt).getTime();
  });

  return groupedRecords.map((record) => {
    const { latestDetectedAt: _latestDetectedAt, ...rest } = record;
    void _latestDetectedAt;
    return rest satisfies LiveMonitoringRecord;
  });
}

export default function LecturerLiveMonitoringPage() {
  const { user } = useOutletContext<LecturerLayoutOutletContext>();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [records, setRecords] = useState<LiveMonitoringRecord[]>(liveMonitoringRecords);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [monitoringFeedback, setMonitoringFeedback] = useState<string | null>(null);

  const selectedRecord = useMemo(() => records.find((record) => record.id === selectedRecordId) ?? null, [records, selectedRecordId]);

  const loadMonitoringRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    setMonitoringFeedback(null);

    try {
      const events = await fetchLecturerProctoringEvents(user, { limit: 600 });
      if (events.length === 0) {
        setRecords(liveMonitoringRecords);
        return;
      }

      const liveRecords = buildMonitoringRecords(events);
      setRecords(liveRecords.length > 0 ? liveRecords : liveMonitoringRecords);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load live monitoring events right now.";
      setMonitoringFeedback(message);
      setRecords(liveMonitoringRecords);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMonitoringRecords();

    const refreshTimer = window.setInterval(() => {
      void loadMonitoringRecords();
    }, 12000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [loadMonitoringRecords]);

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Text
          fontSize="xs"
          fontWeight="bold"
          textTransform="uppercase"
          letterSpacing="0.12em"
          color="teal.600"
          mb={2}
        >
          Live Monitoring
        </Text>
        <Heading size="lg" color="gray.800" mb={1}>
          Active Proctoring Control Center
        </Heading>
        <Text color="gray.600">Watch exam sessions in real-time, inspect suspicious behavior, and review integrity evidence.</Text>
      </Box>

      {monitoringFeedback ? (
        <Box rounded="xl" border="1px solid" borderColor="orange.300" bg="orange.50" px={4} py={3}>
          <Text fontSize="sm" color="orange.800">
            {monitoringFeedback}
          </Text>
        </Box>
      ) : null}

      <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
        <Text fontSize="sm" color="gray.600">
          {isLoadingRecords
            ? "Refreshing proctoring stream..."
            : "Live suspicious events update automatically every 12 seconds."}
        </Text>
        <Button size="sm" variant="outline" colorPalette="teal" onClick={() => void loadMonitoringRecords()} loading={isLoadingRecords}>
          Refresh stream
        </Button>
      </Flex>

      <Box
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        overflowX="auto"
      >
        <Grid
          templateColumns="minmax(230px, 2fr) minmax(130px, 1fr) minmax(170px, 1.3fr) minmax(170px, 1.2fr) minmax(140px, 1fr) minmax(130px, 1fr)"
          gap={4}
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.100"
          fontSize="xs"
          fontWeight="bold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="0.08em"
          minW="980px"
        >
          <Text>Student Name</Text>
          <Text>Camera Status</Text>
          <Text>Face Status</Text>
          <Text>Suspicious Events Count</Text>
          <Text>Integrity Score</Text>
          <Text>View Details</Text>
        </Grid>

        <VStack align="stretch" gap={0} minW="980px">
          {records.map((record) => (
            <Grid
              key={record.id}
              templateColumns="minmax(230px, 2fr) minmax(130px, 1fr) minmax(170px, 1.3fr) minmax(170px, 1.2fr) minmax(140px, 1fr) minmax(130px, 1fr)"
              gap={4}
              px={5}
              py={4}
              borderTopWidth="1px"
              borderColor="gray.100"
              alignItems="center"
            >
              <Box>
                <Text color="gray.800" fontWeight="semibold">
                  {record.studentName}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {record.examTitle}
                </Text>
              </Box>
              <Badge colorPalette={getCameraStatusColor(record.cameraStatus)} w="fit-content">
                {getCameraStatusLabel(record.cameraStatus)}
              </Badge>
              <Badge colorPalette={getFaceStatusColor(record.faceStatus)} w="fit-content">
                {getFaceStatusLabel(record.faceStatus)}
              </Badge>
              <Text color={record.suspiciousEventsCount > 0 ? "orange.700" : "gray.700"} fontWeight="semibold">
                {record.suspiciousEventsCount}
                {typeof record.violationScore === "number" ? ` • V${record.violationScore}` : ""}
              </Text>
              <Badge colorPalette={formatIntegrityColor(record.integrityScore)} w="fit-content">
                {record.integrityScore}%
              </Badge>
              <Button size="sm" colorPalette="teal" variant="outline" onClick={() => setSelectedRecordId(record.id)}>
                View Details
              </Button>
            </Grid>
          ))}
        </VStack>
      </Box>

      {selectedRecord ? (
        <Portal>
          <Box position="fixed" inset={0} bg="blackAlpha.500" zIndex={1200} onClick={() => setSelectedRecordId(null)} />
          <Box position="fixed" inset={0} zIndex={1300} display="flex" alignItems="center" justifyContent="center" p={4}>
            <Box
              w="full"
              maxW="860px"
              maxH="88vh"
              overflowY="auto"
              rounded="2xl"
              border="1px solid"
              borderColor="teal.200"
              bg="white"
              shadow="0 25px 45px rgba(15, 23, 42, 0.22)"
              p={5}
            >
              <Flex justify="space-between" align="center" mb={4} gap={3}>
                <Box>
                  <Heading size="md" color="gray.800" mb={1}>
                    {selectedRecord.studentName}
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    {selectedRecord.examTitle} - Integrity {selectedRecord.integrityScore}%
                  </Text>
                </Box>
                <Button variant="outline" colorPalette="teal" onClick={() => setSelectedRecordId(null)}>
                  Close
                </Button>
              </Flex>

              <Grid templateColumns={{ base: "1fr", md: "repeat(4, minmax(0, 1fr))" }} gap={3} mb={4}>
                <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={3}>
                  <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500" mb={1}>
                    Violation Score
                  </Text>
                  <Heading size="sm" color="gray.800">
                    {selectedRecord.violationScore ?? 0}
                  </Heading>
                </Box>
                <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={3}>
                  <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500" mb={1}>
                    Review Status
                  </Text>
                  <Badge colorPalette={getReviewColor(selectedRecord.violationScore ?? 0)}>
                    {selectedRecord.reviewRecommendation ?? getReviewRecommendation(selectedRecord.violationScore ?? 0)}
                  </Badge>
                </Box>
                <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={3}>
                  <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500" mb={1}>
                    Suspicious Events
                  </Text>
                  <Heading size="sm" color="gray.800">
                    {selectedRecord.suspiciousEventsCount}
                  </Heading>
                </Box>
                <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={3}>
                  <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500" mb={1}>
                    Camera / Face
                  </Text>
                  <Flex gap={2} flexWrap="wrap">
                    <Badge colorPalette={getCameraStatusColor(selectedRecord.cameraStatus)}>{getCameraStatusLabel(selectedRecord.cameraStatus)}</Badge>
                    <Badge colorPalette={getFaceStatusColor(selectedRecord.faceStatus)}>{getFaceStatusLabel(selectedRecord.faceStatus)}</Badge>
                  </Flex>
                </Box>
              </Grid>

              {selectedRecord.violationBreakdown && selectedRecord.violationBreakdown.length > 0 ? (
                <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={4} mb={4}>
                  <Heading size="sm" color="gray.800" mb={3}>
                    Violation Breakdown
                  </Heading>
                  <Flex gap={2} flexWrap="wrap">
                    {selectedRecord.violationBreakdown.map((item) => (
                      <Badge key={item.id} colorPalette="teal" px={3} py={1}>
                        {item.label}: {item.count}
                      </Badge>
                    ))}
                  </Flex>
                </Box>
              ) : null}

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={4} minH="220px">
                  <Heading size="sm" color="gray.800" mb={3}>
                    Recorded Screenshots
                  </Heading>
                  <VStack align="stretch" gap={3}>
                    {selectedRecord.screenshots.length === 0 ? (
                      <Text fontSize="sm" color="gray.600">
                        No screenshot evidence captured yet for this session.
                      </Text>
                    ) : null}
                    {selectedRecord.screenshots.map((shot) => (
                      <Box
                        key={shot.id}
                        rounded="lg"
                        border="1px solid"
                        borderColor="gray.200"
                        bg="white"
                        p={3}
                        shadow="0 5px 14px rgba(15, 23, 42, 0.06)"
                      >
                        {shot.imageUrl ? (
                          <img
                            src={shot.imageUrl}
                            alt={shot.reason}
                            style={{
                              width: "100%",
                              height: "180px",
                              objectFit: "cover",
                              borderRadius: "10px",
                              border: "1px solid #e2e8f0",
                              marginBottom: "8px",
                            }}
                          />
                        ) : (
                          <Box
                            rounded="md"
                            border="1px dashed"
                            borderColor="gray.300"
                            bg="linear-gradient(135deg, #f0f9ff 0%, #e8f7f5 100%)"
                            p={4}
                            mb={2}
                          >
                            <Text fontSize="xs" color="gray.600">
                              Captured frame at {shot.capturedAt}
                            </Text>
                          </Box>
                        )}
                        <Flex justify="space-between" align="center" gap={2} mb={1}>
                          <Text fontSize="xs" color="gray.600">
                            Captured frame at {shot.capturedAt}
                          </Text>
                          {shot.severity ? <Badge colorPalette={getSeverityColor(shot.severity)}>{shot.severity}</Badge> : null}
                        </Flex>
                        <Text fontSize="sm" color="gray.700">
                          {shot.reason}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>

                <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={4} minH="220px">
                  <Heading size="sm" color="gray.800" mb={3}>
                    Activity Logs
                  </Heading>
                  <VStack align="stretch" gap={3}>
                    {selectedRecord.activityLogs.map((log) => (
                      <Box key={log.id} rounded="lg" border="1px solid" borderColor="gray.200" bg="white" p={3}>
                        <Flex align="center" justify="space-between" gap={3} mb={1}>
                          <Text fontSize="sm" color="gray.800" fontWeight="semibold">
                            {log.event}
                          </Text>
                          <Badge colorPalette={getSeverityColor(log.severity)}>{log.severity}</Badge>
                        </Flex>
                        {log.category ? (
                          <Text fontSize="xs" color="teal.700" mb={1}>
                            {log.category}
                          </Text>
                        ) : null}
                        <Text fontSize="sm" color="gray.600">
                          {log.timestamp}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </Grid>
            </Box>
          </Box>
        </Portal>
      ) : null}
    </VStack>
  );
}
