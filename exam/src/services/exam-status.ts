import type { ExamDocument } from '../models/Exam'
import type { ExamAttemptStatus } from '../models/ExamAttempt'

export type ExamLifecycleStatus = 'scheduled' | 'live' | 'expired'
export type StudentExamStatus = 'upcoming' | 'active' | 'completed' | 'expired'

export function getExamLifecycleStatus(
  exam: Pick<ExamDocument, 'startAt' | 'endAt' | 'forceExpiredAt'>,
  now: Date = new Date()
): ExamLifecycleStatus {
  if (exam.forceExpiredAt) {
    return 'expired'
  }

  if (now < exam.startAt) {
    return 'scheduled'
  }

  if (now > exam.endAt) {
    return 'expired'
  }

  return 'live'
}

export function getStudentExamStatus(
  lifecycleStatus: ExamLifecycleStatus,
  attemptStatus?: ExamAttemptStatus | null
): StudentExamStatus {
  if (attemptStatus === 'submitted') {
    return 'completed'
  }

  if (lifecycleStatus === 'live') {
    return 'active'
  }

  if (lifecycleStatus === 'scheduled') {
    return 'upcoming'
  }

  return 'expired'
}
