import express, { Request, Response } from 'express'
import { BadRequestError, NotAuthorizedError, NotFoundError, currentUser, requireAuth } from '@danmusa/medlink-common'

import { Exam } from '../models/Exam'
import { ExamAttempt } from '../models/ExamAttempt'
import { getExamLifecycleStatus } from '../services/exam-status'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.get('/api/exams/:examId/session', currentUser, requireAuth, async (req: Request, res: Response) => {
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

  const lifecycleStatus = getExamLifecycleStatus(exam)
  if (lifecycleStatus === 'scheduled') {
    throw new BadRequestError('Exam has not started yet')
  }

  if (lifecycleStatus === 'expired') {
    throw new BadRequestError('Exam has expired')
  }

  const attempt = await ExamAttempt.findOne({
    examId: exam._id,
    studentId: requester.id,
  })

  if (!attempt) {
    throw new BadRequestError('No attempt found for this exam. Start the exam first.')
  }

  if (attempt.status !== 'in_progress') {
    throw new BadRequestError('Exam attempt is not in progress')
  }

  res.status(200).send({
    session: {
      exam: {
        id: exam.id,
        title: exam.title,
        course: exam.course,
        courseCode: exam.courseCode ?? undefined,
        durationMinutes: exam.durationMinutes,
        startAt: exam.startAt.toISOString(),
        endAt: exam.endAt.toISOString(),
        instructions: exam.instructions ?? undefined,
        proctoring: exam.proctoring,
      },
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt.toISOString(),
      },
      questions: exam.questions
        .slice()
        .sort((first, second) => first.questionNumber - second.questionNumber)
        .map((question) => ({
          questionNumber: question.questionNumber,
          topic: question.topic,
          difficulty: question.difficulty,
          prompt: question.prompt,
          options: question.options,
        })),
      serverTime: new Date().toISOString(),
    },
  })
})

export { router as getExamSessionRouter }
