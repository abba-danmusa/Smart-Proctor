export type LecturerExamStatus = "scheduled" | "live" | "completed";
export type CameraStatus = "online" | "offline" | "unstable";
export type FaceStatus = "verified" | "not_detected" | "multiple_faces";
export type EventSeverity = "low" | "medium" | "high";

export interface LecturerOverviewMetrics {
  totalStudents: number;
  activeExams: number;
  suspiciousActivitiesLast7Days: number;
  examsCreated: number;
}

export interface LecturerExamRecord {
  id: string;
  title: string;
  course: string;
  durationMinutes: number;
  startDateLabel: string;
  endDateLabel: string;
  status: LecturerExamStatus;
  enrolledStudents: number;
  proctoring: {
    faceVerification: boolean;
    tabSwitchDetection: boolean;
    soundDetection: boolean;
    multipleFaceDetection: boolean;
  };
}

export interface LiveMonitoringScreenshot {
  id: string;
  capturedAt: string;
  reason: string;
}

export interface LiveMonitoringActivityLog {
  id: string;
  timestamp: string;
  event: string;
  severity: EventSeverity;
}

export interface LiveMonitoringRecord {
  id: string;
  studentName: string;
  examTitle: string;
  cameraStatus: CameraStatus;
  faceStatus: FaceStatus;
  suspiciousEventsCount: number;
  integrityScore: number;
  screenshots: LiveMonitoringScreenshot[];
  activityLogs: LiveMonitoringActivityLog[];
}

export interface FlaggedStudentMetric {
  id: string;
  studentName: string;
  flagCount: number;
  averageIntegrityScore: number;
}

export interface SuspiciousBreakdownMetric {
  id: string;
  label: string;
  count: number;
}

export interface LecturerStudentRecord {
  id: string;
  fullName: string;
  studentId: string;
  department: string;
  level: string;
  examsTaken: number;
  averageIntegrityScore: number;
  flagsThisMonth: number;
}

export const lecturerOverviewMetrics: LecturerOverviewMetrics = {
  totalStudents: 184,
  activeExams: 2,
  suspiciousActivitiesLast7Days: 27,
  examsCreated: 16,
};

export const lecturerExamRecords: LecturerExamRecord[] = [
  {
    id: "exam-csc441-midterm",
    title: "CSC 441 Midterm",
    course: "Artificial Intelligence",
    durationMinutes: 120,
    startDateLabel: "March 7, 2026 • 09:00 AM",
    endDateLabel: "March 7, 2026 • 11:00 AM",
    status: "scheduled",
    enrolledStudents: 64,
    proctoring: {
      faceVerification: true,
      tabSwitchDetection: true,
      soundDetection: true,
      multipleFaceDetection: true,
    },
  },
  {
    id: "exam-csc407-live",
    title: "CSC 407 Practical",
    course: "Operating Systems",
    durationMinutes: 90,
    startDateLabel: "March 5, 2026 • 10:00 AM",
    endDateLabel: "March 5, 2026 • 11:30 AM",
    status: "live",
    enrolledStudents: 52,
    proctoring: {
      faceVerification: true,
      tabSwitchDetection: true,
      soundDetection: true,
      multipleFaceDetection: true,
    },
  },
  {
    id: "exam-mth302-live",
    title: "MTH 302 Continuous Assessment",
    course: "Linear Algebra II",
    durationMinutes: 60,
    startDateLabel: "March 5, 2026 • 01:00 PM",
    endDateLabel: "March 5, 2026 • 02:00 PM",
    status: "live",
    enrolledStudents: 71,
    proctoring: {
      faceVerification: true,
      tabSwitchDetection: true,
      soundDetection: false,
      multipleFaceDetection: true,
    },
  },
  {
    id: "exam-csc399-final",
    title: "CSC 399 Final Exam",
    course: "Software Engineering",
    durationMinutes: 150,
    startDateLabel: "February 20, 2026 • 08:00 AM",
    endDateLabel: "February 20, 2026 • 10:30 AM",
    status: "completed",
    enrolledStudents: 78,
    proctoring: {
      faceVerification: true,
      tabSwitchDetection: true,
      soundDetection: true,
      multipleFaceDetection: true,
    },
  },
];

