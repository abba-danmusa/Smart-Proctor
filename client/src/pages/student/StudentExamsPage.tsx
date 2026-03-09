import { Badge, Box, Button, Flex, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchExams, startExamAttempt, type ExamRecord } from "../../lib/examApi";
import type { StudentLayoutOutletContext } from "./StudentDashboardLayout";

type StepStatus = "idle" | "running" | "passed" | "failed";
type StudentExamStatus = "upcoming" | "active" | "completed" | "expired";

function getExamStatus(exam: ExamRecord): StudentExamStatus {
  if (exam.studentStatus) {
    return exam.studentStatus;
  }

  if (exam.status === "live") {
    return "active";
  }

  if (exam.status === "expired") {
    return "expired";
  }

  return "upcoming";
}

function getExamStatusColor(status: StudentExamStatus) {
  if (status === "completed") return "green";
  if (status === "active") return "orange";
  if (status === "expired") return "red";
  return "blue";
}

function getStepStatusColor(status: StepStatus) {
  if (status === "passed") return "green";
  if (status === "failed") return "red";
  if (status === "running") return "orange";
  return "gray";
}

function getStepStatusLabel(status: StepStatus) {
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  if (status === "running") return "Running";
  return "Not started";
}

function getExamActionLabel(status: StudentExamStatus) {
  if (status === "completed") return "Completed";
  if (status === "expired") return "Expired";
  if (status === "upcoming") return "Upcoming";
  return "Start";
}

function formatExamDateLabel(exam: ExamRecord) {
  const startDate = new Date(exam.startAt);
  if (Number.isNaN(startDate.getTime())) {
    return "Date unavailable";
  }

  return startDate.toLocaleString();
}

async function runProctoringDeviceCheck() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return false;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  const hasVideo = stream.getVideoTracks().length > 0;
  const hasAudio = stream.getAudioTracks().length > 0;
  stream.getTracks().forEach((track) => track.stop());

  return hasVideo && hasAudio;
}

