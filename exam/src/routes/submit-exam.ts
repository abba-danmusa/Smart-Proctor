import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import {
  BadRequestError,
  NotAuthorizedError,
  NotFoundError,
  currentUser,
  requireAuth,
  validateRequest,
} from '@danmusa/medlink-common'

import { Exam } from '../models/Exam'
import { ExamAttempt } from '../models/ExamAttempt'
import { getExamLifecycleStatus } from '../services/exam-status'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.post(
  '/api/exams/:examId/submit',
  currentUser,
  requireAuth,
  [
    body('integrityScore')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('integrityScore must be between 0 and 100'),
    body('answers').optional().isObject().withMessage('answers must be an object'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const requester = getRequesterContext(req)

    if (requester.role !== 'student') {
      throw new NotAuthorizedError()
    }

    const exam = await Exam.findById(req.params.examId)

    if (!exam) {
      throw new NotFoundError()
    }

    if (requester.institution && requester.institution !== exam.institution) {
      throw new NotAuthorizedError()
    }

    const attempt = await ExamAttempt.findOne({
      examId: exam._id,
      studentId: requester.id,
    })

    if (!attempt) {
      throw new BadRequestError('No attempt found for this exam')
    }

    if (attempt.status === 'expired') {
      throw new BadRequestError('Attempt has expired and cannot be submitted')
    }

    if (attempt.status === 'submitted') {
      return res.status(200).send({
        attempt: {
          id: attempt.id,
          examId: attempt.examId.toString(),
          status: attempt.status,
          startedAt: attempt.startedAt.toISOString(),
          submittedAt: attempt.submittedAt?.toISOString(),
          submittedLate: attempt.submittedLate,
          integrityScore: attempt.integrityScore,
        },
      })
    }

    const now = new Date()

    attempt.status = 'submitted'
    attempt.submittedAt = now
    attempt.submittedLate = getExamLifecycleStatus(exam, now) === 'expired'

    if (typeof req.body.integrityScore === 'number') {
      attempt.integrityScore = req.body.integrityScore
    }

    if (req.body.answers && typeof req.body.answers === 'object' && !Array.isArray(req.body.answers)) {
      attempt.answers = req.body.answers as Record<string, unknown>
    }

    await attempt.save()

    res.status(200).send({
      attempt: {
        id: attempt.id,
        examId: attempt.examId.toString(),
        status: attempt.status,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString(),
        submittedLate: attempt.submittedLate,
        integrityScore: attempt.integrityScore,
      },
    })
  }
)

export { router as submitExamRouter }
