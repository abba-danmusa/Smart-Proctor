import { Badge, Box, Button, Flex, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getDashboardPathForRole, getSessionUser } from "../../lib/authSession";
import {
  fetchStudentExamSession,
  reportExamProctoringEvent,
  submitExamAttempt,
  type ProctoringEventInput,
  type ProctoringEventSeverity,
  type StudentExamSessionRecord,
} from "../../lib/examApi";

interface FaceDetectionResult {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface FaceDetectorLike {
  detect: (input: CanvasImageSource) => Promise<FaceDetectionResult[]>;
}

interface FaceDetectorConstructor {
  new (options?: { fastMode?: boolean; maxDetectedFaces?: number }): FaceDetectorLike;
}

interface SmartWindow extends Window {
  FaceDetector?: FaceDetectorConstructor;
}

type CameraState = "online" | "offline" | "blocked";
type MicrophoneState = "quiet" | "noise" | "speech" | "blocked";
type FaceState = "checking" | "verified" | "not_detected" | "multiple_faces" | "unsupported";

interface MonitoringLogItem {
  id: string;
  timestamp: string;
  severity: ProctoringEventSeverity;
  message: string;
}

const EXAM_WARNING_MS = [10 * 60 * 1000, 5 * 60 * 1000, 60 * 1000] as const;

function formatRemainingTime(remainingMs: number) {
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function severityPenalty(severity: ProctoringEventSeverity) {
  if (severity === "high") return 10;
  if (severity === "medium") return 5;
  return 2;
}

function getSeverityColor(severity: ProctoringEventSeverity) {
  if (severity === "high") return "red";
  if (severity === "medium") return "orange";
  return "blue";
}

function getCameraStateColor(state: CameraState) {
  if (state === "online") return "green";
  if (state === "blocked") return "red";
  return "orange";
}

function getMicrophoneStateColor(state: MicrophoneState) {
  if (state === "quiet") return "green";
  if (state === "speech") return "red";
  if (state === "noise") return "orange";
  return "red";
}

function getFaceStateColor(state: FaceState) {
  if (state === "verified") return "green";
  if (state === "unsupported") return "blue";
  if (state === "checking") return "orange";
  return "red";
}

function getFaceStateLabel(state: FaceState) {
  if (state === "verified") return "Single face verified";
  if (state === "not_detected") return "Face not detected";
  if (state === "multiple_faces") return "Multiple faces detected";
  if (state === "unsupported") return "Face detector unavailable";
  return "Checking face presence";
}

function toAnswerPayload(answers: Record<string, string>) {
  const entries = Object.entries(answers).map(([questionNumber, value]) => [`q${questionNumber}`, value] as const);
  return Object.fromEntries(entries);
}

function createMonitoringLogItem(input: { severity: ProctoringEventSeverity; message: string }) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: new Date().toLocaleTimeString(),
    severity: input.severity,
    message: input.message,
  } satisfies MonitoringLogItem;
}

