import { Badge, Box, Button, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

type ProctoringSettingKey = "faceVerification" | "tabSwitchDetection" | "soundDetection" | "multipleFaceDetection";

type CreateExamFormState = {
  title: string;
  course: string;
  durationMinutes: string;
  startDateTime: string;
  endDateTime: string;
  proctoring: Record<ProctoringSettingKey, boolean>;
};

const initialFormState: CreateExamFormState = {
  title: "",
  course: "",
  durationMinutes: "",
  startDateTime: "",
  endDateTime: "",
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

export default function LecturerCreateExamPage() {
  const [form, setForm] = useState<CreateExamFormState>(initialFormState);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  const enabledProctoringCount = useMemo(
    () => Object.values(form.proctoring).filter(Boolean).length,
    [form.proctoring],
  );

  const updateField = (key: keyof Omit<CreateExamFormState, "proctoring">, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSubmissionMessage(null);
  };

  const toggleProctoring = (key: ProctoringSettingKey) => {
    setForm((prev) => ({
      ...prev,
      proctoring: {
        ...prev.proctoring,
        [key]: !prev.proctoring[key],
      },
    }));
    setSubmissionMessage(null);
  };

  const handleReset = () => {
    setForm(initialFormState);
    setSubmissionMessage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!form.title.trim() || !form.course.trim() || !form.durationMinutes || !form.startDateTime || !form.endDateTime) {
      setSubmissionMessage("Fill in all required exam fields before publishing.");
      return;
    }

    setSubmissionMessage(`Exam "${form.title.trim()}" has been staged for publication with proctoring safeguards enabled.`);
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Create Exam
        </Heading>
        <Text color="gray.600">Create proctored assessments with strict identity and behavior monitoring controls.</Text>
      </Box>

      <Grid templateColumns={{ base: "1fr", xl: "1.4fr 1fr" }} gap={4}>
        <Box
          as="form"
          onSubmit={handleSubmit}
          rounded="2xl"
          border="1px solid"
          borderColor="rgba(15, 23, 42, 0.08)"
          bg="white"
          shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
          p={5}
        >
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <FormField label="Title">
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="e.g. CSC 441 Midterm"
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  fontSize: "14px",
                }}
              />
            </FormField>

            <FormField label="Course">
              <input
                value={form.course}
                onChange={(event) => updateField("course", event.target.value)}
                placeholder="e.g. Artificial Intelligence"
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  fontSize: "14px",
                }}
              />
            </FormField>

            <FormField label="Duration (Minutes)">
              <input
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={(event) => updateField("durationMinutes", event.target.value)}
                placeholder="120"
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  fontSize: "14px",
                }}
              />
            </FormField>

            <FormField label="Start Date">
              <input
                type="datetime-local"
                value={form.startDateTime}
                onChange={(event) => updateField("startDateTime", event.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  fontSize: "14px",
                }}
              />
            </FormField>

            <FormField label="End Date">
              <input
                type="datetime-local"
                value={form.endDateTime}
                onChange={(event) => updateField("endDateTime", event.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  fontSize: "14px",
                }}
              />
            </FormField>
          </Grid>

          <Box mt={6}>
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
                    checked={form.proctoring[setting.key]}
                    onChange={() => toggleProctoring(setting.key)}
                    style={{ width: "18px", height: "18px", accentColor: "#0d9488" }}
                  />
                </Box>
              ))}
            </VStack>
          </Box>

          <Box mt={5} display="flex" flexWrap="wrap" gap={3}>
            <Button type="submit" colorPalette="teal">
              Publish Exam
            </Button>
            <Button type="button" variant="outline" colorPalette="teal" onClick={handleReset}>
              Clear Form
            </Button>
          </Box>

          {submissionMessage ? (
            <Box mt={4} rounded="xl" border="1px solid" borderColor="teal.200" bg="teal.50" p={3}>
              <Text color="teal.900" fontSize="sm">
                {submissionMessage}
              </Text>
            </Box>
          ) : null}
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
          <Heading size="sm" color="gray.800" mb={3}>
            Exam Summary
          </Heading>
          <VStack align="stretch" gap={3}>
            <Box>
              <Text fontSize="sm" color="gray.500">
                Title
              </Text>
              <Text color="gray.800" fontWeight="semibold">
                {form.title.trim() || "Not set"}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500">
                Course
              </Text>
              <Text color="gray.800" fontWeight="semibold">
                {form.course.trim() || "Not set"}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500">
                Duration
              </Text>
              <Text color="gray.800" fontWeight="semibold">
                {form.durationMinutes ? `${form.durationMinutes} minutes` : "Not set"}
              </Text>
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
      </Grid>
    </VStack>
  );
}
