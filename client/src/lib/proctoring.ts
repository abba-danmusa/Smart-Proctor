import type { ProctoringEventSeverity } from "./examApi";

export interface ProctoringEventLike {
  eventType: string;
  severity?: ProctoringEventSeverity;
}

export function getProctoringEventLabel(eventType: string) {
  const normalized = eventType.trim().toLowerCase();

  if (normalized === "multiple_faces_detected") return "Multiple Faces Detected";
  if (normalized === "face_not_detected") return "Face Missing";
  if (normalized === "attention_drift_detected") return "Attention Drift";
  if (normalized === "foreign_material_suspected") return "Foreign Material Suspected";
  if (normalized === "prolonged_speech_detected") return "Prolonged Speech Detected";
  if (normalized === "speech_detected") return "Speech Detected";
  if (normalized === "noise_detected") return "Background Noise Detected";
  if (normalized === "camera_offline") return "Camera Offline";
  if (normalized === "device_access_blocked") return "Device Access Blocked";
  if (normalized === "tab_switch") return "Tab Switch";
  if (normalized === "window_blur") return "Window Blur";
  if (normalized === "fullscreen_exit") return "Fullscreen Exit";
  if (normalized === "fullscreen_not_enabled") return "Fullscreen Not Enabled";

  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getProctoringBreakdownLabel(eventType: string) {
  const normalized = eventType.trim().toLowerCase();

  if (normalized.includes("multiple_faces") || normalized.includes("face_not_detected")) {
    return "Identity and face presence";
  }

  if (normalized.includes("attention_drift") || normalized.includes("eye") || normalized.includes("head_turn")) {
    return "Attention drift";
  }

  if (normalized.includes("foreign_material")) {
    return "Foreign material suspicion";
  }

  if (normalized.includes("speech") || normalized.includes("noise") || normalized.includes("microphone")) {
    return "Speech and audio anomalies";
  }

  if (normalized.includes("tab_switch") || normalized.includes("window_blur") || normalized.includes("fullscreen")) {
    return "Focus and fullscreen violations";
  }

  if (normalized.includes("clipboard") || normalized.includes("shortcut") || normalized.includes("context_menu")) {
    return "Restricted action attempts";
  }

  if (normalized.includes("camera") || normalized.includes("device_access_blocked")) {
    return "Camera and device interruptions";
  }

  if (normalized.includes("network_offline")) {
    return "Connectivity anomalies";
  }

  return getProctoringEventLabel(eventType);
}

export function getProctoringPenalty(eventType: string, severity: ProctoringEventSeverity = "medium") {
  const normalized = eventType.trim().toLowerCase();
  const basePenalty = severity === "high" ? 10 : severity === "medium" ? 5 : 2;

  if (normalized.includes("multiple_faces")) return Math.max(basePenalty, 16);
  if (normalized.includes("face_not_detected")) return Math.max(basePenalty, 12);
  if (normalized.includes("foreign_material")) return Math.max(basePenalty, 12);
  if (normalized.includes("attention_drift") || normalized.includes("eye") || normalized.includes("head_turn")) {
    return Math.max(basePenalty, 8);
  }
  if (normalized.includes("prolonged_speech")) return Math.max(basePenalty, 10);
  if (normalized.includes("speech_detected")) return Math.max(basePenalty, 7);
  if (normalized.includes("noise_detected")) return Math.max(basePenalty, 3);
  if (normalized.includes("device_access_blocked")) return Math.max(basePenalty, 15);
  if (normalized.includes("camera_offline")) return Math.max(basePenalty, 12);
  if (normalized.includes("fullscreen_exit") || normalized.includes("fullscreen_not_enabled")) return Math.max(basePenalty, 9);
  if (normalized.includes("tab_switch") || normalized.includes("window_blur")) return Math.max(basePenalty, 6);
  if (normalized.includes("clipboard") || normalized.includes("shortcut") || normalized.includes("context_menu")) {
    return Math.max(basePenalty, 5);
  }
  if (normalized.includes("network_offline")) return Math.max(basePenalty, 4);

  return basePenalty;
}

export function calculateViolationScore(events: ProctoringEventLike[]) {
  return Math.min(
    100,
    Math.round(
      events.reduce((total, event) => total + getProctoringPenalty(event.eventType, event.severity ?? "medium"), 0),
    ),
  );
}

export function calculateIntegrityScore(events: ProctoringEventLike[]) {
  return Math.max(0, 100 - calculateViolationScore(events));
}

export function getReviewRecommendation(violationScore: number) {
  if (violationScore >= 60) {
    return "Critical review";
  }

  if (violationScore >= 30) {
    return "Manual review";
  }

  return "Low risk";
}

export function getReviewColor(violationScore: number) {
  if (violationScore >= 60) return "red";
  if (violationScore >= 30) return "orange";
  return "green";
}
