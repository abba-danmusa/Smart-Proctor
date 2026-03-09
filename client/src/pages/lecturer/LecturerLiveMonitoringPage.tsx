import { Badge, Box, Button, Flex, Grid, Heading, Portal, Text, VStack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { liveMonitoringRecords, type EventSeverity, type LiveMonitoringRecord } from "./lecturerDashboardData";

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

export default function LecturerLiveMonitoringPage() {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const selectedRecord = useMemo(
    () => liveMonitoringRecords.find((record) => record.id === selectedRecordId) ?? null,
    [selectedRecordId],
  );

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
          {liveMonitoringRecords.map((record) => (
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

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <Box
                  rounded="xl"
                  border="1px solid"
                  borderColor="gray.200"
                  bg="gray.50"
                  p={4}
                  minH="220px"
                >
                  <Heading size="sm" color="gray.800" mb={3}>
                    Recorded Screenshots
                  </Heading>
                  <VStack align="stretch" gap={3}>
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
                        <Text fontSize="sm" color="gray.700">
                          {shot.reason}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>

                <Box
                  rounded="xl"
                  border="1px solid"
                  borderColor="gray.200"
                  bg="gray.50"
                  p={4}
                  minH="220px"
                >
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
