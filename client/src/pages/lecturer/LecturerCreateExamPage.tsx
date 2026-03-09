import { Badge, Box, Button, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import {
  createCourse,
  createExam,
  fetchCourses,
  generateExamQuestions,
  type CourseRecord,
  type CourseType,
  type GeneratedQuestionRecord,
  type QuestionDifficulty,
} from "../../lib/examApi";
import type { LecturerLayoutOutletContext } from "./LecturerDashboardLayout";

type ProctoringSettingKey = "faceVerification" | "tabSwitchDetection" | "soundDetection" | "multipleFaceDetection";

type CourseFormState = {
  code: string;
  title: string;
  type: CourseType;
  description: string;
  department: string;
  level: string;
};

type ExamFormState = {
  title: string;
  durationMinutes: string;
  startDateTime: string;
  endDateTime: string;
  instructions: string;
  numberOfQuestions: string;
  difficulty: QuestionDifficulty;
  topics: string;
  proctoring: Record<ProctoringSettingKey, boolean>;
};

type FeedbackTone = "success" | "warning" | "error";

type FeedbackState = {
  tone: FeedbackTone;
  message: string;
};

const initialCourseForm: CourseFormState = {
  code: "",
  title: "",
  type: "core",
  description: "",
  department: "",
  level: "",
};

const initialExamForm: ExamFormState = {
  title: "",
  durationMinutes: "",
  startDateTime: "",
  endDateTime: "",
  instructions: "",
  numberOfQuestions: "10",
  difficulty: "medium",
  topics: "",
  proctoring: {
    faceVerification: true,
    tabSwitchDetection: true,
    soundDetection: true,
    multipleFaceDetection: true,
  },
};

const proctoringSettingsConfig: Array<{ key: ProctoringSettingKey; label: string; description: string }> = [
  {
    key: "faceVerification",
    label: "Enable Face Verification",
    description: "Ensure candidate identity is validated continuously during the exam.",
  },
  {
    key: "tabSwitchDetection",
    label: "Enable Tab Switch Detection",
    description: "Detect focus loss and switching away from the exam window.",
  },
  {
    key: "soundDetection",
    label: "Enable Sound Detection",
    description: "Flag unusual microphone activity during exam sessions.",
  },
  {
    key: "multipleFaceDetection",
    label: "Enable Multiple Face Detection",
    description: "Trigger alerts when more than one face appears in the camera feed.",
  },
];

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "14px",
} as const;

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Text fontSize="sm" color="gray.600" mb={2}>
        {label}
      </Text>
      {children}
    </Box>
  );
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState }) {
  const colors =
    feedback.tone === "success"
      ? { border: "green.200", bg: "green.50", text: "green.800" }
      : feedback.tone === "warning"
        ? { border: "orange.200", bg: "orange.50", text: "orange.800" }
        : { border: "red.200", bg: "red.50", text: "red.800" };

  return (
    <Box rounded="xl" border="1px solid" borderColor={colors.border} bg={colors.bg} p={3}>
      <Text fontSize="sm" color={colors.text}>
        {feedback.message}
      </Text>
    </Box>
  );
}

function normalizeTopics(topics: string) {
  return [...new Set(topics.split(",").map((topic) => topic.trim()).filter(Boolean))];
}

type ExamFieldKey = Exclude<keyof ExamFormState, "proctoring">;

