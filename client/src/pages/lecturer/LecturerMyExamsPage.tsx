import { Badge, Box, Button, Flex, Grid, Heading, Portal, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  fetchExams,
  fetchExamSubmissionDetail,
  fetchExamSubmissions,
  gradeExamSubmission,
  type ExamGradingStatus,
  type ExamRecord,
  type LecturerExamSubmissionDetailRecord,
  type LecturerExamSubmissionsResponse,
} from "../../lib/examApi";
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

function getGradingStatusColor(status?: ExamGradingStatus) {
  if (status === "manually_graded") return "teal";
  if (status === "auto_graded") return "green";
  return "orange";
}

function getGradingStatusLabel(status?: ExamGradingStatus) {
  if (status === "manually_graded") return "Manual";
  if (status === "auto_graded") return "Auto";
  return "Pending";
}

function getReviewOutcomeColor(isCorrect: boolean) {
  return isCorrect ? "green" : "red";
}

function formatDateLabel(dateValue?: string) {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const fieldStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "14px",
} as const;

export default function LecturerMyExamsPage() {
  const { user } = useOutletContext<LecturerLayoutOutletContext>();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<LecturerExamSubmissionsResponse | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<LecturerExamSubmissionDetailRecord | null>(null);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isLoadingSubmissionDetail, setIsLoadingSubmissionDetail] = useState(false);
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [reviewErrorMessage, setReviewErrorMessage] = useState<string | null>(null);
  const [gradeFormMessage, setGradeFormMessage] = useState<string | null>(null);
  const [manualScoreInput, setManualScoreInput] = useState("");
  const [manualFeedbackInput, setManualFeedbackInput] = useState("");

  const loadExams = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fetchedExams = await fetchExams(user);
      setExams(fetchedExams);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load exams.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const openReviewWorkspace = useCallback(
    async (examId: string) => {
      setIsLoadingSubmissions(true);
      setReviewErrorMessage(null);
      setReviewData(null);
      setSelectedAttemptId(null);
      setSelectedSubmission(null);
      setGradeFormMessage(null);

      try {
        const response = await fetchExamSubmissions(examId, user);
        setReviewData(response);
        setSelectedAttemptId(response.submissions[0]?.attemptId ?? null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load grading submissions.";
        setReviewErrorMessage(message);
      } finally {
        setIsLoadingSubmissions(false);
      }
    },
    [user],
  );

  const closeReviewWorkspace = () => {
    setReviewData(null);
    setSelectedAttemptId(null);
    setSelectedSubmission(null);
    setReviewErrorMessage(null);
    setGradeFormMessage(null);
  };

  const loadSubmissionDetail = useCallback(
    async (examId: string, attemptId: string) => {
      setIsLoadingSubmissionDetail(true);
      setReviewErrorMessage(null);

      try {
        const response = await fetchExamSubmissionDetail(examId, attemptId, user);
        setSelectedSubmission(response.submission);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load this submission detail.";
        setReviewErrorMessage(message);
      } finally {
        setIsLoadingSubmissionDetail(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!reviewData?.exam.id || !selectedAttemptId) {
      return;
    }

    void loadSubmissionDetail(reviewData.exam.id, selectedAttemptId);
  }, [loadSubmissionDetail, reviewData?.exam.id, selectedAttemptId]);

  useEffect(() => {
    if (!selectedSubmission) {
      setManualScoreInput("");
      setManualFeedbackInput("");
      return;
    }

    const preferredScore = selectedSubmission.grading?.manualScore ?? selectedSubmission.grading?.finalScore;
    setManualScoreInput(typeof preferredScore === "number" ? String(preferredScore) : "");
    setManualFeedbackInput(selectedSubmission.grading?.feedback ?? "");
  }, [selectedSubmission]);

  const handleSaveManualGrade = async () => {
    if (!reviewData?.exam.id || !selectedAttemptId) {
      return;
    }

    const score = Number(manualScoreInput);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      setGradeFormMessage("Manual score must be a whole number between 0 and 100.");
      return;
    }

    setIsSavingGrade(true);
    setGradeFormMessage(null);

    try {
      const updatedSummary = await gradeExamSubmission(reviewData.exam.id, selectedAttemptId, user, {
        score,
        feedback: manualFeedbackInput.trim() || undefined,
      });

      setReviewData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          submissions: current.submissions.map((submission) =>
            submission.attemptId === updatedSummary.attemptId ? updatedSummary : submission,
          ),
        };
      });

      setSelectedSubmission((current) =>
        current && current.attemptId === updatedSummary.attemptId
          ? {
              ...current,
              grading: updatedSummary.grading,
            }
          : current,
      );

      setGradeFormMessage("Manual grade saved successfully.");
      void loadExams();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save this grade.";
      setGradeFormMessage(message);
    } finally {
      setIsSavingGrade(false);
    }
  };

  const examRows = useMemo(() => exams, [exams]);
  const selectedSubmissionSummary = useMemo(
    () => reviewData?.submissions.find((submission) => submission.attemptId === selectedAttemptId) ?? null,
    [reviewData?.submissions, selectedAttemptId],
  );

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          My Exams
        </Heading>
        <Text color="gray.600">Track created exams, review submitted attempts, auto-grade objective questions, and apply manual overrides.</Text>
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
          templateColumns="minmax(210px, 1.8fr) minmax(180px, 1.1fr) minmax(260px, 1.8fr) minmax(110px, 0.8fr) minmax(110px, 0.8fr) minmax(180px, 1.2fr) minmax(160px, 1fr)"
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
          minW="1240px"
        >
          <Text>Exam</Text>
          <Text>Course</Text>
          <Text>Exam Window</Text>
          <Text>Duration</Text>
          <Text>Status</Text>
          <Text>Attempts</Text>
          <Text>Grading</Text>
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
          <VStack align="stretch" gap={0} minW="1240px">
            {examRows.map((exam) => (
              <Grid
                key={exam.id}
                templateColumns="minmax(210px, 1.8fr) minmax(180px, 1.1fr) minmax(260px, 1.8fr) minmax(110px, 0.8fr) minmax(110px, 0.8fr) minmax(180px, 1.2fr) minmax(160px, 1fr)"
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
                    {exam.questionCount ? `${exam.questionCount} question(s)` : "Question set not attached"}
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
                <Box>
                  <Text color="gray.700">
                    {exam.submittedAttemptCount ?? 0}/{exam.attemptCount ?? 0} submitted
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    {exam.gradedAttemptCount ?? 0} graded
                  </Text>
                </Box>
                <Button size="sm" colorPalette="teal" variant="outline" onClick={() => void openReviewWorkspace(exam.id)}>
                  Review Submissions
                </Button>
              </Grid>
            ))}
          </VStack>
        )}
      </Box>

      {reviewData || isLoadingSubmissions ? (
        <Portal>
          <Box position="fixed" inset={0} bg="blackAlpha.500" zIndex={1200} onClick={closeReviewWorkspace} />
          <Box position="fixed" inset={0} zIndex={1300} display="flex" alignItems="center" justifyContent="center" p={4}>
            <Box
              w="full"
              maxW="1180px"
              maxH="90vh"
              overflow="hidden"
              rounded="2xl"
              border="1px solid"
              borderColor="teal.200"
              bg="white"
              shadow="0 25px 45px rgba(15, 23, 42, 0.22)"
            >
              <Flex align="center" justify="space-between" gap={3} px={5} py={4} borderBottomWidth="1px" borderColor="gray.100">
                <Box>
                  <Heading size="md" color="gray.800" mb={1}>
                    {reviewData?.exam.title ?? "Loading grading workspace..."}
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    {reviewData
                      ? `${reviewData.exam.courseCode ? `${reviewData.exam.courseCode} - ` : ""}${reviewData.exam.course}`
                      : "Preparing submitted attempts and grading details."}
                  </Text>
                </Box>
                <Button variant="outline" colorPalette="teal" onClick={closeReviewWorkspace}>
                  Close
                </Button>
              </Flex>

              <Grid templateColumns={{ base: "1fr", xl: "340px minmax(0, 1fr)" }} h="calc(90vh - 84px)">
                <Box borderRightWidth={{ base: "0px", xl: "1px" }} borderColor="gray.100" overflowY="auto" p={4}>
                  <Heading size="sm" color="gray.800" mb={3}>
                    Submitted Attempts
                  </Heading>

                  {isLoadingSubmissions ? (
                    <Text fontSize="sm" color="gray.600">
                      Loading submissions...
                    </Text>
                  ) : reviewErrorMessage && !reviewData ? (
                    <Text fontSize="sm" color="red.600">
                      {reviewErrorMessage}
                    </Text>
                  ) : reviewData && reviewData.submissions.length === 0 ? (
                    <Text fontSize="sm" color="gray.600">
                      No submitted attempts yet for this exam.
                    </Text>
                  ) : (
                    <VStack align="stretch" gap={3}>
                      {reviewData?.submissions.map((submission) => {
                        const isSelected = submission.attemptId === selectedAttemptId;

                        return (
                          <Box
                            key={submission.attemptId}
                            rounded="xl"
                            border="1px solid"
                            borderColor={isSelected ? "teal.300" : "gray.200"}
                            bg={isSelected ? "teal.50" : "white"}
                            p={3}
                            cursor="pointer"
                            onClick={() => {
                              setSelectedAttemptId(submission.attemptId);
                              setGradeFormMessage(null);
                            }}
                          >
                            <Flex justify="space-between" align="start" gap={3} mb={2}>
                              <Box>
                                <Text color="gray.800" fontWeight="semibold">
                                  {submission.studentFullName ?? submission.studentEmail}
                                </Text>
                                <Text fontSize="sm" color="gray.500">
                                  {submission.studentEmail}
                                </Text>
                              </Box>
                              <Badge colorPalette={getGradingStatusColor(submission.grading?.status)}>
                                {getGradingStatusLabel(submission.grading?.status)}
                              </Badge>
                            </Flex>
                            <Text fontSize="sm" color="gray.700">
                              Score: {typeof submission.grading?.finalScore === "number" ? `${submission.grading.finalScore}%` : "Pending"}
                            </Text>
                            <Text fontSize="sm" color="gray.700">
                              Integrity: {typeof submission.integrityScore === "number" ? `${submission.integrityScore}%` : "N/A"}
                            </Text>
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              Submitted {formatDateLabel(submission.submittedAt)}
                            </Text>
                          </Box>
                        );
                      })}
                    </VStack>
                  )}
                </Box>

                <Box overflowY="auto" p={4}>
                  {reviewErrorMessage && reviewData ? (
                    <Box rounded="xl" border="1px solid" borderColor="red.200" bg="red.50" px={4} py={3} mb={4}>
                      <Text fontSize="sm" color="red.700">
                        {reviewErrorMessage}
                      </Text>
                    </Box>
                  ) : null}

                  {isLoadingSubmissionDetail ? (
                    <Text fontSize="sm" color="gray.600">
                      Loading submission review...
                    </Text>
                  ) : !selectedSubmission || !selectedSubmissionSummary ? (
                    <Text fontSize="sm" color="gray.600">
                      Select a submitted attempt to inspect responses and grade it.
                    </Text>
                  ) : (
                    <VStack align="stretch" gap={4}>
                      <Grid templateColumns={{ base: "1fr", md: "repeat(4, minmax(0, 1fr))" }} gap={3}>
                        <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={3}>
                          <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500" mb={1}>
                            Student
                          </Text>
                          <Text color="gray.800" fontWeight="semibold">
                            {selectedSubmission.studentFullName ?? selectedSubmission.studentEmail}
                          </Text>
                        </Box>
                        <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={3}>
                          <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500" mb={1}>
                            Auto Score
                          </Text>
                          <Text color="gray.800" fontWeight="semibold">
                            {typeof selectedSubmission.grading?.autoScore === "number" ? `${selectedSubmission.grading.autoScore}%` : "Pending"}
                          </Text>
                        </Box>
                        <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={3}>
                          <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500" mb={1}>
                            Final Score
                          </Text>
                          <Text color="gray.800" fontWeight="semibold">
                            {typeof selectedSubmission.grading?.finalScore === "number" ? `${selectedSubmission.grading.finalScore}%` : "Pending"}
                          </Text>
                        </Box>
                        <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={3}>
                          <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500" mb={1}>
                            Integrity
                          </Text>
                          <Text color="gray.800" fontWeight="semibold">
                            {typeof selectedSubmission.integrityScore === "number" ? `${selectedSubmission.integrityScore}%` : "N/A"}
                          </Text>
                        </Box>
                      </Grid>

                      <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={4}>
                        <Flex justify="space-between" align="center" gap={3} mb={3} flexWrap="wrap">
                          <Heading size="sm" color="gray.800">
                            Manual Override
                          </Heading>
                          <Badge colorPalette={getGradingStatusColor(selectedSubmission.grading?.status)}>
                            {getGradingStatusLabel(selectedSubmission.grading?.status)}
                          </Badge>
                        </Flex>

                        <Grid templateColumns={{ base: "1fr", md: "160px 1fr" }} gap={3} mb={3}>
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={2}>
                              Final score (%)
                            </Text>
                            <input
                              value={manualScoreInput}
                              onChange={(event) => setManualScoreInput(event.target.value)}
                              inputMode="numeric"
                              placeholder="0 - 100"
                              style={fieldStyle}
                            />
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={2}>
                              Lecturer feedback
                            </Text>
                            <textarea
                              value={manualFeedbackInput}
                              onChange={(event) => setManualFeedbackInput(event.target.value)}
                              placeholder="Add manual grading notes, score rationale, or review remarks."
                              rows={4}
                              style={{ ...fieldStyle, resize: "vertical" }}
                            />
                          </Box>
                        </Grid>

                        {gradeFormMessage ? (
                          <Box rounded="lg" border="1px solid" borderColor="teal.200" bg="teal.50" px={3} py={2} mb={3}>
                            <Text fontSize="sm" color="teal.800">
                              {gradeFormMessage}
                            </Text>
                          </Box>
                        ) : null}

                        <Flex justify="flex-end">
                          <Button colorPalette="teal" loading={isSavingGrade} onClick={() => void handleSaveManualGrade()}>
                            Save Manual Grade
                          </Button>
                        </Flex>
                      </Box>

                      <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={4}>
                        <Heading size="sm" color="gray.800" mb={3}>
                          Answer Review
                        </Heading>
                        <VStack align="stretch" gap={3}>
                          {selectedSubmission.review.map((question) => (
                            <Box key={question.questionNumber} rounded="lg" border="1px solid" borderColor="gray.200" bg="white" p={3}>
                              <Flex justify="space-between" align="center" gap={3} mb={2} flexWrap="wrap">
                                <Text color="gray.800" fontWeight="semibold">
                                  Q{question.questionNumber}. {question.prompt}
                                </Text>
                                <Badge colorPalette={getReviewOutcomeColor(question.isCorrect)}>
                                  {question.isCorrect ? "Correct" : "Incorrect"}
                                </Badge>
                              </Flex>

                              <Text fontSize="sm" color="gray.500" mb={3}>
                                {question.topic} • {question.difficulty}
                              </Text>

                              <VStack align="stretch" gap={2}>
                                {question.options.map((option, index) => {
                                  const optionKey = String.fromCharCode(65 + index);
                                  const isSelected = question.selectedOptionKey === optionKey;
                                  const isCorrect = question.correctOptionKey === optionKey;

                                  return (
                                    <Box
                                      key={`${question.questionNumber}-${optionKey}`}
                                      rounded="md"
                                      border="1px solid"
                                      borderColor={isCorrect ? "green.300" : isSelected ? "orange.300" : "gray.200"}
                                      bg={isCorrect ? "green.50" : isSelected ? "orange.50" : "gray.50"}
                                      px={3}
                                      py={2}
                                    >
                                      <Flex justify="space-between" align="center" gap={3}>
                                        <Text fontSize="sm" color="gray.800">
                                          {optionKey}. {option}
                                        </Text>
                                        <Flex gap={2} flexWrap="wrap">
                                          {isSelected ? <Badge colorPalette="orange">Student</Badge> : null}
                                          {isCorrect ? <Badge colorPalette="green">Correct</Badge> : null}
                                        </Flex>
                                      </Flex>
                                    </Box>
                                  );
                                })}
                              </VStack>

                              {question.explanation ? (
                                <Text fontSize="sm" color="gray.600" mt={3}>
                                  Explanation: {question.explanation}
                                </Text>
                              ) : null}
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                    </VStack>
                  )}
                </Box>
              </Grid>
            </Box>
          </Box>
        </Portal>
      ) : null}
    </VStack>
  );
}
