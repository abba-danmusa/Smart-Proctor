import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchExams, type ExamRecord } from "../../lib/examApi";
import type { StudentLayoutOutletContext } from "./StudentDashboardLayout";
import { getDeviceStateColor, getDeviceStateLabel, useDeviceStatus } from "./useDeviceStatus";

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Box
      rounded="2xl"
      border="1px solid"
      borderColor="rgba(15, 23, 42, 0.08)"
      bg="white"
      shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
      p={5}
    >
      <Text fontSize="sm" color="gray.500" mb={2}>
        {title}
      </Text>
      <Heading size="md" color="gray.800">
        {value}
      </Heading>
      <Text fontSize="sm" color="gray.600" mt={2}>
        {subtitle}
      </Text>
    </Box>
  );
}

export default function StudentOverviewPage() {
  const { user } = useOutletContext<StudentLayoutOutletContext>();
  const { snapshot, refresh } = useDeviceStatus();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [examFeedback, setExamFeedback] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    setIsLoadingExams(true);
    setExamFeedback(null);

    try {
      const fetchedExams = await fetchExams(user);
      setExams(fetchedExams);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load exams right now.";
      setExamFeedback(message);
    } finally {
      setIsLoadingExams(false);
    }
  }, [user]);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const upcomingExamCount = useMemo(
    () => exams.filter((exam) => (exam.studentStatus ?? "upcoming") === "upcoming").length,
    [exams],
  );
  const completedExamCount = useMemo(
    () => exams.filter((exam) => exam.studentStatus === "completed").length,
    [exams],
  );
  const faceStatus = user.faceCapture ? "Verified" : "Pending";

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Text
          fontSize="xs"
          fontWeight="bold"
          textTransform="uppercase"
          letterSpacing="0.12em"
          color="blue.600"
          mb={2}
        >
          Student Dashboard
        </Text>
        <Heading size="lg" color="gray.800" mb={1}>
          Welcome, {user.fullName}
        </Heading>
        <Text color="gray.600">Track your exams, identity readiness, and proctoring status in one place.</Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
        <MetricCard
          title="Upcoming Exams"
          value={isLoadingExams ? "..." : String(upcomingExamCount)}
          subtitle="Published exams for your registered courses that are not live yet."
        />
        <MetricCard
          title="Completed Exams"
          value={isLoadingExams ? "..." : String(completedExamCount)}
          subtitle="Registered-course exams already submitted."
        />
        <MetricCard
          title="Face Verification Status"
          value={faceStatus}
          subtitle={
            user.faceVerifiedAt
              ? `Last validated ${new Date(user.faceVerifiedAt).toLocaleString()}`
              : "Identity capture required before proctored sessions."
          }
        />
        <MetricCard
          title="System Intelligence"
          value={snapshot.camera === "ready" && snapshot.microphone === "ready" ? "Ready" : "Check Needed"}
          subtitle="Camera/mic health for live proctoring detection."
        />
      </SimpleGrid>

      {examFeedback ? (
        <Box rounded="xl" border="1px solid" borderColor="red.200" bg="red.50" px={4} py={3}>
          <Text fontSize="sm" color="red.800">
            {examFeedback}
          </Text>
        </Box>
      ) : null}

      <Box
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        p={5}
      >
        <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
          <Box>
            <Heading size="sm" color="gray.800">
              Published Exams
            </Heading>
            <Text fontSize="sm" color="gray.600" mt={1}>
              {isLoadingExams
                ? "Loading exam availability..."
                : exams.length > 0
                  ? `${exams.length} exam${exams.length === 1 ? "" : "s"} published for your registered courses.`
                  : "No published exams yet for your registered courses."}
            </Text>
          </Box>
          <Button size="sm" variant="outline" colorPalette="blue" onClick={() => void loadExams()} loading={isLoadingExams}>
            Refresh exams
          </Button>
        </Flex>
      </Box>

      <Box
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        p={5}
      >
        <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
          <Heading size="sm" color="gray.800">
            Proctoring Device Status
          </Heading>
          <Button size="sm" variant="outline" colorPalette="blue" onClick={() => void refresh()}>
            Refresh check
          </Button>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          <Box rounded="xl" bg="gray.50" border="1px solid" borderColor="gray.200" p={4}>
            <Text fontSize="sm" color="gray.600" mb={1}>
              Camera
            </Text>
            <Badge colorPalette={getDeviceStateColor(snapshot.camera)}>{getDeviceStateLabel(snapshot.camera)}</Badge>
          </Box>
          <Box rounded="xl" bg="gray.50" border="1px solid" borderColor="gray.200" p={4}>
            <Text fontSize="sm" color="gray.600" mb={1}>
              Microphone
            </Text>
            <Badge colorPalette={getDeviceStateColor(snapshot.microphone)}>
              {getDeviceStateLabel(snapshot.microphone)}
            </Badge>
          </Box>
        </SimpleGrid>

        <Text fontSize="xs" color="gray.500" mt={4}>
          {snapshot.checkedAt
            ? `Last checked: ${new Date(snapshot.checkedAt).toLocaleString()}`
            : "System status has not been checked yet."}
        </Text>
      </Box>
    </VStack>
  );
}
