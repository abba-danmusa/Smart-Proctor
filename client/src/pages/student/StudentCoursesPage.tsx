import { Badge, Box, Button, Flex, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchCourses, registerForCourse, type CourseRecord } from "../../lib/examApi";
import type { StudentLayoutOutletContext } from "./StudentDashboardLayout";

type FeedbackTone = "success" | "error";

type FeedbackState = {
  tone: FeedbackTone;
  message: string;
};

function getCourseTypeColor(type: CourseRecord["type"]) {
  return type === "core" ? "blue" : "purple";
}

function getFeedbackStyles(tone: FeedbackTone) {
  if (tone === "success") {
    return {
      borderColor: "green.200",
      bg: "green.50",
      color: "green.800",
    };
  }

  return {
    borderColor: "red.200",
    bg: "red.50",
    color: "red.800",
  };
}

export default function StudentCoursesPage() {
  const { user } = useOutletContext<StudentLayoutOutletContext>();
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [registeringCourseId, setRegisteringCourseId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const loadCourses = useCallback(async () => {
    setIsLoadingCourses(true);
    setFeedback(null);

    try {
      const fetchedCourses = await fetchCourses(user);
      setCourses(fetchedCourses);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load courses right now.";
      setFeedback({ tone: "error", message });
    } finally {
      setIsLoadingCourses(false);
    }
  }, [user]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const registeredCount = useMemo(() => courses.filter((course) => course.isRegistered).length, [courses]);

  const handleRegister = async (course: CourseRecord) => {
    if (course.isRegistered) {
      return;
    }

    setRegisteringCourseId(course.id);
    setFeedback(null);

    try {
      const registration = await registerForCourse(course.id, user);

      setCourses((prev) =>
        prev.map((existingCourse) =>
          existingCourse.id === course.id
            ? {
                ...existingCourse,
                isRegistered: true,
                registeredAt: registration.registeredAt,
              }
            : existingCourse,
        ),
      );

      setFeedback({
        tone: "success",
        message: `You are registered for ${course.code} - ${course.title}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to register for this course right now.";
      setFeedback({ tone: "error", message });
    } finally {
      setRegisteringCourseId(null);
    }
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Course Registration
        </Heading>
        <Text color="gray.600">Browse all courses in your institution and register for each course you need.</Text>
      </Box>

      <Flex
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        p={5}
        align="center"
        justify="space-between"
        gap={4}
        flexWrap="wrap"
      >
        <Box>
          <Text fontSize="sm" color="gray.500">
            Total courses
          </Text>
          <Heading size="md" color="gray.800">
            {courses.length}
          </Heading>
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.500">
            Registered courses
          </Text>
          <Heading size="md" color="gray.800">
            {registeredCount}
          </Heading>
        </Box>
        <Button size="sm" variant="outline" colorPalette="blue" onClick={() => void loadCourses()} loading={isLoadingCourses}>
          Refresh
        </Button>
      </Flex>

      {feedback ? (
        <Box
          rounded="xl"
          border="1px solid"
          px={4}
          py={3}
          {...getFeedbackStyles(feedback.tone)}
        >
          <Text fontSize="sm">{feedback.message}</Text>
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
          templateColumns="minmax(110px, 1fr) minmax(220px, 2fr) minmax(120px, 1fr) minmax(180px, 1.2fr) minmax(90px, 0.8fr) minmax(120px, 1fr) minmax(130px, 1fr)"
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
          <Text>Code</Text>
          <Text>Title</Text>
          <Text>Type</Text>
          <Text>Department</Text>
          <Text>Level</Text>
          <Text>Status</Text>
          <Text>Action</Text>
        </Grid>

        <VStack align="stretch" gap={0} minW="980px">
          {isLoadingCourses ? (
            <Box px={5} py={6}>
              <Text fontSize="sm" color="gray.600">
                Loading courses...
              </Text>
            </Box>
          ) : null}

          {!isLoadingCourses && courses.length === 0 ? (
            <Box px={5} py={6}>
              <Text fontSize="sm" color="gray.600">
                No courses are available for your institution yet.
              </Text>
            </Box>
          ) : null}

          {!isLoadingCourses
            ? courses.map((course) => {
                const isRegistering = registeringCourseId === course.id;
                const isRegistered = Boolean(course.isRegistered);

                return (
                  <Grid
                    key={course.id}
                    templateColumns="minmax(110px, 1fr) minmax(220px, 2fr) minmax(120px, 1fr) minmax(180px, 1.2fr) minmax(90px, 0.8fr) minmax(120px, 1fr) minmax(130px, 1fr)"
                    gap={4}
                    px={5}
                    py={4}
                    borderTopWidth="1px"
                    borderColor="gray.100"
                    alignItems="center"
                  >
                    <Text color="gray.800" fontWeight="semibold">
                      {course.code}
                    </Text>
                    <Text color="gray.700">{course.title}</Text>
                    <Badge colorPalette={getCourseTypeColor(course.type)} w="fit-content">
                      {course.type}
                    </Badge>
                    <Text color="gray.600">{course.department ?? "Not specified"}</Text>
                    <Text color="gray.600">{course.level ?? "-"}</Text>
                    <Badge colorPalette={isRegistered ? "green" : "gray"} w="fit-content">
                      {isRegistered ? "Registered" : "Not registered"}
                    </Badge>
                    <Button
                      size="sm"
                      colorPalette="blue"
                      variant={isRegistered ? "outline" : "solid"}
                      disabled={isRegistered || isRegistering}
                      loading={isRegistering}
                      onClick={() => void handleRegister(course)}
                    >
                      {isRegistered ? "Registered" : "Register"}
                    </Button>
                  </Grid>
                );
              })
            : null}
        </VStack>
      </Box>
    </VStack>
  );
}
