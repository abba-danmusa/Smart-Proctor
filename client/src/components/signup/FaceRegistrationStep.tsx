import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

interface FaceDetectorLike {
  detect(input: ImageBitmapSource): Promise<Array<unknown>>;
}

type FaceDetectorCtor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorLike;

interface FaceRegistrationStepProps {
  capture: string | null;
  onCapture: (dataUrl: string) => void;
}

function supportsFaceDetector() {
  return Boolean((window as Window & { FaceDetector?: FaceDetectorCtor }).FaceDetector);
}

async function detectSingleFace(canvas: HTMLCanvasElement): Promise<boolean> {
  const detectorCtor = (window as Window & { FaceDetector?: FaceDetectorCtor }).FaceDetector;
  if (!detectorCtor) {
    return true;
  }

  const detector = new detectorCtor({ fastMode: true, maxDetectedFaces: 2 });
  const faces = await detector.detect(canvas);
  return faces.length === 1;
}

export default function FaceRegistrationStep({ capture, onCapture }: FaceRegistrationStepProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState<string>(
    "Capture a clear front-facing selfie. The AI face model checks that exactly one face is visible.",
  );
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const [isDetectorSupported] = useState(supportsFaceDetector);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);
      setMessage("Camera ready. Center your face and capture.");
      setMessageTone("info");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setMessage("Camera access denied. Please allow webcam access and retry.");
      setMessageTone("error");
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;

    setIsChecking(true);
    try {
      const video = videoRef.current;
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
      if (isDetectorSupported) {
        setMessage("Face registration complete. Identity snapshot verified.");
        setMessageTone("success");
      } else {
        setMessage(
          "Face registration complete. Your browser does not support automatic face detection, so manual capture was used.",
        );
        setMessageTone("info");
      }
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
        Facial identity registration is required for AI proctoring verification.
      </Text>
      {!isDetectorSupported && (
        <Text fontSize="sm" color="orange.600">
          Automatic face detection is unavailable in this browser. You can still continue with a
          manual identity snapshot.
        </Text>
      )}

      <Box
        border="1px solid"
        borderColor="blue.100"
        bg="rgba(248, 250, 252, 0.9)"
        rounded="xl"
        p={3}
      >
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
          <Box
            rounded="lg"
            p={6}
            textAlign="center"
            bg="gray.100"
            color="gray.600"
            fontSize="sm"
          >
            Camera is off. Start camera to capture identity.
          </Box>
        )}

        {capture && (
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
          <Button onClick={handleStartCamera} variant="outline" colorPalette="blue">
            Start Camera
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
