export type StudentExamStatus = "upcoming" | "active" | "completed";

export interface StudentExamRecord {
  id: string;
  title: string;
  course: string;
  dateLabel: string;
  status: StudentExamStatus;
}

export interface StudentResultRecord {
  id: string;
  examName: string;
  score: number;
  status: "Passed" | "Failed";
  integrityScore: number;
}

export const studentExamRecords: StudentExamRecord[] = [
  {
    id: "exam-csc401-midterm",
    title: "CSC 401 Midterm",
    course: "Distributed Systems",
    dateLabel: "March 6, 2026 • 09:00 AM",
    status: "upcoming",
  },
  {
    id: "exam-csc423-quiz",
    title: "CSC 423 Quiz",
    course: "Machine Learning",
    dateLabel: "March 4, 2026 • 03:30 PM",
    status: "active",
  },
  {
    id: "exam-csc389-final",
    title: "CSC 389 Final",
    course: "Database Systems",
    dateLabel: "February 26, 2026 • 11:00 AM",
    status: "completed",
  },
  {
    id: "exam-mth312-assessment",
    title: "MTH 312 Assessment",
    course: "Probability Theory",
    dateLabel: "February 21, 2026 • 01:00 PM",
    status: "completed",
  },
];

export const studentResultRecords: StudentResultRecord[] = [
  {
    id: "result-csc389-final",
    examName: "CSC 389 Final",
    score: 84,
    status: "Passed",
    integrityScore: 92,
  },
  {
    id: "result-mth312-assessment",
    examName: "MTH 312 Assessment",
    score: 71,
    status: "Passed",
    integrityScore: 96,
  },
  {
    id: "result-csc350-test",
    examName: "CSC 350 Test",
    score: 48,
    status: "Failed",
    integrityScore: 89,
  },
];
