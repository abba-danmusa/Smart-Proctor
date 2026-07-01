import express, { Request, Response } from 'express'
import { Types } from 'mongoose'
import { BadRequestError, NotFoundError, currentUser, requireAuth } from '@danmusa/medlink-common'

import { ExamAttempt } from '../models/ExamAttempt'
import { findExamForLecturerAccess } from '../services/exam-access'
import { buildAttemptQuestionReview, serializeAttemptGrading } from '../services/grading'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.get('/api/exams/:examId/submissions/:attemptId', currentUser, requireAuth, async (req: Request, res: Response) => {
  const requester = getRequesterContext(req)
  const examId = typeof req.params.examId === 'string' ? req.params.examId : req.params.examId?.[0] ?? ''
  const rawAttemptId = typeof req.params.attemptId === 'string' ? req.params.attemptId : req.params.attemptId?.[0] ?? ''
  const exam = await findExamForLecturerAccess(examId, requester)
  const attemptId = rawAttemptId.trim()

  if (!Types.ObjectId.isValid(attemptId)) {
    throw new BadRequestError('attemptId must be a valid id')
  }

  const attempt = await ExamAttempt.findOne({
    _id: new Types.ObjectId(attemptId),
    examId: exam._id,
    status: 'submitted',
  })

  if (!attempt) {
    throw new NotFoundError()
  }

  const review = buildAttemptQuestionReview(exam.questions, attempt.answers)

  res.status(200).send({
    exam: {
      id: exam.id,
      title: exam.title,
      course: exam.course,
      courseCode: exam.courseCode ?? undefined,
      questionCount: exam.questions.length,
    },
    submission: {
      attemptId: attempt.id,
      studentId: attempt.studentId,
      studentEmail: attempt.studentEmail,
      studentFullName: attempt.studentFullName ?? undefined,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString(),
      submittedLate: attempt.submittedLate,
      integrityScore: attempt.integrityScore,
      grading: serializeAttemptGrading(attempt.grading),
      review,
    },
  })
})

export { router as getExamSubmissionRouter }
