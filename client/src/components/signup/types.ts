export type SignupRole = "student" | "lecturer" | "admin";

export interface SignupFormData {
  fullName: string;
  organization: string;
  email: string;
  role: SignupRole;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  aiConsent: boolean;
  faceCapture: string | null;
}