export default function StudentExamsPage() {
  const { user } = useOutletContext<StudentLayoutOutletContext>();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [faceCheckStatus, setFaceCheckStatus] = useState<StepStatus>("idle");
  const [deviceCheckStatus, setDeviceCheckStatus] = useState<StepStatus>("idle");
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
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

  const selectedExam = useMemo(() => exams.find((exam) => exam.id === selectedExamId) ?? null, [exams, selectedExamId]);
  const selectedExamStatus = selectedExam ? getExamStatus(selectedExam) : "upcoming";
  const canLaunchExam =
    selectedExamStatus === "active" && faceCheckStatus === "passed" && deviceCheckStatus === "passed" && !isStartingExam;

  const startExamFlow = (exam: ExamRecord) => {
    if (getExamStatus(exam) !== "active") {
      return;
    }

    setSelectedExamId(exam.id);
    setFaceCheckStatus("idle");
    setDeviceCheckStatus("idle");
    setLaunchMessage(null);
  };

  const handleFaceVerification = () => {
    if (!selectedExam) {
      return;
    }

    if (user.faceCapture) {
      setFaceCheckStatus("passed");
      setLaunchMessage("Face verification complete. Continue with device check.");
      return;
    }

    setFaceCheckStatus("failed");
    setLaunchMessage("No enrolled face identity found. Update Profile & Face ID before starting this exam.");
  };

  const handleDeviceCheck = async () => {
    if (!selectedExam) {
      return;
    }

    setDeviceCheckStatus("running");
    setLaunchMessage("Running camera and microphone diagnostics...");

    try {
      const isReady = await runProctoringDeviceCheck();
      if (isReady) {
        setDeviceCheckStatus("passed");
        setLaunchMessage("Device check complete. You can now launch the exam.");
      } else {
        setDeviceCheckStatus("failed");
        setLaunchMessage("Device check failed. Confirm camera and microphone availability, then retry.");
      }
    } catch {
      setDeviceCheckStatus("failed");
      setLaunchMessage("Device check failed. Browser permission or hardware access is blocked.");
    }
  };

  const handleLaunchExam = async () => {
    if (!canLaunchExam || !selectedExam) {
      return;
    }

    setIsStartingExam(true);
    setLaunchMessage(`Starting ${selectedExam.title}...`);

    try {
      const attempt = await startExamAttempt(selectedExam.id, user);
      setLaunchMessage(
        `Exam launch authorized for ${selectedExam.title}. Session started at ${new Date(attempt.startedAt).toLocaleTimeString()}.`,
      );
      await loadExams();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start this exam.";
      setLaunchMessage(message);
    } finally {
      setIsStartingExam(false);
    }
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          My Exams
        </Heading>
        <Text color="gray.600">Exams published for courses you registered will appear here.</Text>
      </Box>

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
        overflowX="auto"
      >
        <Grid
          templateColumns="minmax(210px, 2fr) minmax(160px, 1.4fr) minmax(190px, 1.5fr) minmax(120px, 1fr) minmax(140px, 1fr)"
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
          minW="820px"
        >
          <Text>Exam Title</Text>
          <Text>Course</Text>
          <Text>Date</Text>
          <Text>Status</Text>
          <Text>Action</Text>
        </Grid>

        <VStack align="stretch" gap={0} minW="820px">
          {isLoadingExams ? (
            <Box px={5} py={6}>
              <Text fontSize="sm" color="gray.600">
                Loading exams...
              </Text>
            </Box>
          ) : null}

          {!isLoadingExams && exams.length === 0 ? (
            <Box px={5} py={6}>
              <Text fontSize="sm" color="gray.600">
                No exams are published for your registered courses yet.
              </Text>
            </Box>
          ) : null}

          {!isLoadingExams
            ? exams.map((exam) => {
                const examStatus = getExamStatus(exam);
                const canStart = examStatus === "active";

                return (
                  <Grid
                    key={exam.id}
                    templateColumns="minmax(210px, 2fr) minmax(160px, 1.4fr) minmax(190px, 1.5fr) minmax(120px, 1fr) minmax(140px, 1fr)"
                    gap={4}
                    px={5}
                    py={4}
                    borderTopWidth="1px"
                    borderColor="gray.100"
                    alignItems="center"
                  >
                    <Text color="gray.800" fontWeight="semibold">
                      {exam.title}
                    </Text>
                    <Text color="gray.600">{exam.courseCode ? `${exam.courseCode} - ${exam.course}` : exam.course}</Text>
                    <Text color="gray.600" fontSize="sm">
                      {formatExamDateLabel(exam)}
                    </Text>
                    <Badge colorPalette={getExamStatusColor(examStatus)} w="fit-content">
                      {examStatus}
                    </Badge>
                    <Button
                      size="sm"
                      colorPalette="blue"
                      variant={selectedExamId === exam.id ? "solid" : "outline"}
                      disabled={!canStart}
                      onClick={() => startExamFlow(exam)}
                    >
                      {getExamActionLabel(examStatus)}
                    </Button>
                  </Grid>
                );
              })
            : null}
        </VStack>
      </Box>

      {selectedExam ? (
        <Box
          rounded="2xl"
          border="1px solid"
          borderColor="blue.200"
          bg="rgba(239, 246, 255, 0.72)"
          p={5}
          shadow="0 10px 25px rgba(37, 99, 235, 0.08)"
        >
          <Heading size="sm" color="gray.800" mb={1}>
            Pre-start checks for {selectedExam.title}
          </Heading>
          <Text color="gray.600" fontSize="sm" mb={4}>
            Before exam launch, complete face verification and a live device check.
          </Text>

          <VStack align="stretch" gap={3}>
            <Flex align="center" justify="space-between" gap={3} flexWrap="wrap">
              <Text fontSize="sm" color="gray.700">
                1. Face verification
              </Text>
              <Flex align="center" gap={3}>
                <Badge colorPalette={getStepStatusColor(faceCheckStatus)}>{getStepStatusLabel(faceCheckStatus)}</Badge>
                <Button size="sm" variant="outline" colorPalette="blue" onClick={handleFaceVerification}>
                  Verify Face ID
                </Button>
              </Flex>
            </Flex>

            <Flex align="center" justify="space-between" gap={3} flexWrap="wrap">
              <Text fontSize="sm" color="gray.700">
                2. Camera and microphone check
              </Text>
              <Flex align="center" gap={3}>
                <Badge colorPalette={getStepStatusColor(deviceCheckStatus)}>
                  {getStepStatusLabel(deviceCheckStatus)}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="blue"
                  onClick={() => void handleDeviceCheck()}
                  loading={deviceCheckStatus === "running"}
                >
                  Run Device Check
                </Button>
              </Flex>
            </Flex>

            <Flex justify="space-between" align="center" pt={2} borderTopWidth="1px" borderColor="blue.100" gap={3} flexWrap="wrap">
              <Text fontSize="sm" color="gray.700">
                Exam start authorization
              </Text>
              <Button colorPalette="blue" disabled={!canLaunchExam} onClick={() => void handleLaunchExam()} loading={isStartingExam}>
                Launch Exam
              </Button>
            </Flex>

            {launchMessage ? (
              <Box rounded="lg" border="1px solid" borderColor="blue.200" bg="white" px={3} py={2}>
                <Text fontSize="sm" color="gray.700">
                  {launchMessage}
                </Text>
              </Box>
            ) : null}
          </VStack>
        </Box>
      ) : null}
    </VStack>
  );
}
