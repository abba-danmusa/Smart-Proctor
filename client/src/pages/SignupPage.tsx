import { Box, Button, Heading, HStack, Input, Text, VStack } from "@chakra-ui/react";
import { useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import FaceRegistrationStep from "../components/signup/FaceRegistrationStep";

type SignupRole = "student" | "lecturer" | "admin";

type SignupFormData = {
  role: SignupRole;
  fullName: string;
  email: string;
  studentId: string;
  staffId: string;
  institution: string;
  department: string;
  level: string;
  password: string;
  confirmPassword: string;
  aiConsent: boolean;
  staffDocumentName: string;
  faceCapture: string | null;
};

type StatusTone = "success" | "warning" | "error";

const STEP_DETAILS = [
  { title: "Account", description: "Choose role and identity" },
  { title: "Role Details", description: "Complete profile requirements" },
  { title: "Security", description: "Set account password" },
  { title: "Face ID", description: "Verify facial identity" },
] as const;

const ROLE_OPTIONS: Array<{ value: SignupRole; label: string; description: string }> = [
  {
    value: "student",
    label: "Student",
    description: "Exam candidate profile with AI monitoring consent.",
  },
  {
    value: "lecturer",
    label: "Lecturer",
    description: "Teaching staff profile with optional verification upload.",
  },
  {
    value: "admin",
    label: "Administrator",
    description: "Admin requests are submitted for manual approval.",
  },
];

const initialForm: SignupFormData = {
  role: "student",
  fullName: "",
  email: "",
  studentId: "",
  staffId: "",
  institution: "",
  department: "",
  level: "",
  password: "",
  confirmPassword: "",
  aiConsent: false,
  staffDocumentName: "",
  faceCapture: null,
};

function FieldLabel({ htmlFor, text }: { htmlFor: string; text: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        marginBottom: "8px",
        fontSize: "14px",
        fontWeight: 600,
        color: "#374151",
      }}
    >
      {text}
    </label>
  );
}

async function getSignupErrorMessage(response: Response) {
  const fallback = "Unable to create account. Please try again.";

  try {
    const body = (await response.json()) as {
      message?: string;
      errors?: Array<{ message?: string }>;
    };

    if (Array.isArray(body.errors) && body.errors.length > 0) {
      const message = body.errors.find((item) => typeof item?.message === "string")?.message;
      if (message) return message;
    }

    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // Fall through to status text / fallback when response body is not JSON.
  }

  if (response.status === 409) return "An account with this email already exists.";
  if (response.status === 400) return "Please review the form details and try again.";

  return fallback;
}

