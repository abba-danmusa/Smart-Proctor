import { Badge, Box, Grid, Heading, Progress, Text, VStack } from "@chakra-ui/react";
import {
  flaggedStudentMetrics,
  lecturerAverageIntegrityScore,
  suspiciousBreakdownMetrics,
} from "./lecturerDashboardData";

export default function LecturerReportsPage() {
  const totalBreakdownCount = suspiciousBreakdownMetrics.reduce((total, metric) => total + metric.count, 0);

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Reports
        </Heading>
        <Text color="gray.600">Analyze risk trends, student integrity distribution, and suspicious behavior patterns.</Text>
      </Box>

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
            {flaggedStudentMetrics.map((student, index) => (
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
            {lecturerAverageIntegrityScore}%
          </Text>
          <Progress.Root value={lecturerAverageIntegrityScore} colorPalette="teal" rounded="md" size="md">
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
          {suspiciousBreakdownMetrics.map((metric) => {
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
