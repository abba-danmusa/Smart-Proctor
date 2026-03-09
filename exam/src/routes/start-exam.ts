import express, { Request, Response } from 'express'
import { BadRequestError, NotAuthorizedError, NotFoundError, currentUser, requireAuth } from '@danmusa/medlink-common'

import { Exam } from '../models/Exam'
import { ExamAttempt } from '../models/ExamAttempt'
import { getExamLifecycleStatus } from '../services/exam-status'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.post('/api/exams/:examId/start', currentUser, requireAuth, async (req: Request, res: Response) => {
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
    throw new BadRequestError('Exam is not active and cannot be started')
  }

  const existingAttempt = await ExamAttempt.findOne({
    examId: exam._id,
    studentId: requester.id,
  })

  if (existingAttempt) {
    if (existingAttempt.status === 'submitted') {
      throw new BadRequestError('Exam attempt was already submitted')
    }

    if (existingAttempt.status === 'expired') {
      throw new BadRequestError('Exam attempt has expired')
    }

    return res.status(200).send({
      attempt: {
        id: existingAttempt.id,
        examId: existingAttempt.examId.toString(),
        status: existingAttempt.status,
        startedAt: existingAttempt.startedAt.toISOString(),
      },
    })
  }

  const attempt = ExamAttempt.build({
    examId: exam._id,
    studentId: requester.id,
    studentEmail: requester.email,
    studentFullName: requester.fullName,
    status: 'in_progress',
    startedAt: new Date(),
  })

  await attempt.save()

  res.status(201).send({
    attempt: {
      id: attempt.id,
      examId: attempt.examId.toString(),
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
    },
  })
})

export { router as startExamRouter }
