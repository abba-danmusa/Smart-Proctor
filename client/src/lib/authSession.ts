export type UserRole = "student" | "lecturer" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  studentId?: string;
  institution?: string;
  department?: string;
  level?: string;
  faceCapture?: string;
  faceVerifiedAt?: string;
}

const SESSION_USER_STORAGE_KEY = "smart-proctor.session.user";
const ROLE_VALUES: ReadonlySet<UserRole> = new Set(["student", "lecturer", "admin"]);

function hasStorageAccess() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readStoredUser(rawValue: string): SessionUser | null {
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const role = parsed.role;

    if (!role || typeof role !== "string" || !ROLE_VALUES.has(role as UserRole)) {
      return null;
    }

    const id = asString(parsed.id);
    const email = asString(parsed.email);
    const fullName = asString(parsed.fullName);

    if (!id || !email || !fullName) {
      return null;
    }

    return {
      id,
      email,
      fullName,
      role: role as UserRole,
      studentId: asString(parsed.studentId),
      institution: asString(parsed.institution),
      department: asString(parsed.department),
      level: asString(parsed.level),
      faceCapture: asString(parsed.faceCapture),
      faceVerifiedAt: asString(parsed.faceVerifiedAt),
    };
  } catch {
    return null;
  }
}

export function getSessionUser() {
  if (!hasStorageAccess()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(SESSION_USER_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  return readStoredUser(rawValue);
}

export function saveSessionUser(user: SessionUser) {
  if (!hasStorageAccess()) {
    return;
  }

  window.localStorage.setItem(SESSION_USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearSessionUser() {
  if (!hasStorageAccess()) {
    return;
  }

  window.localStorage.removeItem(SESSION_USER_STORAGE_KEY);
}

export function getDashboardPathForRole(role: UserRole) {
  if (role === "student") {
    return "/dashboard/student";
  }

  if (role === "lecturer") {
    return "/dashboard/lecturer";
  }

  return "/dashboard/admin";
}
