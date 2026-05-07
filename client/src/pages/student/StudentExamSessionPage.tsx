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
import { detectFacesWithLandmarks, type FaceApiLandmarksLike, type FaceApiPointLike } from "../../lib/faceApi";
import { getProctoringEventLabel, getProctoringPenalty } from "../../lib/proctoring";

type CameraState = "online" | "offline" | "blocked";
type MicrophoneState = "quiet" | "noise" | "speech" | "blocked";
type FaceState = "checking" | "verified" | "not_detected" | "multiple_faces" | "unsupported" | "disabled";
type AttentionState = "checking" | "focused" | "drifting" | "unsupported";

interface MonitoringLogItem {
  id: string;
  timestamp: string;
  severity: ProctoringEventSeverity;
  message: string;
}

interface ExamDraftState {
  answers?: Record<string, string>;
  flaggedQuestions?: number[];
  currentQuestionNumber?: number | null;
}

const EXAM_WARNING_MS = [10 * 60 * 1000, 5 * 60 * 1000, 60 * 1000] as const;
const ATTENTION_DRIFT_STREAK_THRESHOLD = 2;
const MATERIAL_SUSPICION_STREAK_THRESHOLD = 2;
const SPEECH_STREAK_THRESHOLD = 2;

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
  if (state === "disabled") return "gray";
  if (state === "unsupported") return "blue";
  if (state === "checking") return "orange";
  return "red";
}

function getFaceStateLabel(state: FaceState) {
  if (state === "verified") return "Single face verified";
  if (state === "not_detected") return "Face not detected";
  if (state === "multiple_faces") return "Multiple faces detected";
  if (state === "disabled") return "Face monitoring disabled";
  if (state === "unsupported") return "Face monitoring unavailable";
  return "Checking face presence";
}

function getAttentionStateColor(state: AttentionState) {
  if (state === "focused") return "green";
  if (state === "drifting") return "orange";
  if (state === "unsupported") return "blue";
  return "gray";
}

