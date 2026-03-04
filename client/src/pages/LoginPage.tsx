import { Box, Button, Heading, Input, Text, VStack } from "@chakra-ui/react";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import FaceRegistrationStep from "../components/signup/FaceRegistrationStep";

type LoginFormData = {
  email: string;
  password: string;
  faceCapture: string | null;
};

type StatusTone = "success" | "warning" | "error";
type SigninResponseBody = {
  user?: {
    faceCapture?: string;
  };
};

interface FaceApiRecognitionLike {
  nets: {
    tinyFaceDetector: {
      loadFromUri: (uri: string) => Promise<void>;
    };
    faceLandmark68Net: {
      loadFromUri: (uri: string) => Promise<void>;
    };
    faceRecognitionNet: {
      loadFromUri: (uri: string) => Promise<void>;
    };
  };
  TinyFaceDetectorOptions: new (options: { inputSize: number; scoreThreshold: number }) => unknown;
  detectSingleFace: (
    input: HTMLImageElement,
    options: unknown,
  ) => {
    withFaceLandmarks: () => {
      withFaceDescriptor: () => Promise<{ descriptor: Float32Array } | undefined>;
    };
  };
}

const LOGIN_ENDPOINT = (() => {
  const baseUrl = (import.meta.env.VITE_AUTH_API_BASE_URL ?? "").trim();
  if (!baseUrl) {
    return "/api/users/signin";
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/users/signin`;
})();
const SIGNOUT_ENDPOINT = (() => {
  const baseUrl = (import.meta.env.VITE_AUTH_API_BASE_URL ?? "").trim();
  if (!baseUrl) {
    return "/api/users/signout";
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/users/signout`;
})();
const FACE_MODEL_URI = "https://justadudewhohacks.github.io/face-api.js/models";
const FACE_API_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const FACE_MATCH_THRESHOLD = 0.55;
let faceApiScriptPromise: Promise<FaceApiRecognitionLike> | null = null;
let faceRecognitionModelPromise: Promise<void> | null = null;

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

async function getLoginErrorMessage(response: Response) {
  const fallback = "Unable to sign in. Please try again.";

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

  if (response.status === 400) return "Invalid email or password. Please try again.";

  return fallback;
}

function getFaceApiGlobal() {
  return (window as Window & { faceapi?: FaceApiRecognitionLike }).faceapi ?? null;
}

async function loadFaceApi() {
  const existing = getFaceApiGlobal();
  if (existing) {
    return existing;
  }

  if (!faceApiScriptPromise) {
    faceApiScriptPromise = new Promise<FaceApiRecognitionLike>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = FACE_API_SCRIPT_SRC;
      script.async = true;
      script.setAttribute("data-face-api-script", "true");
      script.onload = () => {
        const faceapi = getFaceApiGlobal();
        if (!faceapi) {
          reject(new Error("face-api.js script loaded but global API is unavailable."));
          return;
        }
        resolve(faceapi);
      };
      script.onerror = () => {
        faceApiScriptPromise = null;
        reject(new Error("Failed to load face-api.js script."));
      };
      document.head.appendChild(script);
    });
  }

  return faceApiScriptPromise;
}

async function ensureFaceRecognitionModelsLoaded() {
  const faceapi = await loadFaceApi();

  if (!faceRecognitionModelPromise) {
    faceRecognitionModelPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URI),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URI),
      faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URI),
    ]).then(() => undefined);
  }

  try {
    await faceRecognitionModelPromise;
  } catch (error) {
    faceRecognitionModelPromise = null;
    throw error;
  }
}

function loadImageFromDataUrl(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load face image for verification."));
    image.src = dataUrl;
  });
}

async function extractFaceDescriptor(dataUrl: string) {
  await ensureFaceRecognitionModelsLoaded();
  const faceapi = await loadFaceApi();
  const image = await loadImageFromDataUrl(dataUrl);
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  const result = await faceapi.detectSingleFace(image, options).withFaceLandmarks().withFaceDescriptor();
  if (!result?.descriptor) {
    throw new Error("Unable to detect a clear face for verification. Retake face capture and try again.");
  }

  return result.descriptor;
}

