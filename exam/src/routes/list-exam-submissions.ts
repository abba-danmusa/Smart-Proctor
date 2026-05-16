import express, { Request, Response } from 'express'
import { currentUser, requireAuth } from '@danmusa/medlink-common'

import { ExamAttempt } from '../models/ExamAttempt'
import { findExamForLecturerAccess } from '../services/exam-access'
import { serializeAttemptGrading } from '../services/grading'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.get('/api/exams/:examId/submissions', currentUser, requireAuth, async (req: Request, res: Response) => {
  const requester = getRequesterContext(req)
  const examId = typeof req.params.examId === 'string' ? req.params.examId : req.params.examId?.[0] ?? ''
  const exam = await findExamForLecturerAccess(examId, requester)

  const attempts = await ExamAttempt.find({
    examId: exam._id,
    status: 'submitted',
  }).sort({ submittedAt: -1 })

  res.status(200).send({
    exam: {
      id: exam.id,
      title: exam.title,
      course: exam.course,
      courseCode: exam.courseCode ?? undefined,
      questionCount: exam.questions.length,
    },
    submissions: attempts.map((attempt) => ({
      attemptId: attempt.id,
      studentId: attempt.studentId,
      studentEmail: attempt.studentEmail,
      studentFullName: attempt.studentFullName ?? undefined,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString(),
      submittedLate: attempt.submittedLate,
      integrityScore: attempt.integrityScore,
      grading: serializeAttemptGrading(attempt.grading),
    })),
  })
})

export { router as listExamSubmissionsRouter }
