import { Badge, Box, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchExams, type ExamRecord } from "../../lib/examApi";
import type { LecturerLayoutOutletContext } from "./LecturerDashboardLayout";

function getExamStatusColor(status: ExamRecord["status"]) {
  if (status === "live") return "green";
  if (status === "scheduled") return "blue";
  return "gray";
}

function getExamStatusLabel(status: ExamRecord["status"]) {
  if (status === "live") return "Live";
  if (status === "scheduled") return "Scheduled";
  return "Expired";
}

function formatDateLabel(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function LecturerMyExamsPage() {
  const { user } = useOutletContext<LecturerLayoutOutletContext>();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadExams() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const fetchedExams = await fetchExams(user);

        if (!active) {
          return;
        }

        setExams(fetchedExams);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load exams.";
        setErrorMessage(message);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadExams();

    return () => {
      active = false;
    };
  }, [user]);

  const examRows = useMemo(() => exams, [exams]);

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
          templateColumns="minmax(230px, 2fr) minmax(180px, 1.3fr) minmax(280px, 2fr) minmax(120px, 1fr) minmax(130px, 1fr) minmax(150px, 1fr)"
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
          minW="1100px"
        >
          <Text>Exam</Text>
          <Text>Course</Text>
          <Text>Exam Window</Text>
          <Text>Duration</Text>
          <Text>Status</Text>
          <Text>Attempts</Text>
        </Grid>

        {isLoading ? (
          <Box px={5} py={6}>
            <Text color="gray.600">Loading exams...</Text>
          </Box>
        ) : errorMessage ? (
          <Box px={5} py={6}>
            <Text color="red.600">{errorMessage}</Text>
          </Box>
        ) : examRows.length === 0 ? (
          <Box px={5} py={6}>
            <Text color="gray.600">No exams created yet. Use Create Exam to publish your first exam.</Text>
          </Box>
        ) : (
          <VStack align="stretch" gap={0} minW="1100px">
            {examRows.map((exam) => (
              <Grid
                key={exam.id}
                templateColumns="minmax(230px, 2fr) minmax(180px, 1.3fr) minmax(280px, 2fr) minmax(120px, 1fr) minmax(130px, 1fr) minmax(150px, 1fr)"
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
                    {exam.questionCount ? `${exam.questionCount} generated question(s)` : "Question set not attached"}
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.600">{exam.course}</Text>
                  {exam.courseCode ? (
                    <Text fontSize="sm" color="gray.500">
                      {exam.courseCode}
                    </Text>
                  ) : null}
                </Box>
                <Box>
                  <Text color="gray.700" fontSize="sm">
                    Start: {formatDateLabel(exam.startAt)}
                  </Text>
                  <Text color="gray.700" fontSize="sm">
                    End: {formatDateLabel(exam.endAt)}
                  </Text>
                </Box>
                <Text color="gray.700">{exam.durationMinutes} min</Text>
                <Badge colorPalette={getExamStatusColor(exam.status)} w="fit-content">
                  {getExamStatusLabel(exam.status)}
                </Badge>
                <Text color="gray.700">
                  {exam.submittedAttemptCount ?? 0}/{exam.attemptCount ?? 0} submitted
                </Text>
              </Grid>
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  );
}
