import { Box, Button, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import AccountDetailsStep from "../components/signup/AccountDetailsStep";
import FaceRegistrationStep from "../components/signup/FaceRegistrationStep";
import SecurityStep from "../components/signup/SecurityStep";
import StepIndicator from "../components/signup/StepIndicator";
import type { SignupFormData } from "../components/signup/types";

const STEPS = ["Profile", "Security", "Face ID"];

const initialForm: SignupFormData = {
  fullName: "",
  organization: "",
  email: "",
  role: "student",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
  aiConsent: false,
  faceCapture: null,
};

export default function SignupPage() {
  const [form, setForm] = useState<SignupFormData>(initialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = type === "checkbox" ? (event.target as HTMLInputElement).checked : false;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const canAdvance = useMemo(() => {
    if (currentStep === 0) {
      return Boolean(form.fullName.trim() && form.organization.trim() && form.email.trim() && form.role);
    }

    if (currentStep === 1) {
      return Boolean(
        form.password.length >= 8 &&
          form.password === form.confirmPassword &&
          form.termsAccepted &&
          form.aiConsent,
      );
    }

    return Boolean(form.faceCapture);
  }, [currentStep, form]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canAdvance) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCreateAccount = async () => {
    if (!canAdvance) return;

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setForm(initialForm);
      setCurrentStep(0);
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
              A step-by-step onboarding flow for profile setup, security, and facial identity registration.
            </Text>
          </VStack>

          <StepIndicator steps={STEPS} currentStep={currentStep} />

          {currentStep === 0 && <AccountDetailsStep form={form} onChange={handleChange} />}
          {currentStep === 1 && <SecurityStep form={form} onChange={handleChange} />}
          {currentStep === 2 && (
            <FaceRegistrationStep
              capture={form.faceCapture}
              onCapture={(dataUrl) => setForm((prev) => ({ ...prev, faceCapture: dataUrl }))}
            />
          )}

          <HStack justify="space-between" gap={3} flexWrap="wrap">
            <Button onClick={handleBack} variant="ghost" disabled={currentStep === 0}>
              Back
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                bg="linear-gradient(90deg, #2563EB, #1D4ED8)"
                color="white"
                rounded="xl"
                fontWeight="semibold"
                _hover={{ opacity: 0.95, transform: "translateY(-1px)" }}
                _active={{ transform: "translateY(0)" }}
                transition="all 0.2s ease"
                disabled={!canAdvance}
              >
                Continue
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
                disabled={!canAdvance}
              >
                Create Account
              </Button>
            )}
          </HStack>

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
