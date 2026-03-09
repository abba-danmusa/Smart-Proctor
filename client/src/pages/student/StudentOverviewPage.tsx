import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { useOutletContext } from "react-router-dom";
import type { StudentLayoutOutletContext } from "./StudentDashboardLayout";
import { studentExamRecords } from "./studentDashboardData";
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

  const upcomingExamCount = studentExamRecords.filter((exam) => exam.status === "upcoming").length;
  const completedExamCount = studentExamRecords.filter((exam) => exam.status === "completed").length;
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
          value={String(upcomingExamCount)}
          subtitle="Scheduled exams awaiting your session start."
        />
        <MetricCard
          title="Completed Exams"
          value={String(completedExamCount)}
          subtitle="Exams already submitted and graded."
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
