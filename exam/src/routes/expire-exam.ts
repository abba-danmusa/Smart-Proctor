import express, { Request, Response } from 'express'
import { NotAuthorizedError, NotFoundError, currentUser, requireAuth } from '@danmusa/medlink-common'

import { Exam } from '../models/Exam'
import { ExamAttempt } from '../models/ExamAttempt'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.post('/api/exams/:examId/expire', currentUser, requireAuth, async (req: Request, res: Response) => {
  const requester = getRequesterContext(req)

  if (!['lecturer', 'admin'].includes(requester.role)) {
    throw new NotAuthorizedError()
  }

  const exam = await Exam.findById(req.params.examId)

  if (!exam) {
    throw new NotFoundError()
  }

  if (requester.role === 'lecturer' && exam.createdBy.id !== requester.id) {
    throw new NotAuthorizedError()
  }

  const now = new Date()
  exam.forceExpiredAt = now
  await exam.save()

  await ExamAttempt.updateMany(
    {
      examId: exam._id,
      status: 'in_progress',
    },
    {
      $set: {
        status: 'expired',
      },
    }
  )

  res.status(200).send({
    exam: {
      id: exam.id,
      title: exam.title,
      status: 'expired',
      forceExpiredAt: exam.forceExpiredAt?.toISOString(),
    },
  })
})

export { router as expireExamRouter }
