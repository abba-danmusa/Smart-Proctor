import { Badge, Box, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { lecturerExamRecords, type LecturerExamRecord } from "./lecturerDashboardData";

function getExamStatusColor(status: LecturerExamRecord["status"]) {
  if (status === "live") return "green";
  if (status === "scheduled") return "blue";
  return "gray";
}

function getExamStatusLabel(status: LecturerExamRecord["status"]) {
  if (status === "live") return "Live";
  if (status === "scheduled") return "Scheduled";
  return "Completed";
}

export default function LecturerMyExamsPage() {
  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          My Exams
        </Heading>
        <Text color="gray.600">Track all created exams, schedules, candidate volume, and current proctoring states.</Text>
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
          templateColumns="minmax(230px, 2fr) minmax(180px, 1.3fr) minmax(280px, 2fr) minmax(120px, 1fr) minmax(130px, 1fr) minmax(120px, 1fr)"
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
          minW="1060px"
        >
          <Text>Exam</Text>
          <Text>Course</Text>
          <Text>Exam Window</Text>
          <Text>Duration</Text>
          <Text>Status</Text>
          <Text>Students</Text>
        </Grid>

        <VStack align="stretch" gap={0} minW="1060px">
          {lecturerExamRecords.map((exam) => (
            <Grid
              key={exam.id}
              templateColumns="minmax(230px, 2fr) minmax(180px, 1.3fr) minmax(280px, 2fr) minmax(120px, 1fr) minmax(130px, 1fr) minmax(120px, 1fr)"
              gap={4}
              px={5}
              py={4}
              borderTopWidth="1px"
              borderColor="gray.100"
              alignItems="center"
            >
              <Box>
                <Text color="gray.800" fontWeight="semibold">
                  {exam.title}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Face + behavior proctoring enabled
                </Text>
              </Box>
              <Text color="gray.600">{exam.course}</Text>
              <Box>
                <Text color="gray.700" fontSize="sm">
                  Start: {exam.startDateLabel}
                </Text>
                <Text color="gray.700" fontSize="sm">
                  End: {exam.endDateLabel}
                </Text>
              </Box>
              <Text color="gray.700">{exam.durationMinutes} min</Text>
              <Badge colorPalette={getExamStatusColor(exam.status)} w="fit-content">
                {getExamStatusLabel(exam.status)}
              </Badge>
              <Text color="gray.700">{exam.enrolledStudents}</Text>
            </Grid>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}
