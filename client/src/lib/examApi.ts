import type { SessionUser } from './authSession'

export type ExamLifecycleStatus = 'scheduled' | 'live' | 'expired'
export type StudentExamStatus = 'upcoming' | 'active' | 'completed' | 'expired'
export type ExamAttemptStatus = 'in_progress' | 'submitted' | 'expired'
export type CourseType = 'core' | 'elective'
export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface ExamProctoringSettings {
  faceVerification: boolean
  tabSwitchDetection: boolean
  soundDetection: boolean
  multipleFaceDetection: boolean
}

export interface GeneratedQuestionRecord {
  questionNumber: number
  topic: string
  difficulty: QuestionDifficulty
  prompt: string
  options: string[]
  answer: string
  explanation: string
}

export interface CourseRecord {
  id: string
  code: string
  title: string
  type: CourseType
  description?: string
  department?: string
  level?: string
  institution: string
  createdBy: {
    id: string
    email: string
    fullName: string
  }
  isRegistered?: boolean
  registeredAt?: string
}

export interface CourseRegistrationRecord {
  id: string
  courseId: string
  studentId: string
  studentEmail: string
  studentFullName: string
  institution: string
  registeredAt?: string
}

export interface ExamRecord {
  id: string
  title: string
  course: string
  courseId?: string
  courseCode?: string
  courseType?: CourseType
  durationMinutes: number
  startAt: string
  endAt: string
  instructions?: string
  questionCount?: number
  questions?: GeneratedQuestionRecord[]
  institution: string
  status: ExamLifecycleStatus
  proctoring: ExamProctoringSettings
  createdBy: {
    id: string
    email: string
    fullName: string
  }
  studentStatus?: StudentExamStatus
  attemptId?: string
  attemptStatus?: ExamAttemptStatus
  attemptCount?: number
  submittedAttemptCount?: number
}

export interface ExamAttemptRecord {
  id: string
  examId: string
  status: ExamAttemptStatus
  startedAt: string
  submittedAt?: string
  submittedLate?: boolean
  integrityScore?: number
}

export interface ExamSessionQuestionRecord {
  questionNumber: number
  topic: string
  difficulty: QuestionDifficulty
  prompt: string
  options: string[]
}

export interface StudentExamSessionRecord {
  exam: {
    id: string
    title: string
    course: string
    courseCode?: string
    durationMinutes: number
    startAt: string
    endAt: string
    instructions?: string
    proctoring: ExamProctoringSettings
  }
  attempt: {
    id: string
    status: ExamAttemptStatus
    startedAt: string
  }
  questions: ExamSessionQuestionRecord[]
  serverTime: string
}

export type ProctoringEventSeverity = 'low' | 'medium' | 'high'

export interface ProctoringEventInput {
  eventType: string
  severity?: ProctoringEventSeverity
  message: string
  evidence?: Record<string, unknown>
  detectedAt?: string
}

export interface ProctoringEventRecord {
  id: string
  examId: string
  examTitle?: string
  examCourse?: string
  examCourseCode?: string
  attemptId?: string
  studentId: string
  studentEmail: string
  studentFullName?: string
  eventType: string
  severity: ProctoringEventSeverity
  message: string
  evidence?: Record<string, unknown>
  detectedAt: string
}

export interface CreateCourseInput {
  code: string
  title: string
  type: CourseType
  description?: string
  department?: string
  level?: string
}

export interface GenerateQuestionsInput {
  courseId?: string
  courseCode?: string
  courseTitle?: string
  courseType?: CourseType
  examTitle: string
  instructions: string
  numberOfQuestions: number
  difficulty: QuestionDifficulty
  topics: string[]
}

export interface QuestionGenerationResult {
  course: {
    id?: string
    code: string
    title: string
    type?: CourseType
    institution?: string
  }
  examTitle: string
  instructions: string
  numberOfQuestions: number
  difficulty: QuestionDifficulty
  topics: string[]
  questions: GeneratedQuestionRecord[]
}

export interface CreateExamInput {
  title: string
  course?: string
  courseId?: string
  courseCode?: string
  courseType?: CourseType
  durationMinutes: number
  startAt: string
  endAt: string
  instructions?: string
  proctoring: ExamProctoringSettings
  questions?: GeneratedQuestionRecord[]
  questionGeneration?: {
    numberOfQuestions: number
    difficulty: QuestionDifficulty
    topics: string[]
  }
}

const EXAM_API_BASE = (() => {
  const baseUrl = (import.meta.env.VITE_EXAM_API_BASE_URL ?? '').trim()
  if (!baseUrl) {
    return '/api/exams'
  }

  return `${baseUrl.replace(/\/+$/, '')}/api/exams`
})()

function buildExamApiUrl(path = '') {
  if (!path) {
    return EXAM_API_BASE
  }

  if (path.startsWith('/')) {
    return `${EXAM_API_BASE}${path}`
  }

  return `${EXAM_API_BASE}/${path}`
}

