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
import { ProctoringEvent } from '../models/ProctoringEvent'
import { getExamLifecycleStatus } from '../services/exam-status'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.post(
  '/api/exams/:examId/proctoring/events',
  currentUser,
  requireAuth,
  [
    body('eventType').trim().isLength({ min: 2, max: 80 }).withMessage('eventType must be between 2 and 80 characters'),
    body('severity')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('severity must be one of low, medium, high'),
    body('message').trim().isLength({ min: 3, max: 500 }).withMessage('message must be between 3 and 500 characters'),
    body('detectedAt').optional().isISO8601().withMessage('detectedAt must be a valid ISO8601 date'),
    body('evidence')
      .optional()
      .custom((value) => value !== null && typeof value === 'object' && !Array.isArray(value))
      .withMessage('evidence must be an object'),
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

    const examStatus = getExamLifecycleStatus(exam)
    if (examStatus !== 'live') {
      throw new BadRequestError('Proctoring events can only be reported while the exam is live')
    }

    const attempt = await ExamAttempt.findOne({
      examId: exam._id,
      studentId: requester.id,
    })

    if (!attempt) {
      throw new BadRequestError('No attempt found for this exam')
    }

    if (attempt.status !== 'in_progress') {
      throw new BadRequestError('Attempt is not active')
    }

    const detectedAt = req.body.detectedAt ? new Date(req.body.detectedAt) : new Date()

    const event = ProctoringEvent.build({
      examId: exam._id,
      attemptId: attempt._id,
      lecturerId: exam.createdBy.id,
      institution: exam.institution,
      studentId: requester.id,
      studentEmail: requester.email,
      studentFullName: requester.fullName,
      eventType: String(req.body.eventType).trim().toLowerCase(),
      severity: (req.body.severity as 'low' | 'medium' | 'high' | undefined) ?? 'medium',
      message: String(req.body.message).trim(),
      evidence:
        req.body.evidence && typeof req.body.evidence === 'object' && !Array.isArray(req.body.evidence)
          ? (req.body.evidence as Record<string, unknown>)
          : undefined,
      detectedAt,
    })

    await event.save()

    res.status(201).send({
      event: {
        id: event.id,
        examId: event.examId.toString(),
        attemptId: event.attemptId?.toString(),
        eventType: event.eventType,
        severity: event.severity,
        message: event.message,
        evidence: event.evidence,
        detectedAt: event.detectedAt.toISOString(),
      },
    })
  }
)

export { router as reportProctoringEventRouter }
