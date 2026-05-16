import { Badge, Box, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchStudentResults, type ExamGradingMethod, type StudentResultRecord } from "../../lib/examApi";
import type { StudentLayoutOutletContext } from "./StudentDashboardLayout";

function getResultColor(status: StudentResultRecord["resultStatus"]) {
  if (status === "passed") return "green";
  if (status === "failed") return "red";
  return "orange";
}

function getResultLabel(status: StudentResultRecord["resultStatus"]) {
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  return "Pending";
}

function getGradingMethodLabel(method?: ExamGradingMethod) {
  if (method === "manual") return "Manual Review";
  if (method === "automatic") return "Auto-Graded";
  return "Awaiting Review";
}

function formatDateLabel(value?: string) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleString();
}

export default function StudentResultsPage() {
  const { user } = useOutletContext<StudentLayoutOutletContext>();
  const [results, setResults] = useState<StudentResultRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fetchedResults = await fetchStudentResults(user);
      setResults(fetchedResults);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load results right now.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const visibleResults = useMemo(() => results, [results]);

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Results
        </Heading>
        <Text color="gray.600">Review your scores, grading method, lecturer feedback, and exam integrity outcomes.</Text>
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
          templateColumns="minmax(220px, 2fr) minmax(150px, 1fr) minmax(140px, 1fr) minmax(170px, 1fr) minmax(260px, 1.8fr)"
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
          <Text>Exam</Text>
          <Text>Score</Text>
          <Text>Status</Text>
          <Text>Integrity</Text>
          <Text>Review Notes</Text>
        </Grid>

        {isLoading ? (
          <Box px={5} py={6}>
            <Text color="gray.600">Loading results...</Text>
          </Box>
        ) : errorMessage ? (
          <Box px={5} py={6}>
            <Text color="red.600">{errorMessage}</Text>
          </Box>
        ) : visibleResults.length === 0 ? (
          <Box px={5} py={6}>
            <Text color="gray.600">No submitted exam results yet. Completed exams will appear here after grading.</Text>
          </Box>
        ) : (
          <VStack align="stretch" gap={0} minW="980px">
            {visibleResults.map((result) => {
              const finalScore = result.grading?.finalScore;
              const integrityScore = typeof result.integrityScore === "number" ? `${result.integrityScore}%` : "Not recorded";
              const gradingMethod = getGradingMethodLabel(result.grading?.method);

              return (
                <Grid
                  key={result.attemptId}
                  templateColumns="minmax(220px, 2fr) minmax(150px, 1fr) minmax(140px, 1fr) minmax(170px, 1fr) minmax(260px, 1.8fr)"
                  gap={4}
                  px={5}
                  py={4}
                  borderTopWidth="1px"
                  borderColor="gray.100"
                  alignItems="start"
                >
                  <Box>
                    <Text color="gray.800" fontWeight="semibold">
                      {result.examTitle}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {result.courseCode ? `${result.courseCode} - ${result.course}` : result.course}
                    </Text>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Submitted {formatDateLabel(result.submittedAt)}
                    </Text>
                  </Box>

                  <Box>
                    <Text color="gray.800" fontWeight="semibold">
                      {typeof finalScore === "number" ? `${finalScore}%` : "Pending"}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {typeof result.grading?.correctAnswers === "number" && typeof result.grading?.totalQuestions === "number"
                        ? `${result.grading.correctAnswers}/${result.grading.totalQuestions} correct`
                        : gradingMethod}
                    </Text>
                  </Box>

                  <Box>
                    <Badge colorPalette={getResultColor(result.resultStatus)} w="fit-content" mb={2}>
                      {getResultLabel(result.resultStatus)}
                    </Badge>
                    <Text fontSize="sm" color="gray.500">
                      {gradingMethod}
                    </Text>
                  </Box>

                  <Box>
                    <Text color="gray.700" fontSize="sm">
                      {integrityScore}
                    </Text>
                    {result.submittedLate ? (
                      <Text fontSize="xs" color="orange.700" mt={1}>
                        Submitted after the exam window closed.
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text color="gray.700" fontSize="sm">
                      {result.grading?.feedback?.trim()
                        ? result.grading.feedback
                        : result.resultStatus === "pending"
                          ? "Awaiting lecturer review or auto-grading completion."
                          : "No extra lecturer feedback was attached to this result."}
                    </Text>
                    {result.grading?.gradedAt ? (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Graded {formatDateLabel(result.grading.gradedAt)}
                      </Text>
                    ) : null}
                  </Box>
                </Grid>
              );
            })}
          </VStack>
        )}
      </Box>
    </VStack>
  );
}