function buildExamApiHeaders(user: SessionUser) {
  const headers: Record<string, string> = {
    'x-user-role': user.role,
  }

  if (user.institution) {
    headers['x-user-institution'] = user.institution
  }

  if (user.fullName) {
    headers['x-user-full-name'] = user.fullName
  }

  return headers
}

async function parseApiErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const body = (await response.json()) as {
      message?: string
      errors?: Array<{ message?: string }>
    }

    if (Array.isArray(body.errors) && body.errors.length > 0) {
      const message = body.errors.find((error) => typeof error?.message === 'string')?.message
      if (message) {
        return message
      }
    }

    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message
    }
  } catch {
    // Fall back to generic message when response body cannot be parsed.
  }

  return fallbackMessage
}

export async function createCourse(input: CreateCourseInput, user: SessionUser) {
  const response = await fetch(buildExamApiUrl('courses'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...buildExamApiHeaders(user),
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to create course. Please try again.'))
  }

  const body = (await response.json()) as { course: CourseRecord }
  return body.course
}

export async function fetchCourses(user: SessionUser) {
  const response = await fetch(buildExamApiUrl('courses'), {
    method: 'GET',
    credentials: 'include',
    headers: buildExamApiHeaders(user),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to load courses right now.'))
  }

  const body = (await response.json()) as { courses: CourseRecord[] }
  return body.courses
}

export async function registerForCourse(courseId: string, user: SessionUser) {
  const response = await fetch(buildExamApiUrl(`courses/${courseId}/register`), {
    method: 'POST',
    credentials: 'include',
    headers: buildExamApiHeaders(user),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to register for this course right now.'))
  }

  const body = (await response.json()) as { registration: CourseRegistrationRecord }
  return body.registration
}

export async function generateExamQuestions(input: GenerateQuestionsInput, user: SessionUser) {
  const response = await fetch(buildExamApiUrl('questions/generate'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...buildExamApiHeaders(user),
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to generate questions. Please try again.'))
  }

  const body = (await response.json()) as { generation: QuestionGenerationResult }
  return body.generation
}

export async function createExam(input: CreateExamInput, user: SessionUser) {
  const response = await fetch(buildExamApiUrl(), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...buildExamApiHeaders(user),
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to create exam. Please try again.'))
  }

  const body = (await response.json()) as { exam: ExamRecord }
  return body.exam
}

export async function fetchExams(user: SessionUser) {
  const response = await fetch(buildExamApiUrl(), {
    method: 'GET',
    credentials: 'include',
    headers: buildExamApiHeaders(user),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to load exams right now.'))
  }

  const body = (await response.json()) as { exams: ExamRecord[] }
  return body.exams
}

export async function startExamAttempt(examId: string, user: SessionUser) {
  const response = await fetch(buildExamApiUrl(`${examId}/start`), {
    method: 'POST',
    credentials: 'include',
    headers: buildExamApiHeaders(user),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to start this exam.'))
  }

  const body = (await response.json()) as { attempt: ExamAttemptRecord }
  return body.attempt
}

export async function submitExamAttempt(
  examId: string,
  user: SessionUser,
  payload?: {
    integrityScore?: number
    answers?: Record<string, unknown>
  }
) {
  const response = await fetch(buildExamApiUrl(`${examId}/submit`), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...buildExamApiHeaders(user),
    },
    body: JSON.stringify(payload ?? {}),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to submit this exam.'))
  }

  const body = (await response.json()) as { attempt: ExamAttemptRecord }
  return body.attempt
}

export async function fetchStudentExamSession(examId: string, user: SessionUser) {
  const response = await fetch(buildExamApiUrl(`${examId}/session`), {
    method: 'GET',
    credentials: 'include',
    headers: buildExamApiHeaders(user),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to load this exam session right now.'))
  }

  const body = (await response.json()) as { session: StudentExamSessionRecord }
  return body.session
}

export async function reportExamProctoringEvent(examId: string, user: SessionUser, payload: ProctoringEventInput) {
  const response = await fetch(buildExamApiUrl(`${examId}/proctoring/events`), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...buildExamApiHeaders(user),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to report this proctoring event.'))
  }

  const body = (await response.json()) as { event: ProctoringEventRecord }
  return body.event
}

export async function fetchLecturerProctoringEvents(
  user: SessionUser,
  query?: {
    examId?: string
    studentId?: string
    limit?: number
  }
) {
  const searchParams = new URLSearchParams()

  if (query?.examId) {
    searchParams.set('examId', query.examId)
  }

  if (query?.studentId) {
    searchParams.set('studentId', query.studentId)
  }

  if (typeof query?.limit === 'number' && Number.isFinite(query.limit) && query.limit > 0) {
    searchParams.set('limit', String(Math.floor(query.limit)))
  }

  const queryString = searchParams.toString()
  const path = queryString ? `proctoring/events?${queryString}` : 'proctoring/events'

  const response = await fetch(buildExamApiUrl(path), {
    method: 'GET',
    credentials: 'include',
    headers: buildExamApiHeaders(user),
  })

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, 'Unable to load proctoring events right now.'))
  }

  const body = (await response.json()) as { events: ProctoringEventRecord[] }
  return body.events
}