export default function SignupPage() {
  const [form, setForm] = useState<SignupFormData>(initialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const input = event.target as HTMLInputElement;
    const fieldName = name as keyof SignupFormData;
    let nextValue: SignupFormData[keyof SignupFormData];

    if (type === "checkbox") {
      nextValue = input.checked;
    } else if (type === "file") {
      nextValue = input.files?.[0]?.name ?? "";
    } else {
      nextValue = value;
    }

    setForm((prev) => ({
      ...prev,
      [fieldName]: nextValue,
    }));
    setStatusMessage(null);
    setStatusTone(null);
  };

  const selectRole = (role: SignupRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      studentId: role === "student" ? prev.studentId : "",
      staffId: role === "lecturer" ? prev.staffId : "",
      level: role === "student" ? prev.level : "",
      aiConsent: role === "student" ? prev.aiConsent : false,
      staffDocumentName: role === "lecturer" ? prev.staffDocumentName : "",
    }));
    setStatusMessage(null);
    setStatusTone(null);
  };

  const emailLooksValid = useMemo(() => /\S+@\S+\.\S+/.test(form.email.trim()), [form.email]);
  const passwordsMatch = useMemo(
    () => form.password.length > 0 && form.password === form.confirmPassword,
    [form.password, form.confirmPassword],
  );

  const roleFieldsComplete = useMemo(() => {
    if (form.role === "student") {
      return Boolean(
        form.studentId.trim() &&
          form.institution.trim() &&
          form.department.trim() &&
          form.level.trim() &&
          form.aiConsent,
      );
    }

    if (form.role === "lecturer") {
      return Boolean(form.staffId.trim() && form.institution.trim() && form.department.trim());
    }

    return true;
  }, [form]);

  const accountStepComplete = useMemo(
    () => Boolean(form.fullName.trim() && emailLooksValid),
    [form.fullName, emailLooksValid],
  );

  const securityStepComplete = useMemo(
    () => Boolean(form.password.length >= 8 && passwordsMatch),
    [form.password.length, passwordsMatch],
  );
  const faceStepComplete = useMemo(() => Boolean(form.faceCapture), [form.faceCapture]);

  const stepCompletion = [accountStepComplete, roleFieldsComplete, securityStepComplete, faceStepComplete];

  const canSubmit = useMemo(
    () => Boolean(accountStepComplete && roleFieldsComplete && securityStepComplete && faceStepComplete),
    [accountStepComplete, roleFieldsComplete, securityStepComplete, faceStepComplete],
  );

  const isLastStep = currentStep === STEP_DETAILS.length - 1;
  const canGoNext = stepCompletion[currentStep];

  const helperText = useMemo(() => {
    if (currentStep === 0) {
      return accountStepComplete
        ? "Step complete. Continue to role-specific details."
        : "Provide your full name and a valid email address.";
    }
    if (currentStep === 1) {
      return roleFieldsComplete
        ? "Role requirements complete. Proceed to account security."
        : "Complete the required fields for the selected role.";
    }
    if (currentStep === 2) {
      return securityStepComplete
        ? "Security step complete. Continue to facial verification."
        : "Password must be at least 8 characters and both password fields must match.";
    }
    return faceStepComplete
      ? "Face registration complete. Form is ready to submit."
      : "Capture a clear selfie with exactly one visible face.";
  }, [accountStepComplete, roleFieldsComplete, securityStepComplete, faceStepComplete, currentStep]);

  const handleNext = () => {
    if (!canGoNext || isLastStep) return;
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep === 0) return;
    setCurrentStep((prev) => prev - 1);
  };

  const handleCreateAccount = async () => {
    const faceCapture = form.faceCapture;
    if (!canSubmit || !faceCapture) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    setStatusTone(null);

    const payload: Record<string, unknown> = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      role: form.role,
      faceCapture,
    };

    if (form.role === "student") {
      payload.studentId = form.studentId.trim();
      payload.institution = form.institution.trim();
      payload.department = form.department.trim();
      payload.level = form.level.trim();
      payload.aiConsent = form.aiConsent;
    }

    if (form.role === "lecturer") {
      payload.staffId = form.staffId.trim();
      payload.institution = form.institution.trim();
      payload.department = form.department.trim();
      if (form.staffDocumentName.trim()) {
        payload.staffDocumentName = form.staffDocumentName.trim();
      }
    }

    try {
      const response = await fetch("/api/users/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getSignupErrorMessage(response));
      }

      if (form.role === "admin") {
        setStatusMessage(
          "Admin request submitted. Your account will remain pending until a super administrator approves it.",
        );
        setStatusTone("warning");
      } else {
        setStatusMessage("Signup successful. You can now continue to sign in.");
        setStatusTone("success");
      }
      setForm({
        ...initialForm,
        role: form.role,
      });
      setCurrentStep(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create account. Please try again.";
      setStatusMessage(message);
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Box
        w="full"
        maxW="640px"
        position="relative"
        overflow="hidden"
        bg="linear-gradient(145deg, rgba(255,255,255,0.96), rgba(246,250,255,0.92))"
        p={{ base: 6, md: 8 }}
        rounded="3xl"
        shadow="0 25px 70px rgba(18, 28, 45, 0.14)"
        border="1px solid"
        borderColor="gray.100"
        backdropFilter="blur(8px)"
      >
        <Box
          position="absolute"
          top="-90px"
          right="-70px"
          w="240px"
          h="240px"
          bg="radial-gradient(circle, rgba(56,189,248,0.24) 0%, rgba(56,189,248,0) 72%)"
          pointerEvents="none"
        />
        <Box
          position="absolute"
          bottom="-100px"
          left="-80px"
          w="260px"
          h="260px"
          bg="radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 74%)"
          pointerEvents="none"
        />

        <VStack gap={6} align="stretch">
          <VStack gap={2} align="start">
            <Text
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="0.14em"
              textTransform="uppercase"
              color="blue.500"
            >
              Secure Onboarding
            </Text>
            <Heading size="lg" lineHeight="1.1" bgGradient="linear(to-r, gray.800, blue.700)" bgClip="text">
              Create your account
            </Heading>
            <Text fontSize="sm" color="gray.600">
              Complete each step to register your profile and access Smart Proctor.
            </Text>
          </VStack>

          <HStack align="stretch" gap={3}>
            {STEP_DETAILS.map((step, index) => {
              const state = index < currentStep ? "complete" : index === currentStep ? "current" : "upcoming";
              return (
                <VStack key={step.title} flex="1" align="start" gap={1} opacity={state === "upcoming" ? 0.62 : 1}>
                  <HStack w="full" gap={2}>
                    <Box
                      w="28px"
                      h="28px"
                      rounded="full"
                      display="grid"
                      placeItems="center"
                      fontSize="xs"
                      fontWeight="bold"
                      color={state === "upcoming" ? "gray.600" : "white"}
                      bg={state === "complete" ? "green.500" : state === "current" ? "blue.500" : "gray.200"}
                    >
                      {state === "complete" ? "✓" : index + 1}
                    </Box>
                    <Box
                      flex="1"
                      h="4px"
                      rounded="full"
                      bg={index < currentStep ? "blue.400" : "gray.200"}
                      visibility={index === STEP_DETAILS.length - 1 ? "hidden" : "visible"}
                    />
                  </HStack>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                    {step.title}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {step.description}
                  </Text>
                </VStack>
              );
            })}
          </HStack>

          {currentStep === 0 && (
            <VStack align="stretch" gap={4}>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                  Register as:
                </Text>
                <HStack gap={3} flexWrap="wrap">
                  {ROLE_OPTIONS.map((roleOption) => {
                    const isActive = form.role === roleOption.value;
                    return (
                      <Button
                        key={roleOption.value}
                        type="button"
                        onClick={() => selectRole(roleOption.value)}
                        rounded="xl"
                        px={4}
                        py={5}
                        h="auto"
                        textAlign="left"
                        border="1px solid"
                        borderColor={isActive ? "blue.500" : "gray.200"}
                        bg={isActive ? "blue.50" : "white"}
                        _hover={{ borderColor: "blue.300", bg: "blue.50" }}
                      >
                        <VStack align="start" gap={0}>
                          <Text fontWeight="bold" color={isActive ? "blue.700" : "gray.700"}>
                            {roleOption.label}
                          </Text>
                          <Text fontSize="xs" color={isActive ? "blue.600" : "gray.500"}>
                            {roleOption.description}
                          </Text>
                        </VStack>
                      </Button>
                    );
                  })}
                </HStack>
              </Box>

              <Box>
                <FieldLabel htmlFor="fullName" text="Full Name" />
                <Input
                  id="fullName"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  size="lg"
                  bg="white"
                />
              </Box>

              <Box>
                <FieldLabel htmlFor="email" text="Email" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@institution.edu"
                  size="lg"
                  bg="white"
                />
              </Box>
            </VStack>
          )}

          {currentStep === 1 && (
            <VStack align="stretch" gap={4}>
              {form.role === "student" && (
                <>
                  <Box>
                    <FieldLabel htmlFor="studentId" text="Matric Number / Student ID" />
                    <Input
                      id="studentId"
                      name="studentId"
                      value={form.studentId}
                      onChange={handleChange}
                      placeholder="MAT-2023-0981"
                      size="lg"
                      bg="white"
                    />
                  </Box>

                  <Box>
                    <FieldLabel htmlFor="institution" text="Institution Name" />
                    <Input
                      id="institution"
                      name="institution"
                      value={form.institution}
                      onChange={handleChange}
                      placeholder="Riverside University"
                      size="lg"
                      bg="white"
                    />
                  </Box>

                  <Box>
                    <FieldLabel htmlFor="department" text="Department" />
                    <Input
                      id="department"
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                      placeholder="Computer Science"
                      size="lg"
                      bg="white"
                    />
                  </Box>

                  <Box>
                    <FieldLabel htmlFor="level" text="Level (100-500, MSc, etc.)" />
                    <Input
                      id="level"
                      name="level"
                      value={form.level}
                      onChange={handleChange}
                      placeholder="300"
                      size="lg"
                      bg="white"
                    />
                  </Box>

                  <label
                    htmlFor="aiConsent"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid #BFDBFE",
                      background: "rgba(239, 246, 255, 0.7)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      id="aiConsent"
                      name="aiConsent"
                      type="checkbox"
                      checked={form.aiConsent}
                      onChange={handleChange}
                      style={{ marginTop: "3px", accentColor: "#2563EB", width: "16px", height: "16px" }}
                    />
                    <Text fontSize="sm" color="gray.800" lineHeight="1.45">
                      I consent to AI-based monitoring (camera, microphone, screen capture) during exams.
                    </Text>
                  </label>
                </>
              )}

              {form.role === "lecturer" && (
                <>
                  <Box>
                    <FieldLabel htmlFor="staffId" text="Staff ID" />
                    <Input
                      id="staffId"
                      name="staffId"
                      value={form.staffId}
                      onChange={handleChange}
                      placeholder="STAFF-0041"
                      size="lg"
                      bg="white"
                    />
                  </Box>

                  <Box>
                    <FieldLabel htmlFor="institution" text="Institution" />
                    <Input
                      id="institution"
                      name="institution"
                      value={form.institution}
                      onChange={handleChange}
                      placeholder="Riverside University"
                      size="lg"
                      bg="white"
                    />
                  </Box>

                  <Box>
                    <FieldLabel htmlFor="department" text="Department" />
                    <Input
                      id="department"
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                      placeholder="Mathematics"
                      size="lg"
                      bg="white"
                    />
                  </Box>

                  <Box>
                    <FieldLabel htmlFor="staffDocumentName" text="Upload staff verification document (optional)" />
                    <Input
                      id="staffDocumentName"
                      name="staffDocumentName"
                      type="file"
                      onChange={handleChange}
                      size="lg"
                      bg="white"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    />
                    {form.staffDocumentName ? (
                      <Text mt={2} fontSize="xs" color="gray.600">
                        Selected: {form.staffDocumentName}
                      </Text>
                    ) : null}
                  </Box>
                </>
              )}

              {form.role === "admin" && (
                <Box
                  bg="rgba(254, 243, 199, 0.45)"
                  border="1px solid"
                  borderColor="orange.200"
                  rounded="xl"
                  p={4}
                >
                  <Text fontSize="sm" color="orange.800" fontWeight="semibold">
                    Administrator self-signup requires approval.
                  </Text>
                  <Text fontSize="sm" color="orange.700" mt={1}>
                    After you submit this form, your account stays pending until a super administrator reviews and
                    approves it.
                  </Text>
                </Box>
              )}
            </VStack>
          )}

          {currentStep === 2 && (
            <VStack align="stretch" gap={4}>
              <Box>
                <FieldLabel htmlFor="password" text="Password" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  size="lg"
                  bg="white"
                />
              </Box>

              <Box>
                <FieldLabel htmlFor="confirmPassword" text="Confirm Password" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  size="lg"
                  bg="white"
                />
              </Box>
            </VStack>
          )}

          {currentStep === 3 && (
            <FaceRegistrationStep
              capture={form.faceCapture}
              onCapture={(dataUrl) => {
                setForm((prev) => ({ ...prev, faceCapture: dataUrl }));
                setStatusMessage(null);
                setStatusTone(null);
              }}
            />
          )}

          <HStack justify="space-between" gap={3} flexWrap="wrap" align="center">
            <Text
              fontSize="xs"
              color={stepCompletion[currentStep] ? "green.600" : "gray.500"}
            >
              {helperText}
            </Text>

            <HStack gap={2}>
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
                Back
              </Button>
              {!isLastStep ? (
                <Button colorPalette="blue" onClick={handleNext} disabled={!canGoNext}>
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleCreateAccount}
                  loading={isSubmitting}
                  bg="linear-gradient(90deg, #2563EB, #1D4ED8)"
                  color="white"
                  rounded="xl"
                  fontWeight="semibold"
                  _hover={{ opacity: 0.95, transform: "translateY(-1px)" }}
                  _active={{ transform: "translateY(0)" }}
                  transition="all 0.2s ease"
                  disabled={!canSubmit}
                >
                  {form.role === "admin" ? "Request Admin Access" : "Create Account"}
                </Button>
              )}
            </HStack>
          </HStack>

          {statusMessage && statusTone ? (
            <Box
              p={3}
              rounded="xl"
              bg={statusTone === "error" ? "red.50" : statusTone === "warning" ? "orange.50" : "green.50"}
              border="1px solid"
              borderColor={statusTone === "error" ? "red.200" : statusTone === "warning" ? "orange.200" : "green.200"}
            >
              <Text
                fontSize="sm"
                color={statusTone === "error" ? "red.700" : statusTone === "warning" ? "orange.700" : "green.700"}
              >
                {statusMessage}
              </Text>
            </Box>
          ) : null}

          <Text fontSize="sm" textAlign="center" color="gray.600">
            Already have an account?{" "}
            <Link to="/">
              <Text as="span" color="blue.600" fontWeight="semibold">
                Sign in
              </Text>
            </Link>
          </Text>
        </VStack>
      </Box>
    </AuthLayout>
  );
}