export default function StudentExamSessionPage() {
  const user = getSessionUser();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<StudentExamSessionRecord | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);
  const [monitoringLogs, setMonitoringLogs] = useState<MonitoringLogItem[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [remainingTimeMs, setRemainingTimeMs] = useState(0);
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const [cameraState, setCameraState] = useState<CameraState>("offline");
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>("blocked");
  const [faceState, setFaceState] = useState<FaceState>("checking");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioMonitorTimerRef = useRef<number | null>(null);
  const faceMonitorTimerRef = useRef<number | null>(null);
  const motionMonitorTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const isSubmittingRef = useRef(false);
  const warnedThresholdsRef = useRef<Set<number>>(new Set());
  const throttledEventsRef = useRef<Record<string, number>>({});

  const draftStorageKey = useMemo(() => {
    if (!user || !examId) {
      return null;
    }

    return `smart-proctor.exam-draft.${user.id}.${examId}`;
  }, [examId, user]);

  const questions = session?.questions ?? [];
  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const answeredQuestionCount = useMemo(
    () => questions.filter((question) => Boolean(answers[String(question.questionNumber)])).length,
    [answers, questions],
  );

  const flaggedQuestionSet = useMemo(() => new Set(flaggedQuestions), [flaggedQuestions]);

  const resetWarningMessage = useCallback((message: string) => {
    setWarningMessage(message);
    window.setTimeout(() => {
      setWarningMessage((current) => (current === message ? null : current));
    }, 6000);
  }, []);

  const captureVideoFrame = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement || videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
      return undefined;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.55);
  }, []);

  const reportMonitoringEvent = useCallback(
    async (input: ProctoringEventInput) => {
      if (!user || !examId) {
        return;
      }

      const now = Date.now();
      const throttleKey = `${input.eventType}:${input.severity ?? "medium"}`;
      const lastReportedAt = throttledEventsRef.current[throttleKey] ?? 0;
      if (now - lastReportedAt < 6000) {
        return;
      }

      throttledEventsRef.current[throttleKey] = now;

      const severity = input.severity ?? "medium";
      setIntegrityScore((current) => Math.max(0, current - severityPenalty(severity)));
      setMonitoringLogs((current) => [createMonitoringLogItem({ severity, message: input.message }), ...current].slice(0, 12));
      resetWarningMessage(input.message);

      try {
        await reportExamProctoringEvent(examId, user, {
          ...input,
          severity,
          detectedAt: input.detectedAt ?? new Date().toISOString(),
        });
      } catch {
        // If network/reporting fails, local warnings still preserve the evidence trail in-session.
      }
    },
    [examId, resetWarningMessage, user],
  );

  const releaseMediaResources = useCallback(() => {
    if (audioMonitorTimerRef.current !== null) {
      window.clearInterval(audioMonitorTimerRef.current);
      audioMonitorTimerRef.current = null;
    }

    if (faceMonitorTimerRef.current !== null) {
      window.clearInterval(faceMonitorTimerRef.current);
      faceMonitorTimerRef.current = null;
    }

    if (motionMonitorTimerRef.current !== null) {
      window.clearInterval(motionMonitorTimerRef.current);
      motionMonitorTimerRef.current = null;
    }

    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const exitExam = useCallback(
    (message: string) => {
      releaseMediaResources();
      if (draftStorageKey) {
        window.localStorage.removeItem(draftStorageKey);
      }
      navigate("/dashboard/student/exams", { replace: true, state: { examMessage: message } });
    },
    [draftStorageKey, navigate, releaseMediaResources],
  );

  const submitExam = useCallback(
    async (mode: "manual" | "auto") => {
      if (!session || !user || !examId) {
        return;
      }

      if (isSubmittingRef.current) {
        return;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setSessionFeedback(null);

      try {
        const attempt = await submitExamAttempt(examId, user, {
          integrityScore: Math.max(0, Math.round(integrityScore)),
          answers: toAnswerPayload(answers),
        });

        const submittedAt = attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleTimeString() : new Date().toLocaleTimeString();
        const modeLabel = mode === "auto" ? "Time elapsed. Exam auto-submitted" : "Exam submitted";
        exitExam(`${modeLabel} at ${submittedAt}. Integrity score: ${Math.max(0, Math.round(integrityScore))}%.`);
      } catch (error) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        const message = error instanceof Error ? error.message : "Unable to submit this exam right now.";
        setSessionFeedback(message);
      }
    },
    [answers, examId, exitExam, integrityScore, session, user],
  );

  const attemptFullscreen = useCallback(async () => {
    if (!document.documentElement.requestFullscreen || document.fullscreenElement) {
      setIsFullscreen(Boolean(document.fullscreenElement));
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      setIsFullscreen(false);
      void reportMonitoringEvent({
        eventType: "fullscreen_not_enabled",
        severity: "high",
        message: "Fullscreen lock was denied. Exam security is reduced.",
      });
    }
  }, [reportMonitoringEvent]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!examId) {
      setIsLoadingSession(false);
      setSessionFeedback("Exam id is missing.");
      return;
    }

    let disposed = false;

    const loadSession = async () => {
      setIsLoadingSession(true);
      setSessionFeedback(null);

      try {
        const fetchedSession = await fetchStudentExamSession(examId, user);
        if (disposed) {
          return;
        }

        setSession(fetchedSession);
        setCurrentQuestionIndex(0);
        setRemainingTimeMs(Math.max(0, new Date(fetchedSession.exam.endAt).getTime() - Date.now()));

        if (draftStorageKey) {
          const rawDraft = window.localStorage.getItem(draftStorageKey);
          if (rawDraft) {
            try {
              const parsedDraft = JSON.parse(rawDraft) as { answers?: Record<string, string>; flaggedQuestions?: number[] };
              setAnswers(parsedDraft.answers ?? {});
              setFlaggedQuestions(Array.isArray(parsedDraft.flaggedQuestions) ? parsedDraft.flaggedQuestions : []);
            } catch {
              // Ignore malformed persisted draft.
            }
          }
        }
      } catch (error) {
        if (disposed) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load this exam session right now.";
        setSessionFeedback(message);
      } finally {
        if (!disposed) {
          setIsLoadingSession(false);
        }
      }
    };

    void loadSession();

    return () => {
      disposed = true;
    };
  }, [draftStorageKey, examId, user]);

  useEffect(() => {
    if (!draftStorageKey) {
      return;
    }

    const payload = JSON.stringify({
      answers,
      flaggedQuestions,
      updatedAt: new Date().toISOString(),
    });

    window.localStorage.setItem(draftStorageKey, payload);
  }, [answers, draftStorageKey, flaggedQuestions]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const endAtTime = new Date(session.exam.endAt).getTime();

    countdownTimerRef.current = window.setInterval(() => {
      const nextRemaining = Math.max(0, endAtTime - Date.now());
      setRemainingTimeMs(nextRemaining);

      for (const threshold of EXAM_WARNING_MS) {
        if (nextRemaining <= threshold && !warnedThresholdsRef.current.has(threshold)) {
          warnedThresholdsRef.current.add(threshold);
          resetWarningMessage(`Time alert: ${formatRemainingTime(threshold)} remaining.`);
        }
      }

      if (nextRemaining <= 0 && !isSubmittingRef.current) {
        void submitExam("auto");
      }
    }, 1000);

    return () => {
      if (countdownTimerRef.current !== null) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [resetWarningMessage, session, submitExam]);

  useEffect(() => {
    if (!session || !user || !examId) {
      return;
    }

    let disposed = false;

    const startMonitoring = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setCameraState("online");
        setMicrophoneState("quiet");

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.addEventListener("ended", () => {
            setCameraState("offline");
            void reportMonitoringEvent({
              eventType: "camera_offline",
              severity: "high",
              message: "Camera feed stopped during the exam.",
              evidence: {
                frameDataUrl: captureVideoFrame(),
              },
            });
          });
        }

        const videoElement = videoRef.current;
        if (videoElement) {
          videoElement.srcObject = stream;
          void videoElement.play().catch(() => undefined);
        }

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const sourceNode = audioContext.createMediaStreamSource(stream);
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 2048;
        analyserNode.smoothingTimeConstant = 0.5;
        sourceNode.connect(analyserNode);
        analyserRef.current = analyserNode;

        audioMonitorTimerRef.current = window.setInterval(() => {
          const analyser = analyserRef.current;
          if (!analyser) {
            return;
          }

          const data = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(data);

          let squaredSum = 0;
          let zeroCrossings = 0;

          for (let index = 1; index < data.length; index += 1) {
            const normalizedCurrent = (data[index] - 128) / 128;
            const normalizedPrevious = (data[index - 1] - 128) / 128;
            squaredSum += normalizedCurrent * normalizedCurrent;
            if ((normalizedCurrent >= 0 && normalizedPrevious < 0) || (normalizedCurrent < 0 && normalizedPrevious >= 0)) {
              zeroCrossings += 1;
            }
          }

          const rms = Math.sqrt(squaredSum / data.length);
          const zeroCrossingRate = zeroCrossings / data.length;

          if (rms < 0.03) {
            setMicrophoneState("quiet");
            return;
          }

          if (zeroCrossingRate > 0.08 && zeroCrossingRate < 0.22) {
            setMicrophoneState("speech");

            if (session.exam.proctoring.soundDetection) {
              void reportMonitoringEvent({
                eventType: "speech_detected",
                severity: "medium",
                message: "Speech-like audio detected by the microphone.",
                evidence: {
                  rms,
                  zeroCrossingRate,
                },
              });
            }

            return;
          }

          setMicrophoneState("noise");
          if (session.exam.proctoring.soundDetection && rms >= 0.1) {
            void reportMonitoringEvent({
              eventType: "noise_detected",
              severity: "low",
              message: "Unusual background noise detected.",
              evidence: {
                rms,
                zeroCrossingRate,
              },
            });
          }
        }, 2500);

        const faceDetectorCtor = (window as SmartWindow).FaceDetector;
        if (!faceDetectorCtor || !session.exam.proctoring.multipleFaceDetection) {
          setFaceState("unsupported");
          return;
        }

        const detector = new faceDetectorCtor({ fastMode: true, maxDetectedFaces: 4 });
        setFaceState("checking");

        faceMonitorTimerRef.current = window.setInterval(() => {
          const video = videoRef.current;
          if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
            return;
          }

          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext("2d");
          if (!context) {
            return;
          }

          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          void detector
            .detect(canvas)
            .then((faces) => {
              if (faces.length === 1) {
                setFaceState("verified");
                return;
              }

              if (faces.length === 0) {
                setFaceState("not_detected");
                void reportMonitoringEvent({
                  eventType: "face_not_detected",
                  severity: "high",
                  message: "No face detected in camera frame.",
                  evidence: {
                    frameDataUrl: canvas.toDataURL("image/jpeg", 0.55),
                    faceCount: faces.length,
                  },
                });
                return;
              }

              setFaceState("multiple_faces");
              void reportMonitoringEvent({
                eventType: "multiple_faces_detected",
                severity: "high",
                message: "Multiple faces detected in camera frame.",
                evidence: {
                  frameDataUrl: canvas.toDataURL("image/jpeg", 0.55),
                  faceCount: faces.length,
                },
              });
            })
            .catch(() => {
              setFaceState("unsupported");
            });
        }, 6000);

        let previousFrameData: Uint8ClampedArray | null = null;
        motionMonitorTimerRef.current = window.setInterval(() => {
          const video = videoRef.current;
          if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
            return;
          }

          const canvas = document.createElement("canvas");
          canvas.width = 160;
          canvas.height = 120;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            return;
          }

          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;

          if (previousFrameData) {
            let diffSum = 0;
            let samples = 0;

            for (let index = 0; index < imageData.length; index += 12) {
              diffSum += Math.abs(imageData[index] - previousFrameData[index]);
              samples += 1;
            }

            const averageDiff = samples > 0 ? diffSum / samples : 0;
            if (averageDiff > 30) {
              void reportMonitoringEvent({
                eventType: "foreign_material_suspected",
                severity: "medium",
                message: "Unusual visual movement suggests possible foreign material in frame.",
                evidence: {
                  movementScore: averageDiff,
                  frameDataUrl: canvas.toDataURL("image/jpeg", 0.55),
                },
              });
            }
          }

          previousFrameData = imageData;
        }, 7000);
      } catch {
        if (disposed) {
          return;
        }

        setCameraState("blocked");
        setMicrophoneState("blocked");
        setFaceState("unsupported");

        void reportMonitoringEvent({
          eventType: "device_access_blocked",
          severity: "high",
          message: "Camera or microphone permission is blocked.",
        });
      }
    };

    void startMonitoring();
    void attemptFullscreen();

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        void reportMonitoringEvent({
          eventType: "tab_switch",
          severity: "medium",
          message: "Exam tab lost visibility.",
          evidence: {
            visibilityState: document.visibilityState,
          },
        });
      }
    };

    const handleWindowBlur = () => {
      void reportMonitoringEvent({
        eventType: "window_blur",
        severity: "medium",
        message: "Exam window lost focus.",
      });
    };

    const handleFullscreenChange = () => {
      const fullscreenActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreenActive);
      if (!fullscreenActive) {
        void reportMonitoringEvent({
          eventType: "fullscreen_exit",
          severity: "high",
          message: "Fullscreen mode was exited during exam.",
        });
      }
    };

    const blockClipboardAction = (event: ClipboardEvent) => {
      event.preventDefault();
      void reportMonitoringEvent({
        eventType: "clipboard_blocked",
        severity: "medium",
        message: "Copy/paste action was blocked during exam.",
      });
    };

    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      void reportMonitoringEvent({
        eventType: "context_menu_blocked",
        severity: "low",
        message: "Context menu access was blocked.",
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      setKeystrokeCount((current) => current + 1);

      const key = event.key.toLowerCase();
      const isRestrictedShortcut =
        (event.ctrlKey || event.metaKey) && ["c", "v", "x", "a", "p", "s"].includes(key);

      if (isRestrictedShortcut) {
        event.preventDefault();
        void reportMonitoringEvent({
          eventType: "restricted_shortcut",
          severity: "medium",
          message: `Restricted keyboard shortcut detected: ${event.key}.`,
          evidence: {
            key: event.key,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
          },
        });
      }

      if (event.key === "Escape" && document.fullscreenElement) {
        void reportMonitoringEvent({
          eventType: "escape_key_pressed",
          severity: "medium",
          message: "Escape key pressed while exam was fullscreen.",
        });
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleOffline = () => {
      void reportMonitoringEvent({
        eventType: "network_offline",
        severity: "medium",
        message: "Network connection lost during exam.",
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("copy", blockClipboardAction);
    window.addEventListener("cut", blockClipboardAction);
    window.addEventListener("paste", blockClipboardAction);
    window.addEventListener("contextmenu", blockContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("offline", handleOffline);
    setIsFullscreen(Boolean(document.fullscreenElement));

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("copy", blockClipboardAction);
      window.removeEventListener("cut", blockClipboardAction);
      window.removeEventListener("paste", blockClipboardAction);
      window.removeEventListener("contextmenu", blockContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("offline", handleOffline);
      releaseMediaResources();
    };
  }, [attemptFullscreen, captureVideoFrame, examId, releaseMediaResources, reportMonitoringEvent, session, user]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== "student") {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  if (!examId) {
    return <Navigate to="/dashboard/student/exams" replace />;
  }

  return (
    <Box minH="100vh" bg="linear-gradient(172deg, #f4f7fb 0%, #eaf2ff 52%, #f5f2ea 100%)" px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }}>
      <VStack align="stretch" gap={4}>
        <Box rounded="2xl" border="1px solid" borderColor="rgba(15, 23, 42, 0.08)" bg="white" p={4} shadow="0 12px 30px rgba(15, 23, 42, 0.08)">
          <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={3} flexWrap="wrap">
            <Box>
              <Text fontSize="xs" fontWeight="bold" letterSpacing="0.1em" textTransform="uppercase" color="blue.700">
                Proctored Session
              </Text>
              <Heading size="md" color="gray.800">
                {session?.exam.title ?? "Loading exam..."}
              </Heading>
              <Text color="gray.600" fontSize="sm">
                {session?.exam.courseCode ? `${session.exam.courseCode} - ${session.exam.course}` : session?.exam.course ?? ""}
              </Text>
            </Box>

            <Flex align="center" gap={2} flexWrap="wrap">
              <Badge colorPalette={remainingTimeMs <= 5 * 60 * 1000 ? "red" : "blue"} px={3} py={1}>
                Time Left: {formatRemainingTime(remainingTimeMs)}
              </Badge>
              <Badge colorPalette={integrityScore >= 80 ? "green" : integrityScore >= 60 ? "orange" : "red"} px={3} py={1}>
                Integrity: {Math.max(0, Math.round(integrityScore))}%
              </Badge>
              <Badge colorPalette={isFullscreen ? "green" : "red"} px={3} py={1}>
                {isFullscreen ? "Fullscreen Locked" : "Not Fullscreen"}
              </Badge>
              <Button size="sm" variant="outline" colorPalette="blue" onClick={() => void attemptFullscreen()}>
                Re-enter Fullscreen
              </Button>
              <Button
                size="sm"
                colorPalette="blue"
                loading={isSubmitting}
                onClick={() => {
                  if (isSubmitting) {
                    return;
                  }

                  const shouldSubmit = window.confirm("Submit this exam now? You will not be able to continue afterwards.");
                  if (shouldSubmit) {
                    void submitExam("manual");
                  }
                }}
              >
                Submit Exam
              </Button>
            </Flex>
          </Flex>
        </Box>

        {warningMessage ? (
          <Box rounded="xl" border="1px solid" borderColor="orange.300" bg="orange.50" px={4} py={3}>
            <Text fontSize="sm" color="orange.800">
              {warningMessage}
            </Text>
          </Box>
        ) : null}

        {sessionFeedback ? (
          <Box rounded="xl" border="1px solid" borderColor="red.300" bg="red.50" px={4} py={3}>
            <Text fontSize="sm" color="red.800">
              {sessionFeedback}
            </Text>
          </Box>
        ) : null}

        <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 1.9fr) minmax(310px, 1fr)" }} gap={4}>
          <Box rounded="2xl" border="1px solid" borderColor="rgba(15, 23, 42, 0.08)" bg="white" p={4} shadow="0 12px 30px rgba(15, 23, 42, 0.08)">
            <Flex justify="space-between" align="center" mb={4} gap={3} flexWrap="wrap">
              <Heading size="sm" color="gray.800">
                Questions
              </Heading>
              <Text fontSize="sm" color="gray.600">
                Answered {answeredQuestionCount}/{questions.length}
              </Text>
            </Flex>

            {isLoadingSession ? (
              <Text color="gray.600" fontSize="sm">
                Loading exam questions...
              </Text>
            ) : null}

            {!isLoadingSession && currentQuestion ? (
              <VStack align="stretch" gap={4}>
                <Box rounded="xl" border="1px solid" borderColor="gray.200" bg="gray.50" p={4}>
                  <Flex justify="space-between" align="center" mb={3} gap={3} flexWrap="wrap">
                    <Heading size="sm" color="gray.800">
                      Question {currentQuestion.questionNumber}
                    </Heading>
                    <Badge colorPalette={answers[String(currentQuestion.questionNumber)] ? "green" : "gray"}>
                      {answers[String(currentQuestion.questionNumber)] ? "Answered" : "Unanswered"}
                    </Badge>
                  </Flex>
                  <Text color="gray.800" mb={4}>
                    {currentQuestion.prompt}
                  </Text>

                  <VStack align="stretch" gap={2}>
                    {currentQuestion.options.map((option, index) => {
                      const optionKey = String.fromCharCode(65 + index);
                      const questionAnswer = answers[String(currentQuestion.questionNumber)] ?? "";
                      const selected = questionAnswer === optionKey;

                      return (
                        <Button
                          key={`${currentQuestion.questionNumber}-${option}`}
                          justifyContent="start"
                          variant={selected ? "solid" : "outline"}
                          colorPalette={selected ? "blue" : "gray"}
                          onClick={() => {
                            setAnswers((current) => ({
                              ...current,
                              [String(currentQuestion.questionNumber)]: optionKey,
                            }));
                          }}
                        >
                          {optionKey}. {option}
                        </Button>
                      );
                    })}
                  </VStack>
                </Box>

                <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
                  <Flex gap={2}>
                    <Button
                      variant="outline"
                      colorPalette="blue"
                      disabled={currentQuestionIndex <= 0}
                      onClick={() => setCurrentQuestionIndex((current) => Math.max(0, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      colorPalette="blue"
                      disabled={currentQuestionIndex >= questions.length - 1}
                      onClick={() => setCurrentQuestionIndex((current) => Math.min(questions.length - 1, current + 1))}
                    >
                      Next
                    </Button>
                  </Flex>

                  <Button
                    variant={flaggedQuestionSet.has(currentQuestion.questionNumber) ? "solid" : "outline"}
                    colorPalette={flaggedQuestionSet.has(currentQuestion.questionNumber) ? "orange" : "gray"}
                    onClick={() => {
                      setFlaggedQuestions((current) => {
                        if (current.includes(currentQuestion.questionNumber)) {
                          return current.filter((questionNumber) => questionNumber !== currentQuestion.questionNumber);
                        }

                        return [...current, currentQuestion.questionNumber].sort((first, second) => first - second);
                      });
                    }}
                  >
                    {flaggedQuestionSet.has(currentQuestion.questionNumber) ? "Flagged for Review" : "Flag Question"}
                  </Button>
                </Flex>
              </VStack>
            ) : null}
          </Box>

          <VStack align="stretch" gap={4}>
            <Box rounded="2xl" border="1px solid" borderColor="rgba(15, 23, 42, 0.08)" bg="white" p={4} shadow="0 12px 30px rgba(15, 23, 42, 0.08)">
              <Heading size="sm" color="gray.800" mb={3}>
                Question Navigator
              </Heading>
              <Grid templateColumns="repeat(5, minmax(0, 1fr))" gap={2}>
                {questions.map((question, index) => {
                  const answered = Boolean(answers[String(question.questionNumber)]);
                  const current = index === currentQuestionIndex;
                  const flagged = flaggedQuestionSet.has(question.questionNumber);

                  return (
                    <Button
                      key={question.questionNumber}
                      size="sm"
                      variant={current ? "solid" : answered ? "outline" : "ghost"}
                      colorPalette={current ? "blue" : flagged ? "orange" : answered ? "green" : "gray"}
                      onClick={() => setCurrentQuestionIndex(index)}
                    >
                      {question.questionNumber}
                    </Button>
                  );
                })}
              </Grid>
            </Box>

            <Box rounded="2xl" border="1px solid" borderColor="rgba(15, 23, 42, 0.08)" bg="white" p={4} shadow="0 12px 30px rgba(15, 23, 42, 0.08)">
              <Heading size="sm" color="gray.800" mb={3}>
                Live Proctoring Feed
              </Heading>
              <Box rounded="lg" border="1px solid" borderColor="gray.200" overflow="hidden" bg="black" mb={3}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxHeight: "190px", objectFit: "cover" }} />
              </Box>

              <VStack align="stretch" gap={2}>
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm" color="gray.700">
                    Camera
                  </Text>
                  <Badge colorPalette={getCameraStateColor(cameraState)}>{cameraState}</Badge>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm" color="gray.700">
                    Microphone
                  </Text>
                  <Badge colorPalette={getMicrophoneStateColor(microphoneState)}>{microphoneState}</Badge>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm" color="gray.700">
                    Face Status
                  </Text>
                  <Badge colorPalette={getFaceStateColor(faceState)}>{getFaceStateLabel(faceState)}</Badge>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm" color="gray.700">
                    Keystrokes Captured
                  </Text>
                  <Badge colorPalette="blue">{keystrokeCount}</Badge>
                </Flex>
              </VStack>
            </Box>

            <Box rounded="2xl" border="1px solid" borderColor="rgba(15, 23, 42, 0.08)" bg="white" p={4} shadow="0 12px 30px rgba(15, 23, 42, 0.08)">
              <Heading size="sm" color="gray.800" mb={3}>
                Suspicious Activity Log
              </Heading>
              <VStack align="stretch" gap={2} maxH="220px" overflowY="auto">
                {monitoringLogs.length === 0 ? (
                  <Text fontSize="sm" color="gray.600">
                    No suspicious event logged yet.
                  </Text>
                ) : null}
                {monitoringLogs.map((item) => (
                  <Box key={item.id} rounded="lg" border="1px solid" borderColor="gray.200" bg="gray.50" px={3} py={2}>
                    <Flex justify="space-between" align="center" gap={2} mb={1}>
                      <Text fontSize="xs" color="gray.600">
                        {item.timestamp}
                      </Text>
                      <Badge size="sm" colorPalette={getSeverityColor(item.severity)}>
                        {item.severity}
                      </Badge>
                    </Flex>
                    <Text fontSize="sm" color="gray.800">
                      {item.message}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </Box>
          </VStack>
        </Grid>
      </VStack>
    </Box>
  );
}