export default function LecturerCreateExamPage() {
  const { user } = useOutletContext<LecturerLayoutOutletContext>();

  const [courseForm, setCourseForm] = useState<CourseFormState>(initialCourseForm);
  const [examForm, setExamForm] = useState<ExamFormState>(initialExamForm);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestionRecord[]>([]);
  const [courseFeedback, setCourseFeedback] = useState<FeedbackState | null>(null);
  const [examFeedback, setExamFeedback] = useState<FeedbackState | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isPublishingExam, setIsPublishingExam] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCourses() {
      setIsLoadingCourses(true);

      try {
        const fetchedCourses = await fetchCourses(user);

        if (!active) {
          return;
        }

        setCourses(fetchedCourses);
        setSelectedCourseId((current) => {
          if (current && fetchedCourses.some((course) => course.id === current)) {
            return current;
          }

          return fetchedCourses[0]?.id ?? "";
        });
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load courses right now.";
        setCourseFeedback({
          tone: "error",
          message,
        });
      } finally {
        if (active) {
          setIsLoadingCourses(false);
        }
      }
    }

    void loadCourses();

    return () => {
      active = false;
    };
  }, [user]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const enabledProctoringCount = useMemo(
    () => Object.values(examForm.proctoring).filter(Boolean).length,
    [examForm.proctoring],
  );

  const parsedTopics = useMemo(() => normalizeTopics(examForm.topics), [examForm.topics]);

  const updateCourseField = <K extends keyof CourseFormState>(key: K, value: CourseFormState[K]) => {
    setCourseForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCourseFeedback(null);
  };

  const updateExamField = <K extends ExamFieldKey>(key: K, value: ExamFormState[K]) => {
    setExamForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setExamFeedback(null);
  };

  const toggleProctoring = (key: ProctoringSettingKey) => {
    setExamForm((prev) => ({
      ...prev,
      proctoring: {
        ...prev.proctoring,
        [key]: !prev.proctoring[key],
      },
    }));
    setExamFeedback(null);
  };

  const handleCreateCourse = async (event: FormEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!courseForm.code.trim() || !courseForm.title.trim()) {
      setCourseFeedback({ tone: "warning", message: "Course code and title are required." });
      return;
    }

    setIsCreatingCourse(true);
    setCourseFeedback(null);

    try {
      const createdCourse = await createCourse(
        {
          code: courseForm.code.trim().toUpperCase(),
          title: courseForm.title.trim(),
          type: courseForm.type,
          description: courseForm.description.trim() || undefined,
          department: courseForm.department.trim() || undefined,
          level: courseForm.level.trim() || undefined,
        },
        user,
      );

      setCourses((prev) => {
        const deduped = prev.filter((course) => course.id !== createdCourse.id);
        return [createdCourse, ...deduped].sort((a, b) => a.title.localeCompare(b.title));
      });
      setSelectedCourseId(createdCourse.id);
      setCourseForm(initialCourseForm);
      setCourseFeedback({
        tone: "success",
        message: `Course ${createdCourse.code} (${createdCourse.title}) was created and selected.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create course.";
      setCourseFeedback({ tone: "error", message });
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedCourseId) {
      setExamFeedback({ tone: "warning", message: "Select a course before generating questions." });
      return;
    }

    if (!examForm.title.trim() || !examForm.instructions.trim()) {
      setExamFeedback({ tone: "warning", message: "Provide exam title and instructions before generating questions." });
      return;
    }

    const questionCount = Number(examForm.numberOfQuestions);
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 100) {
      setExamFeedback({ tone: "warning", message: "Number of questions must be an integer between 1 and 100." });
      return;
    }

    if (parsedTopics.length === 0) {
      setExamFeedback({ tone: "warning", message: "Provide at least one topic (comma separated)." });
      return;
    }

    setIsGeneratingQuestions(true);
    setExamFeedback(null);

    try {
      const generation = await generateExamQuestions(
        {
          courseId: selectedCourseId,
          examTitle: examForm.title.trim(),
          instructions: examForm.instructions.trim(),
          numberOfQuestions: questionCount,
          difficulty: examForm.difficulty,
          topics: parsedTopics,
        },
        user,
      );

      setGeneratedQuestions(generation.questions);
      setExamFeedback({
        tone: "success",
        message: `Generated ${generation.questions.length} ${generation.difficulty} questions for ${generation.course.code}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate questions.";
      setExamFeedback({ tone: "error", message });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handlePublishExam = async () => {
    if (!selectedCourseId) {
      setExamFeedback({ tone: "warning", message: "Select a course before publishing the exam." });
      return;
    }

    if (!examForm.durationMinutes || !examForm.startDateTime || !examForm.endDateTime) {
      setExamFeedback({ tone: "warning", message: "Duration, start time, and end time are required." });
      return;
    }

    const durationMinutes = Number(examForm.durationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 720) {
      setExamFeedback({ tone: "warning", message: "Duration must be between 1 and 720 minutes." });
      return;
    }

    const startAt = new Date(examForm.startDateTime);
    const endAt = new Date(examForm.endDateTime);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      setExamFeedback({ tone: "warning", message: "Exam end time must be later than start time." });
      return;
    }

    if (generatedQuestions.length === 0) {
      setExamFeedback({ tone: "warning", message: "Generate questions before publishing the exam." });
      return;
    }

    const topicsForExam = parsedTopics.length > 0 ? parsedTopics : [...new Set(generatedQuestions.map((question) => question.topic))];

    setIsPublishingExam(true);
    setExamFeedback(null);

    try {
      const exam = await createExam(
        {
          title: examForm.title.trim(),
          courseId: selectedCourseId,
          durationMinutes,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          instructions: examForm.instructions.trim(),
          proctoring: examForm.proctoring,
          questions: generatedQuestions,
          questionGeneration: {
            numberOfQuestions: generatedQuestions.length,
            difficulty: examForm.difficulty,
            topics: topicsForExam,
          },
        },
        user,
      );

      setExamFeedback({
        tone: "success",
        message: `Exam \"${exam.title}\" published successfully with ${generatedQuestions.length} generated questions.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to publish exam.";
      setExamFeedback({ tone: "error", message });
    } finally {
      setIsPublishingExam(false);
    }
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Course & Exam Builder
        </Heading>
        <Text color="gray.600">
          Create lecturer-owned courses, generate exam questions automatically from topics/instructions, then publish to students.
        </Text>
      </Box>

      <Grid templateColumns={{ base: "1fr", xl: "1.45fr 1fr" }} gap={4}>
        <VStack align="stretch" gap={4}>
          <Box
            as="form"
            onSubmit={handleCreateCourse}
            rounded="2xl"
            border="1px solid"
            borderColor="rgba(15, 23, 42, 0.08)"
            bg="white"
            shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
            p={5}
          >
            <Heading size="sm" color="gray.800" mb={3}>
              1. Create Course
            </Heading>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              <FormField label="Course Code">
                <input
                  value={courseForm.code}
                  onChange={(event) => updateCourseField("code", event.target.value)}
                  placeholder="e.g. CSC-441"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Course Type">
                <select
                  value={courseForm.type}
                  onChange={(event) => updateCourseField("type", event.target.value as CourseType)}
                  style={inputStyle}
                >
                  <option value="core">Core</option>
                  <option value="elective">Elective</option>
                </select>
              </FormField>

              <FormField label="Course Title">
                <input
                  value={courseForm.title}
                  onChange={(event) => updateCourseField("title", event.target.value)}
                  placeholder="e.g. Artificial Intelligence"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Department">
                <input
                  value={courseForm.department}
                  onChange={(event) => updateCourseField("department", event.target.value)}
                  placeholder="e.g. Computer Science"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Level">
                <input
                  value={courseForm.level}
                  onChange={(event) => updateCourseField("level", event.target.value)}
                  placeholder="e.g. 400"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  value={courseForm.description}
                  onChange={(event) => updateCourseField("description", event.target.value)}
                  placeholder="Optional course summary"
                  rows={3}
                  style={inputStyle}
                />
              </FormField>
            </Grid>

            <Box mt={5} display="flex" gap={3}>
              <Button type="submit" colorPalette="teal" loading={isCreatingCourse}>
                Create Course
              </Button>
            </Box>

            {courseFeedback ? <Box mt={4}><FeedbackBanner feedback={courseFeedback} /></Box> : null}
          </Box>

          <Box
            rounded="2xl"
            border="1px solid"
            borderColor="rgba(15, 23, 42, 0.08)"
            bg="white"
            shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
            p={5}
          >
            <Heading size="sm" color="gray.800" mb={3}>
              2. Configure Exam + Auto-Generate Questions
            </Heading>

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              <FormField label="Select Course">
                <select
                  value={selectedCourseId}
                  onChange={(event) => {
                    setSelectedCourseId(event.target.value);
                    setExamFeedback(null);
                  }}
                  style={inputStyle}
                  disabled={isLoadingCourses || courses.length === 0}
                >
                  <option value="">{isLoadingCourses ? "Loading courses..." : "Choose a course"}</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.title}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Exam Title">
                <input
                  value={examForm.title}
                  onChange={(event) => updateExamField("title", event.target.value)}
                  placeholder="e.g. CSC 441 Midterm"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Duration (Minutes)">
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={examForm.durationMinutes}
                  onChange={(event) => updateExamField("durationMinutes", event.target.value)}
                  placeholder="120"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Number of Questions">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={examForm.numberOfQuestions}
                  onChange={(event) => updateExamField("numberOfQuestions", event.target.value)}
                  placeholder="10"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Difficulty">
                <select
                  value={examForm.difficulty}
                  onChange={(event) => updateExamField("difficulty", event.target.value as QuestionDifficulty)}
                  style={inputStyle}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </FormField>

              <FormField label="Topics (comma separated)">
                <input
                  value={examForm.topics}
                  onChange={(event) => updateExamField("topics", event.target.value)}
                  placeholder="e.g. Search, Heuristics, Constraint Satisfaction"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Start Date">
                <input
                  type="datetime-local"
                  value={examForm.startDateTime}
                  onChange={(event) => updateExamField("startDateTime", event.target.value)}
                  style={inputStyle}
                />
              </FormField>

              <FormField label="End Date">
                <input
                  type="datetime-local"
                  value={examForm.endDateTime}
                  onChange={(event) => updateExamField("endDateTime", event.target.value)}
                  style={inputStyle}
                />
              </FormField>
            </Grid>

            <Box mt={4}>
              <FormField label="Exam Instructions">
                <textarea
                  value={examForm.instructions}
                  onChange={(event) => updateExamField("instructions", event.target.value)}
                  placeholder="e.g. Answer all questions. Select one best option. No external aids allowed."
                  rows={4}
                  style={inputStyle}
                />
              </FormField>
            </Box>

            <Box mt={5}>
              <Text
                fontSize="xs"
                fontWeight="bold"
                textTransform="uppercase"
                letterSpacing="0.1em"
                color="teal.600"
                mb={3}
              >
                Proctoring Settings
              </Text>

              <VStack align="stretch" gap={3}>
                {proctoringSettingsConfig.map((setting) => (
                  <Box
                    as="label"
                    key={setting.key}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={4}
                    rounded="xl"
                    border="1px solid"
                    borderColor="gray.200"
                    bg="gray.50"
                    p={3}
                    cursor="pointer"
                  >
                    <Box>
                      <Text color="gray.800" fontWeight="semibold" mb={1}>
                        {setting.label}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {setting.description}
                      </Text>
                    </Box>

                    <input
                      type="checkbox"
                      checked={examForm.proctoring[setting.key]}
                      onChange={() => toggleProctoring(setting.key)}
                      style={{ width: "18px", height: "18px", accentColor: "#0d9488" }}
                    />
                  </Box>
                ))}
              </VStack>
            </Box>

            <Box mt={5} display="flex" flexWrap="wrap" gap={3}>
              <Button colorPalette="blue" onClick={handleGenerateQuestions} loading={isGeneratingQuestions}>
                Generate Questions
              </Button>
              <Button colorPalette="teal" onClick={handlePublishExam} loading={isPublishingExam}>
                Publish Exam
              </Button>
            </Box>

            {examFeedback ? <Box mt={4}><FeedbackBanner feedback={examFeedback} /></Box> : null}
          </Box>
        </VStack>

        <VStack align="stretch" gap={4}>
          <Box
            rounded="2xl"
            border="1px solid"
            borderColor="rgba(15, 23, 42, 0.08)"
            bg="white"
            shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
            p={5}
          >
            <Heading size="sm" color="gray.800" mb={3}>
              Builder Summary
            </Heading>
            <VStack align="stretch" gap={3}>
              <Box>
                <Text fontSize="sm" color="gray.500">
                  Selected Course
                </Text>
                <Text color="gray.800" fontWeight="semibold">
                  {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.title}` : "Not selected"}
                </Text>
                {selectedCourse ? (
                  <Badge mt={1} colorPalette={selectedCourse.type === "core" ? "blue" : "purple"}>
                    {selectedCourse.type}
                  </Badge>
                ) : null}
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.500">
                  Exam Title
                </Text>
                <Text color="gray.800" fontWeight="semibold">
                  {examForm.title.trim() || "Not set"}
                </Text>
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.500">
                  Duration
                </Text>
                <Text color="gray.800" fontWeight="semibold">
                  {examForm.durationMinutes ? `${examForm.durationMinutes} minutes` : "Not set"}
                </Text>
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.500">
                  Topics
                </Text>
                <Text color="gray.800" fontWeight="semibold">
                  {parsedTopics.length > 0 ? parsedTopics.join(", ") : "Not set"}
                </Text>
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}>
                  Generated Questions
                </Text>
                <Badge colorPalette={generatedQuestions.length > 0 ? "green" : "gray"}>
                  {generatedQuestions.length} question(s)
                </Badge>
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}>
                  Proctoring Coverage
                </Text>
                <Badge colorPalette={enabledProctoringCount >= 3 ? "green" : "orange"}>
                  {enabledProctoringCount}/4 controls enabled
                </Badge>
              </Box>
            </VStack>
          </Box>

          <Box
            rounded="2xl"
            border="1px solid"
            borderColor="rgba(15, 23, 42, 0.08)"
            bg="white"
            shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
            p={5}
          >
            <Heading size="sm" color="gray.800" mb={3}>
              Question Preview
            </Heading>

            {generatedQuestions.length === 0 ? (
              <Text color="gray.600" fontSize="sm">
                Generate questions to preview the auto-created exam content.
              </Text>
            ) : (
              <VStack align="stretch" gap={3} maxH="560px" overflowY="auto" pr={1}>
                {generatedQuestions.map((question) => (
                  <Box key={question.questionNumber} rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={3}>
                    <Text fontSize="xs" color="gray.500" mb={1}>
                      Q{question.questionNumber} • {question.difficulty} • {question.topic}
                    </Text>
                    <Text color="gray.800" fontWeight="semibold" fontSize="sm" mb={2}>
                      {question.prompt}
                    </Text>
                    <VStack align="stretch" gap={1}>
                      {question.options.map((option, index) => (
                        <Text key={`${question.questionNumber}-${index}`} fontSize="sm" color="gray.700">
                          {String.fromCharCode(65 + index)}. {option}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </Grid>
    </VStack>
  );
}