export const liveMonitoringRecords: LiveMonitoringRecord[] = [
  {
    id: "monitor-ngozie-chioma",
    studentName: "Ngozie Chioma",
    examTitle: "CSC 407 Practical",
    cameraStatus: "online",
    faceStatus: "verified",
    suspiciousEventsCount: 1,
    integrityScore: 97,
    screenshots: [
      { id: "shot-ngozie-1", capturedAt: "10:23 AM", reason: "Single tab switch detected." },
      { id: "shot-ngozie-2", capturedAt: "10:41 AM", reason: "Routine audit snapshot." },
    ],
    activityLogs: [
      { id: "log-ngozie-1", timestamp: "10:23 AM", event: "Tab switch detection", severity: "medium" },
      { id: "log-ngozie-2", timestamp: "10:41 AM", event: "Face verification check passed", severity: "low" },
    ],
  },
  {
    id: "monitor-john-adeleke",
    studentName: "John Adeleke",
    examTitle: "CSC 407 Practical",
    cameraStatus: "unstable",
    faceStatus: "not_detected",
    suspiciousEventsCount: 4,
    integrityScore: 74,
    screenshots: [
      { id: "shot-john-1", capturedAt: "10:11 AM", reason: "Face not detected for 8 seconds." },
      { id: "shot-john-2", capturedAt: "10:34 AM", reason: "Repeated window focus loss." },
      { id: "shot-john-3", capturedAt: "10:48 AM", reason: "Microphone anomaly detected." },
    ],
    activityLogs: [
      { id: "log-john-1", timestamp: "10:11 AM", event: "Face lost from camera frame", severity: "high" },
      { id: "log-john-2", timestamp: "10:34 AM", event: "Tab switch detection", severity: "medium" },
      { id: "log-john-3", timestamp: "10:48 AM", event: "Sound level spike over threshold", severity: "medium" },
      { id: "log-john-4", timestamp: "10:53 AM", event: "Face re-verified", severity: "low" },
    ],
  },
  {
    id: "monitor-adamu-sulaiman",
    studentName: "Adamu Sulaiman",
    examTitle: "MTH 302 Continuous Assessment",
    cameraStatus: "online",
    faceStatus: "multiple_faces",
    suspiciousEventsCount: 3,
    integrityScore: 79,
    screenshots: [
      { id: "shot-adamu-1", capturedAt: "01:15 PM", reason: "Multiple faces detected in frame." },
      { id: "shot-adamu-2", capturedAt: "01:19 PM", reason: "Multiple faces still present." },
    ],
    activityLogs: [
      { id: "log-adamu-1", timestamp: "01:15 PM", event: "Multiple face detection triggered", severity: "high" },
      { id: "log-adamu-2", timestamp: "01:16 PM", event: "Exam warning issued", severity: "medium" },
      { id: "log-adamu-3", timestamp: "01:19 PM", event: "Multiple face detection triggered", severity: "high" },
    ],
  },
  {
    id: "monitor-zainab-isa",
    studentName: "Zainab Isa",
    examTitle: "MTH 302 Continuous Assessment",
    cameraStatus: "online",
    faceStatus: "verified",
    suspiciousEventsCount: 0,
    integrityScore: 100,
    screenshots: [{ id: "shot-zainab-1", capturedAt: "01:20 PM", reason: "Routine audit snapshot." }],
    activityLogs: [{ id: "log-zainab-1", timestamp: "01:20 PM", event: "No suspicious activity", severity: "low" }],
  },
];

export const flaggedStudentMetrics: FlaggedStudentMetric[] = [
  { id: "flag-metric-1", studentName: "John Adeleke", flagCount: 12, averageIntegrityScore: 78 },
  { id: "flag-metric-2", studentName: "Adamu Sulaiman", flagCount: 9, averageIntegrityScore: 82 },
  { id: "flag-metric-3", studentName: "Grace Ugo", flagCount: 7, averageIntegrityScore: 84 },
  { id: "flag-metric-4", studentName: "Bashir Yusuf", flagCount: 6, averageIntegrityScore: 86 },
];

export const suspiciousBreakdownMetrics: SuspiciousBreakdownMetric[] = [
  { id: "breakdown-tab-switch", label: "Tab switch detection", count: 41 },
  { id: "breakdown-face-missing", label: "Face not detected", count: 28 },
  { id: "breakdown-multi-face", label: "Multiple face detection", count: 23 },
  { id: "breakdown-sound", label: "Sound anomalies", count: 19 },
];

export const lecturerAverageIntegrityScore = 88;

export const lecturerStudents: LecturerStudentRecord[] = [
  {
    id: "student-john-adeleke",
    fullName: "John Adeleke",
    studentId: "STU-22014",
    department: "Computer Science",
    level: "400",
    examsTaken: 6,
    averageIntegrityScore: 78,
    flagsThisMonth: 5,
  },
  {
    id: "student-zainab-isa",
    fullName: "Zainab Isa",
    studentId: "STU-22081",
    department: "Mathematics",
    level: "300",
    examsTaken: 5,
    averageIntegrityScore: 97,
    flagsThisMonth: 0,
  },
  {
    id: "student-ngozie-chioma",
    fullName: "Ngozie Chioma",
    studentId: "STU-22019",
    department: "Computer Science",
    level: "400",
    examsTaken: 7,
    averageIntegrityScore: 94,
    flagsThisMonth: 1,
  },
  {
    id: "student-adamu-sulaiman",
    fullName: "Adamu Sulaiman",
    studentId: "STU-22077",
    department: "Mathematics",
    level: "300",
    examsTaken: 4,
    averageIntegrityScore: 82,
    flagsThisMonth: 3,
  },
  {
    id: "student-grace-ugo",
    fullName: "Grace Ugo",
    studentId: "STU-22046",
    department: "Computer Science",
    level: "300",
    examsTaken: 5,
    averageIntegrityScore: 84,
    flagsThisMonth: 2,
  },
];
