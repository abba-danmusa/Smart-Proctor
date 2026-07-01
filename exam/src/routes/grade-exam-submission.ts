import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { Types } from 'mongoose'
import {
  BadRequestError,
  NotFoundError,
  currentUser,
  requireAuth,
  validateRequest,
} from '@danmusa/medlink-common'

import { ExamAttempt } from '../models/ExamAttempt'
import { findExamForLecturerAccess } from '../services/exam-access'
import { buildAutomaticGrading, serializeAttemptGrading } from '../services/grading'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.put(
  '/api/exams/:examId/submissions/:attemptId/grade',
  currentUser,
  requireAuth,
  [
    body('score').isInt({ min: 0, max: 100 }).withMessage('score must be between 0 and 100'),
    body('feedback')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 3, max: 1500 })
      .withMessage('feedback must be between 3 and 1500 characters'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
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

    const reviewedAt = new Date()
    const automaticGrading = buildAutomaticGrading(exam.questions, attempt.answers, reviewedAt)
    const score = Number(req.body.score)

    attempt.grading = {
      status: 'manually_graded',
      method: 'manual',
      autoScore: automaticGrading.grading.autoScore,
      manualScore: score,
      finalScore: score,
      correctAnswers: automaticGrading.grading.correctAnswers,
      totalQuestions: automaticGrading.grading.totalQuestions,
      feedback: typeof req.body.feedback === 'string' ? req.body.feedback.trim() : undefined,
      gradedAt: reviewedAt,
      gradedBy: {
        id: requester.id,
        email: requester.email,
        fullName: requester.fullName ?? requester.email,
      },
    }

    await attempt.save()

    res.status(200).send({
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
      },
    })
  }
)

export { router as gradeExamSubmissionRouter }