function calculateEuclideanDistance(a: Float32Array, b: Float32Array) {
  if (a.length !== b.length) {
    throw new Error("Face descriptor mismatch. Please retake your face capture.");
  }

  let sum = 0;
  for (let index = 0; index < a.length; index += 1) {
    const delta = a[index] - b[index];
    sum += delta * delta;
  }

  return Math.sqrt(sum);
}

async function verifyFaceMatch(enrolledCapture: string, liveCapture: string) {
  const [enrolledDescriptor, liveDescriptor] = await Promise.all([
    extractFaceDescriptor(enrolledCapture),
    extractFaceDescriptor(liveCapture),
  ]);

  const distance = calculateEuclideanDistance(enrolledDescriptor, liveDescriptor);
  return distance <= FACE_MATCH_THRESHOLD;
}

async function signOutSilently() {
  try {
    await fetch(SIGNOUT_ENDPOINT, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best effort cleanup.
  }
}

const initialForm: LoginFormData = {
  email: "",
  password: "",
  faceCapture: null,
};

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone | null>(null);

  const emailLooksValid = useMemo(() => /\S+@\S+\.\S+/.test(form.email.trim()), [form.email]);
  const passwordProvided = useMemo(() => form.password.length > 0, [form.password]);
  const faceCaptureReady = useMemo(() => Boolean(form.faceCapture), [form.faceCapture]);
  const canSubmit = useMemo(
    () => Boolean(emailLooksValid && passwordProvided && faceCaptureReady),
    [emailLooksValid, passwordProvided, faceCaptureReady],
  );

  const helperText = useMemo(() => {
    if (canSubmit) {
      return "Credentials and face capture are ready. Continue to your dashboard.";
    }

    return "Enter email/password and complete facial verification to continue.";
  }, [canSubmit]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setStatusMessage(null);
    setStatusTone(null);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setStatusMessage("Enter a valid email and password.");
      setStatusTone("warning");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          faceCapture: form.faceCapture,
        }),
      });

      if (!response.ok) {
        throw new Error(await getLoginErrorMessage(response));
      }

      const body = (await response.json()) as SigninResponseBody;
      const enrolledFaceCapture = typeof body.user?.faceCapture === "string" ? body.user.faceCapture : "";
      if (!enrolledFaceCapture) {
        await signOutSilently();
        throw new Error("No enrolled face identity found for this account. Please contact support.");
      }

      if (!form.faceCapture) {
        await signOutSilently();
        throw new Error("Face capture missing. Please verify your face and try again.");
      }

      setStatusMessage("Credentials accepted. Verifying facial identity...");
      setStatusTone("warning");
      const faceMatch = await verifyFaceMatch(enrolledFaceCapture, form.faceCapture);
      if (!faceMatch) {
        await signOutSilently();
        throw new Error("Facial verification failed. Retake your face capture and try again.");
      }

      setStatusMessage("Login successful. Redirecting...");
      setStatusTone("success");
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in. Please try again.";
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
              Secure Access
            </Text>
            <Heading size="lg" lineHeight="1.1" bgGradient="linear(to-r, gray.800, blue.700)" bgClip="text">
              Welcome back
            </Heading>
            <Text fontSize="sm" color="gray.600">
              Sign in to continue to your Smart Proctor dashboard.
            </Text>
          </VStack>

          <form onSubmit={handleLogin}>
            <VStack align="stretch" gap={4}>
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

              <Box>
                <FieldLabel htmlFor="password" text="Password" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  size="lg"
                  bg="white"
                />
              </Box>

              <Box
                bg="rgba(239, 246, 255, 0.55)"
                border="1px solid"
                borderColor="blue.100"
                rounded="xl"
                p={4}
              >
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                  Facial Verification
                </Text>
                <FaceRegistrationStep
                  capture={form.faceCapture}
                  onCapture={(dataUrl) => {
                    setForm((prev) => ({ ...prev, faceCapture: dataUrl }));
                    setStatusMessage(null);
                    setStatusTone(null);
                  }}
                />
              </Box>

              <Text fontSize="xs" color={canSubmit ? "green.600" : "gray.500"}>
                {helperText}
              </Text>

              <Button
                type="submit"
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
                Sign In
              </Button>
            </VStack>
          </form>

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
            New here?{" "}
            <Link to="/signup">
              <Text as="span" color="blue.600" fontWeight="semibold">
                Create account
              </Text>
            </Link>
          </Text>
        </VStack>
      </Box>
    </AuthLayout>
  );
}