function getAttentionStateLabel(state: AttentionState) {
  if (state === "focused") return "Focused on screen";
  if (state === "drifting") return "Possible eye/head drift";
  if (state === "unsupported") return "Attention monitoring unavailable";
  return "Checking screen focus";
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

function averagePoint(points: FaceApiPointLike[]) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const totals = points.reduce(
    (current, point) => ({
      x: current.x + point.x,
      y: current.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: totals.x / points.length,
    y: totals.y / points.length,
  };
}

function distanceBetween(first: FaceApiPointLike, second: FaceApiPointLike) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function calculateEyeAspectRatio(points: FaceApiPointLike[]) {
  if (points.length < 6) {
    return 0;
  }

  const verticalLeft = distanceBetween(points[1], points[5]);
  const verticalRight = distanceBetween(points[2], points[4]);
  const horizontal = distanceBetween(points[0], points[3]);

  if (horizontal <= 0) {
    return 0;
  }

  return (verticalLeft + verticalRight) / (2 * horizontal);
}

function analyzeAttention(landmarks: FaceApiLandmarksLike, frameWidth: number, frameHeight: number) {
  const leftEyeCenter = averagePoint(landmarks.getLeftEye());
  const rightEyeCenter = averagePoint(landmarks.getRightEye());
  const noseCenter = averagePoint(landmarks.getNose());
  const eyeMidpoint = averagePoint([leftEyeCenter, rightEyeCenter]);
  const interocularDistance = distanceBetween(leftEyeCenter, rightEyeCenter);
  const headTurnRatio =
    interocularDistance > 0 ? Math.abs(noseCenter.x - eyeMidpoint.x) / interocularDistance : 0;

  const faceCenterOffsetX = Math.abs(eyeMidpoint.x / Math.max(frameWidth, 1) - 0.5);
  const faceCenterOffsetY = Math.abs(noseCenter.y / Math.max(frameHeight, 1) - 0.48);
  const leftEyeAspectRatio = calculateEyeAspectRatio(landmarks.getLeftEye());
  const rightEyeAspectRatio = calculateEyeAspectRatio(landmarks.getRightEye());
  const averageEyeAspectRatio = (leftEyeAspectRatio + rightEyeAspectRatio) / 2;

  const isDrifting =
    headTurnRatio > 0.22 || faceCenterOffsetX > 0.2 || faceCenterOffsetY > 0.18 || averageEyeAspectRatio < 0.16;

  return {
    averageEyeAspectRatio,
    faceCenterOffsetX,
    faceCenterOffsetY,
    headTurnRatio,
    isDrifting,
  };
}

export default function StudentExamSessionPage() {
  const [user] = useState(() => getSessionUser());
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<StudentExamSessionRecord | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQuestionNumber, setActiveQuestionNumber] = useState<number | null>(null);
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
  const [attentionState, setAttentionState] = useState<AttentionState>("checking");
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
  const hasHydratedDraftRef = useRef(false);
  const speechStreakRef = useRef(0);
  const attentionDriftStreakRef = useRef(0);
  const materialSuspicionStreakRef = useRef(0);

  const draftStorageKey = useMemo(() => {
    if (!user?.id || !examId) {
      return null;
    }

    return `smart-proctor.exam-draft.${user.id}.${examId}`;
  }, [examId, user?.id]);

  const questions = useMemo(() => session?.questions ?? [], [session]);
  const currentQuestionIndex = useMemo(() => {
    if (questions.length === 0) {
      return -1;
    }

    if (activeQuestionNumber === null) {
      return 0;
    }

    const questionIndex = questions.findIndex((question) => question.questionNumber === activeQuestionNumber);
    return questionIndex >= 0 ? questionIndex : 0;
  }, [activeQuestionNumber, questions]);
  const currentQuestion = currentQuestionIndex >= 0 ? questions[currentQuestionIndex] ?? null : null;
  const answeredQuestionCount = useMemo(
    () => questions.filter((question) => Boolean(answers[String(question.questionNumber)])).length,
    [answers, questions],
  );

  const flaggedQuestionSet = useMemo(() => new Set(flaggedQuestions), [flaggedQuestions]);

  useEffect(() => {
    if (questions.length === 0) {
      if (activeQuestionNumber !== null) {
        setActiveQuestionNumber(null);
      }
      return;
    }

    if (activeQuestionNumber === null || !questions.some((question) => question.questionNumber === activeQuestionNumber)) {
      setActiveQuestionNumber(questions[0].questionNumber);
    }
  }, [activeQuestionNumber, questions]);

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

  const attachStreamToVideo = useCallback((stream: MediaStream) => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    const playVideo = () => {
      void videoElement.play().catch(() => undefined);
    };

    videoElement.muted = true;
    videoElement.srcObject = stream;

    if (videoElement.readyState >= HTMLMediaElement.HAVE_METADATA) {
      playVideo();
      return;
    }

    videoElement.addEventListener("loadedmetadata", playVideo, { once: true });
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
      const penalty = getProctoringPenalty(input.eventType, severity);
      setIntegrityScore((current) => Math.max(0, current - penalty));
      setMonitoringLogs((current) => {
        const eventLabel = getProctoringEventLabel(input.eventType);
        return [createMonitoringLogItem({ severity, message: `${eventLabel}: ${input.message}` }), ...current].slice(0, 12);
      });
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

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.pause();
      videoElement.srcObject = null;
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
      hasHydratedDraftRef.current = false;
      setIsLoadingSession(true);
      setSessionFeedback(null);
      setSession(null);
      setAnswers({});
      setFlaggedQuestions([]);
      setActiveQuestionNumber(null);
      setMonitoringLogs([]);
      setWarningMessage(null);
      setIntegrityScore(100);
      setRemainingTimeMs(0);
      setKeystrokeCount(0);
      setCameraState("offline");
      setMicrophoneState("blocked");
      setFaceState("checking");
      setAttentionState("checking");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      warnedThresholdsRef.current.clear();
      throttledEventsRef.current = {};
      speechStreakRef.current = 0;
      attentionDriftStreakRef.current = 0;
      materialSuspicionStreakRef.current = 0;

      try {
        const fetchedSession = await fetchStudentExamSession(examId, user);
        if (disposed) {
          return;
        }

        let restoredAnswers: Record<string, string> = {};
        let restoredFlaggedQuestions: number[] = [];
        let restoredQuestionNumber = fetchedSession.questions[0]?.questionNumber ?? null;

        if (draftStorageKey) {
          const rawDraft = window.localStorage.getItem(draftStorageKey);
          if (rawDraft) {
            try {
              const parsedDraft = JSON.parse(rawDraft) as ExamDraftState;
              restoredAnswers = parsedDraft.answers ?? {};
              restoredFlaggedQuestions = Array.isArray(parsedDraft.flaggedQuestions)
                ? parsedDraft.flaggedQuestions.filter((questionNumber) => typeof questionNumber === "number")
                : [];

              const draftQuestionNumber =
                typeof parsedDraft.currentQuestionNumber === "number" ? parsedDraft.currentQuestionNumber : null;

              if (
                draftQuestionNumber !== null &&
                fetchedSession.questions.some((question) => question.questionNumber === draftQuestionNumber)
              ) {
                restoredQuestionNumber = draftQuestionNumber;
              }
            } catch {
              // Ignore malformed persisted draft.
            }
          }
        }

        setSession(fetchedSession);
        setAnswers(restoredAnswers);
        setFlaggedQuestions(restoredFlaggedQuestions);
        setActiveQuestionNumber(restoredQuestionNumber);
        setRemainingTimeMs(Math.max(0, new Date(fetchedSession.exam.endAt).getTime() - Date.now()));
        hasHydratedDraftRef.current = true;
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
    if (!draftStorageKey || !session || !hasHydratedDraftRef.current) {
      return;
    }

    const payload = JSON.stringify({
      answers,
      flaggedQuestions,
      currentQuestionNumber: currentQuestion?.questionNumber ?? null,
      updatedAt: new Date().toISOString(),
    });

    window.localStorage.setItem(draftStorageKey, payload);
  }, [answers, currentQuestion?.questionNumber, draftStorageKey, flaggedQuestions, session]);

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
    const faceMonitoringEnabled = session.exam.proctoring.faceVerification || session.exam.proctoring.multipleFaceDetection;
    const tabSwitchDetectionEnabled = session.exam.proctoring.tabSwitchDetection;
    let detachVideoTrackListener: (() => void) | undefined;

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
          const handleVideoTrackEnded = () => {
            setCameraState("offline");
            void reportMonitoringEvent({
              eventType: "camera_offline",
              severity: "high",
              message: "Camera feed stopped during the exam.",
              evidence: {
                frameDataUrl: captureVideoFrame(),
              },
            });
          };

          videoTrack.addEventListener("ended", handleVideoTrackEnded);
          detachVideoTrackListener = () => {
            videoTrack.removeEventListener("ended", handleVideoTrackEnded);
          };
        }

        attachStreamToVideo(stream);

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        if (audioContext.state === "suspended") {
          void audioContext.resume().catch(() => undefined);
        }
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
            speechStreakRef.current = 0;
            setMicrophoneState("quiet");
            return;
          }

          if (zeroCrossingRate > 0.08 && zeroCrossingRate < 0.22) {
            setMicrophoneState("speech");
            speechStreakRef.current += 1;

            if (session.exam.proctoring.soundDetection) {
              void reportMonitoringEvent({
                eventType: speechStreakRef.current >= SPEECH_STREAK_THRESHOLD ? "prolonged_speech_detected" : "speech_detected",
                severity: speechStreakRef.current >= SPEECH_STREAK_THRESHOLD ? "high" : "medium",
                message:
                  speechStreakRef.current >= SPEECH_STREAK_THRESHOLD
                    ? "Repeated speech was detected near the student."
                    : "Speech-like audio detected by the microphone.",
                evidence: {
                  rms,
                  speechStreak: speechStreakRef.current,
                  zeroCrossingRate,
                },
              });
            }

            return;
          }

          speechStreakRef.current = 0;
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

        if (!faceMonitoringEnabled) {
          setFaceState("disabled");
          setAttentionState("unsupported");
        } else {
          setFaceState("checking");
          setAttentionState("checking");

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
            void detectFacesWithLandmarks(canvas)
              .then((faces) => {
                if (faces.length === 0) {
                  attentionDriftStreakRef.current = 0;
                  setAttentionState("checking");

                  if (!session.exam.proctoring.faceVerification) {
                    setFaceState("checking");
                    return;
                  }

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

                if (faces.length > 1 && session.exam.proctoring.multipleFaceDetection) {
                  setFaceState("multiple_faces");
                  setAttentionState("drifting");
                  void reportMonitoringEvent({
                    eventType: "multiple_faces_detected",
                    severity: "high",
                    message: "Multiple faces detected in camera frame.",
                    evidence: {
                      frameDataUrl: canvas.toDataURL("image/jpeg", 0.55),
                      faceCount: faces.length,
                    },
                  });
                  return;
                }

                const primaryFace = faces[0];
                const attention = analyzeAttention(primaryFace.landmarks, canvas.width, canvas.height);

                setFaceState("verified");
                if (attention.isDrifting) {
                  attentionDriftStreakRef.current += 1;
                  setAttentionState("drifting");

                  if (attentionDriftStreakRef.current >= ATTENTION_DRIFT_STREAK_THRESHOLD) {
                    void reportMonitoringEvent({
                      eventType: "attention_drift_detected",
                      severity: "medium",
                      message: "Eyes or head appear repeatedly turned away from the exam screen.",
                      evidence: {
                        eyeAspectRatio: attention.averageEyeAspectRatio,
                        faceCenterOffsetX: attention.faceCenterOffsetX,
                        faceCenterOffsetY: attention.faceCenterOffsetY,
                        frameDataUrl: canvas.toDataURL("image/jpeg", 0.55),
                        headTurnRatio: attention.headTurnRatio,
                      },
                    });
                  }

                  return;
                }

                attentionDriftStreakRef.current = 0;
                setAttentionState("focused");
              })
              .catch(() => {
                setFaceState("unsupported");
                setAttentionState("unsupported");

                if (faceMonitorTimerRef.current !== null) {
                  window.clearInterval(faceMonitorTimerRef.current);
                  faceMonitorTimerRef.current = null;
                }
              });
          }, 6000);
        }

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
            let totalSamples = 0;
            let changedSamples = 0;
            let lowerFrameSamples = 0;
            let lowerFrameChangedSamples = 0;

            for (let y = 0; y < canvas.height; y += 3) {
              for (let x = 0; x < canvas.width; x += 3) {
                const index = (y * canvas.width + x) * 4;
                const redDiff = Math.abs(imageData[index] - previousFrameData[index]);
                const greenDiff = Math.abs(imageData[index + 1] - previousFrameData[index + 1]);
                const blueDiff = Math.abs(imageData[index + 2] - previousFrameData[index + 2]);
                const pixelDiff = (redDiff + greenDiff + blueDiff) / 3;

                diffSum += pixelDiff;
                totalSamples += 1;

                const changed = pixelDiff > 42;
                if (changed) {
                  changedSamples += 1;
                }

                const isLikelyDeskRegion = y >= canvas.height * 0.52 && x >= canvas.width * 0.16 && x <= canvas.width * 0.84;
                if (isLikelyDeskRegion) {
                  lowerFrameSamples += 1;
                  if (changed) {
                    lowerFrameChangedSamples += 1;
                  }
                }
              }
            }

            const averageDiff = totalSamples > 0 ? diffSum / totalSamples : 0;
            const changedPixelRatio = totalSamples > 0 ? changedSamples / totalSamples : 0;
            const lowerFrameChangeRatio = lowerFrameSamples > 0 ? lowerFrameChangedSamples / lowerFrameSamples : 0;
            const likelyForeignMaterial =
              averageDiff > 24 && changedPixelRatio > 0.14 && lowerFrameChangeRatio > 0.24;

            if (likelyForeignMaterial) {
              materialSuspicionStreakRef.current += 1;
            } else {
              materialSuspicionStreakRef.current = 0;
            }

            if (materialSuspicionStreakRef.current >= MATERIAL_SUSPICION_STREAK_THRESHOLD) {
              void reportMonitoringEvent({
                eventType: "foreign_material_suspected",
                severity: "medium",
                message: "Possible phone, paper, or other foreign material appeared in the frame.",
                evidence: {
                  changedPixelRatio,
                  deskRegionChangeRatio: lowerFrameChangeRatio,
                  movementScore: averageDiff,
                  frameDataUrl: canvas.toDataURL("image/jpeg", 0.55),
                },
              });
            }
          }

          previousFrameData = new Uint8ClampedArray(imageData);
        }, 7000);
      } catch {
        if (disposed) {
          return;
        }

        setCameraState("blocked");
        setMicrophoneState("blocked");
        setFaceState(faceMonitoringEnabled ? "unsupported" : "disabled");
        setAttentionState("unsupported");

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
      if (tabSwitchDetectionEnabled && document.visibilityState !== "visible") {
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
      if (tabSwitchDetectionEnabled) {
        void reportMonitoringEvent({
          eventType: "window_blur",
          severity: "medium",
          message: "Exam window lost focus.",
        });
      }
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
      detachVideoTrackListener?.();
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
  }, [attachStreamToVideo, attemptFullscreen, captureVideoFrame, examId, releaseMediaResources, reportMonitoringEvent, session, user]);

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
                      onClick={() => {
                        const previousQuestion = questions[currentQuestionIndex - 1];
                        if (previousQuestion) {
                          setActiveQuestionNumber(previousQuestion.questionNumber);
                        }
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      colorPalette="blue"
                      disabled={currentQuestionIndex >= questions.length - 1}
                      onClick={() => {
                        const nextQuestion = questions[currentQuestionIndex + 1];
                        if (nextQuestion) {
                          setActiveQuestionNumber(nextQuestion.questionNumber);
                        }
                      }}
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
                {questions.map((question) => {
                  const answered = Boolean(answers[String(question.questionNumber)]);
                  const current = question.questionNumber === currentQuestion?.questionNumber;
                  const flagged = flaggedQuestionSet.has(question.questionNumber);

                  return (
                    <Button
                      key={question.questionNumber}
                      size="sm"
                      variant={current ? "solid" : answered ? "outline" : "ghost"}
                      colorPalette={current ? "blue" : flagged ? "orange" : answered ? "green" : "gray"}
                      onClick={() => setActiveQuestionNumber(question.questionNumber)}
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
                    Attention
                  </Text>
                  <Badge colorPalette={getAttentionStateColor(attentionState)}>{getAttentionStateLabel(attentionState)}</Badge>
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
