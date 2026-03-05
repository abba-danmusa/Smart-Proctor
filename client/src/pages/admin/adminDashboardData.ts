import type { UserRole } from "../../lib/authSession";

export type AdminUserStatus = "active" | "suspended";
export type InstitutionStatus = "operational" | "degraded" | "maintenance";
export type AdminLogEventType = "authentication" | "user_management" | "exam_activity" | "system_configuration";

export interface AdminOverviewMetrics {
  totalUsers: number;
  activeExams: number;
  totalIncidents: number;
  systemHealth: number;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  role: UserRole;
  institution: string;
  status: AdminUserStatus;
}

export interface AdminInstitutionRecord {
  id: string;
  name: string;
  location: string;
  totalUsers: number;
  activeExams: number;
  status: InstitutionStatus;
}

export interface AdminSystemLogRecord {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  eventType: AdminLogEventType;
}

export interface AdminIncidentTrendRecord {
  id: string;
  label: string;
  incidents: number;
  resolved: number;
}

export interface AdminEventTypeMetric {
  id: string;
  eventType: string;
  count: number;
}

export type AdminSystemSettingKey =
  | "autoSuspendHighRiskUsers"
  | "requireTwoFactorForAdmins"
  | "allowInstitutionSelfService"
  | "maintenanceMode";

export type AdminSystemSettingsState = Record<AdminSystemSettingKey, boolean>;

export const adminOverviewMetrics: AdminOverviewMetrics = {
  totalUsers: 1284,
  activeExams: 18,
  totalIncidents: 93,
  systemHealth: 98,
};

export const adminUsers: AdminUserRecord[] = [
  {
    id: "admin-user-1",
    name: "Daniel Mensah",
    role: "admin",
    institution: "Lakeside University",
    status: "active",
  },
  {
    id: "admin-user-2",
    name: "Amina Bello",
    role: "lecturer",
    institution: "Crestline Polytechnic",
    status: "active",
  },
  {
    id: "admin-user-3",
    name: "Sarah Okeke",
    role: "student",
    institution: "Northbridge College",
    status: "active",
  },
  {
    id: "admin-user-4",
    name: "Victor Iyke",
    role: "student",
    institution: "Lakeside University",
    status: "suspended",
  },
  {
    id: "admin-user-5",
    name: "Ruth Balogun",
    role: "lecturer",
    institution: "Westland Institute of Technology",
    status: "active",
  },
  {
    id: "admin-user-6",
    name: "Paul Adebayo",
    role: "student",
    institution: "Crestline Polytechnic",
    status: "suspended",
  },
];

export const adminInstitutions: AdminInstitutionRecord[] = [
  {
    id: "institution-1",
    name: "Lakeside University",
    location: "Accra, Ghana",
    totalUsers: 448,
    activeExams: 6,
    status: "operational",
  },
  {
    id: "institution-2",
    name: "Crestline Polytechnic",
    location: "Kumasi, Ghana",
    totalUsers: 326,
    activeExams: 4,
    status: "operational",
  },
  {
    id: "institution-3",
    name: "Northbridge College",
    location: "Abidjan, Cote d'Ivoire",
    totalUsers: 275,
    activeExams: 5,
    status: "degraded",
  },
  {
    id: "institution-4",
    name: "Westland Institute of Technology",
    location: "Lagos, Nigeria",
    totalUsers: 235,
    activeExams: 3,
    status: "maintenance",
  },
];

export const adminSystemLogs: AdminSystemLogRecord[] = [
  {
    id: "log-1",
    user: "Daniel Mensah",
    action: "Activated lecturer account",
    timestamp: "March 5, 2026 • 11:18 AM",
    ipAddress: "41.223.144.19",
    eventType: "user_management",
  },
  {
    id: "log-2",
    user: "System Service",
    action: "Proctoring policy sync completed",
    timestamp: "March 5, 2026 • 10:54 AM",
    ipAddress: "10.0.0.18",
    eventType: "system_configuration",
  },
  {
    id: "log-3",
    user: "Amina Bello",
    action: "Started final exam session",
    timestamp: "March 5, 2026 • 10:12 AM",
    ipAddress: "154.118.21.220",
    eventType: "exam_activity",
  },
  {
    id: "log-4",
    user: "Sarah Okeke",
    action: "Signed in with face verification",
    timestamp: "March 5, 2026 • 09:43 AM",
    ipAddress: "102.130.88.11",
    eventType: "authentication",
  },
  {
    id: "log-5",
    user: "Ruth Balogun",
    action: "Updated exam rules",
    timestamp: "March 5, 2026 • 08:57 AM",
    ipAddress: "197.159.151.90",
    eventType: "exam_activity",
  },
  {
    id: "log-6",
    user: "Daniel Mensah",
    action: "Suspended student account",
    timestamp: "March 4, 2026 • 05:12 PM",
    ipAddress: "41.223.144.19",
    eventType: "user_management",
  },
];

export const adminIncidentTrend: AdminIncidentTrendRecord[] = [
  {
    id: "trend-1",
    label: "Mar 1",
    incidents: 11,
    resolved: 9,
  },
  {
    id: "trend-2",
    label: "Mar 2",
    incidents: 13,
    resolved: 11,
  },
  {
    id: "trend-3",
    label: "Mar 3",
    incidents: 14,
    resolved: 12,
  },
  {
    id: "trend-4",
    label: "Mar 4",
    incidents: 16,
    resolved: 13,
  },
  {
    id: "trend-5",
    label: "Mar 5",
    incidents: 12,
    resolved: 10,
  },
];

export const adminEventTypeMetrics: AdminEventTypeMetric[] = [
  {
    id: "event-metric-1",
    eventType: "Authentication",
    count: 142,
  },
  {
    id: "event-metric-2",
    eventType: "Exam Activity",
    count: 97,
  },
  {
    id: "event-metric-3",
    eventType: "User Management",
    count: 64,
  },
  {
    id: "event-metric-4",
    eventType: "System Configuration",
    count: 27,
  },
];

export const defaultAdminSystemSettings: AdminSystemSettingsState = {
  autoSuspendHighRiskUsers: true,
  requireTwoFactorForAdmins: true,
  allowInstitutionSelfService: false,
  maintenanceMode: false,
};

export const adminSystemSettingOptions: Array<{
  key: AdminSystemSettingKey;
  title: string;
  description: string;
}> = [
  {
    key: "autoSuspendHighRiskUsers",
    title: "Automatic high-risk suspension",
    description: "Suspend accounts that exceed suspicious-activity thresholds until manual review is complete.",
  },
  {
    key: "requireTwoFactorForAdmins",
    title: "Two-factor for admins",
    description: "Require an additional one-time passcode for all admin sign-in actions.",
  },
  {
    key: "allowInstitutionSelfService",
    title: "Institution self-service onboarding",
    description: "Allow approved institution managers to onboard lecturers without direct admin intervention.",
  },
  {
    key: "maintenanceMode",
    title: "Maintenance mode",
    description: "Temporarily disable new exam creation while infrastructure or policy updates are deployed.",
  },
];
