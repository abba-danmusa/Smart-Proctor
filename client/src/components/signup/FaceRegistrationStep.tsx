import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

interface FaceRegistrationStepProps {
  capture: string | null;
  onCapture: (dataUrl: string) => void;
}

interface FaceApiLike {
  nets: {
    tinyFaceDetector: {
      loadFromUri: (uri: string) => Promise<void>;
    };
  };
  TinyFaceDetectorOptions: new (options: { inputSize: number; scoreThreshold: number }) => unknown;
  detectAllFaces: (input: HTMLCanvasElement, options: unknown) => Promise<Array<unknown>>;
}

type CameraErrorName =
  | "NotAllowedError"
  | "SecurityError"
  | "NotFoundError"
  | "NotReadableError"
  | "OverconstrainedError"
  | "AbortError"
  | "TypeError";

const FACE_MODEL_URI = "https://justadudewhohacks.github.io/face-api.js/models";
const FACE_API_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
let tinyDetectorModelPromise: Promise<void> | null = null;
let faceApiScriptPromise: Promise<FaceApiLike> | null = null;

function getFaceApiGlobal() {
  return (window as Window & { faceapi?: FaceApiLike }).faceapi ?? null;
}

async function loadFaceApi() {
  const existing = getFaceApiGlobal();
  if (existing) {
    return existing;
  }

  if (!faceApiScriptPromise) {
    faceApiScriptPromise = new Promise<FaceApiLike>((resolve, reject) => {
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

async function ensureTinyFaceModelLoaded() {
  const faceapi = await loadFaceApi();

  if (!tinyDetectorModelPromise) {
    tinyDetectorModelPromise = faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URI);
  }

  try {
    await tinyDetectorModelPromise;
  } catch (error) {
    tinyDetectorModelPromise = null;
    throw error;
  }
}

async function detectSingleFace(canvas: HTMLCanvasElement): Promise<boolean> {
  const faceapi = await loadFaceApi();
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  const faces = await faceapi.detectAllFaces(canvas, options);
  return faces.length === 1;
}

function getCameraErrorMessage(error: unknown) {
  const name = typeof error === "object" && error && "name" in error ? String(error.name) as CameraErrorName : "";

  if (!window.isSecureContext) {
    return "Camera access requires a secure origin (HTTPS) or localhost. Open the app on HTTPS or localhost and try again.";
  }

  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was blocked. Allow webcam permission in your browser site settings, then click Start Camera again.";
  }

  if (name === "NotFoundError") {
    return "No camera device was found. Connect a webcam and retry.";
  }

  if (name === "NotReadableError" || name === "AbortError") {
    return "Camera is busy or unavailable. Close other apps/tabs using the webcam and retry.";
  }

  if (name === "OverconstrainedError" || name === "TypeError") {
    return "Unable to start camera with current settings. Retry or switch to another camera device.";
  }

  return "Unable to access camera. Check webcam permissions and retry.";
}

async function requestCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
  } catch (error) {
    const name = typeof error === "object" && error && "name" in error ? String(error.name) : "";
    if (name === "OverconstrainedError") {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    throw error;
  }
}

export default function FaceRegistrationStep({ capture, onCapture }: FaceRegistrationStepProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [message, setMessage] = useState<string>(
    "Loading face verification model. This checks that exactly one face is visible in the capture.",
  );
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraActive(false);
  };

  const loadFaceModel = async () => {
    if (isModelReady) return true;

    setIsModelLoading(true);
    try {
      await ensureTinyFaceModelLoaded();
      setIsModelReady(true);
      setMessage("Face model ready. Start camera, center your face, then verify.");
      setMessageTone("info");
      return true;
    } catch {
      setMessage(
        "Unable to load face verification model. Check internet access or host model files locally and retry.",
      );
      setMessageTone("error");
      return false;
    } finally {
      setIsModelLoading(false);
    }
  };

  useEffect(() => {
    void loadFaceModel();

    return () => {
      stopCamera();
    };
  }, []);

  const handleStartCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera API unavailable in this browser.");
      setMessageTone("error");
      return;
    }

    if (!window.isSecureContext) {
      setMessage("Camera access requires HTTPS or localhost. Open the app on a secure origin and retry.");
      setMessageTone("error");
      return;
    }

    const isReady = await loadFaceModel();
    if (!isReady) return;

    try {
      stopCamera();

      if (navigator.permissions?.query) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (cameraPermission.state === "denied") {
            setMessage(
              "Camera permission is currently blocked for this site. Enable it in browser site settings and click Start Camera again.",
            );
            setMessageTone("error");
            return;
          }
        } catch {
          // Ignore permission API failures and proceed with getUserMedia.
        }
      }

      const stream = await requestCameraStream();

      streamRef.current = stream;
      setIsCameraActive(true);
      setMessage("Camera ready. Center your face and click Verify Face.");
      setMessageTone("info");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      setMessage(getCameraErrorMessage(error));
      setMessageTone("error");
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    const isReady = isModelReady ? true : await loadFaceModel();
    if (!isReady) return;

    setIsChecking(true);
    try {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error("Camera frame unavailable. Wait a moment and try again.");
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to read the camera frame.");
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const hasSingleFace = await detectSingleFace(canvas);
      if (!hasSingleFace) {
        setMessage("Face registration failed. Make sure one clear face is visible and retry.");
        setMessageTone("error");
        return;
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      onCapture(dataUrl);
      setMessage("Face registration complete. Identity snapshot verified.");
      setMessageTone("success");
      stopCamera();
    } catch (error) {
      const details = error instanceof Error ? error.message : "Unable to register facial identity.";
      setMessage(details);
      setMessageTone("error");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <VStack align="stretch" gap={4}>
      <Text fontSize="sm" color="gray.600">
        Facial identity registration is required for AI proctoring verification. Face capture is
        accepted only when exactly one face is detected.
      </Text>
      {!isModelReady && (
        <Text fontSize="sm" color={messageTone === "error" ? "red.600" : "orange.600"}>
          {isModelLoading
            ? "Preparing face verification model..."
            : "Face model not ready. Camera start is blocked until model loading succeeds."}
        </Text>
      )}

      <Box border="1px solid" borderColor="blue.100" bg="rgba(248, 250, 252, 0.9)" rounded="xl" p={3}>
        <video
          ref={videoRef}
          style={{
            width: "100%",
            borderRadius: "12px",
            background: "#0F172A",
            display: isCameraActive ? "block" : "none",
          }}
          muted
          playsInline
        />

        {!isCameraActive && !capture && (
          <Box rounded="lg" p={6} textAlign="center" bg="gray.100" color="gray.600" fontSize="sm">
            Camera is off. Start camera to capture identity.
          </Box>
        )}

        {!isCameraActive && capture && (
          <Box>
            <img
              src={capture}
              alt="Registered face preview"
              style={{ width: "100%", borderRadius: "12px", border: "1px solid #BFDBFE" }}
            />
          </Box>
        )}
      </Box>

      <HStack flexWrap="wrap" gap={3}>
        {!isCameraActive && (
          <Button onClick={handleStartCamera} variant="outline" colorPalette="blue" loading={isModelLoading}>
            {capture ? "Retake Capture" : "Start Camera"}
          </Button>
        )}
        {isCameraActive && (
          <Button onClick={handleCapture} loading={isChecking} colorPalette="blue">
            Verify Face
          </Button>
        )}
        {isCameraActive && (
          <Button onClick={stopCamera} variant="ghost">
            Stop Camera
          </Button>
        )}
      </HStack>

      <Text
        fontSize="sm"
        color={messageTone === "success" ? "green.600" : messageTone === "error" ? "red.600" : "gray.600"}
      >
        {message}
      </Text>
    </VStack>
  );
}
