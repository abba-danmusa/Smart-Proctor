import express, { Request, Response } from 'express'
import { Types } from 'mongoose'
import { BadRequestError, NotAuthorizedError, currentUser, requireAuth } from '@danmusa/medlink-common'

import { Exam } from '../models/Exam'
import { ExamAttempt } from '../models/ExamAttempt'
import { getResultStatus, serializeAttemptGrading } from '../services/grading'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.get('/api/exams/results', currentUser, requireAuth, async (req: Request, res: Response) => {
  const requester = getRequesterContext(req)

  if (requester.role !== 'student') {
    throw new NotAuthorizedError()
  }

  if (!requester.institution) {
    throw new BadRequestError('Student institution is required to fetch results')
  }

  const attempts = await ExamAttempt.find({
    studentId: requester.id,
    status: 'submitted',
  }).sort({ submittedAt: -1 })

  const examIds = [...new Set(attempts.map((attempt) => attempt.examId.toString()))]
  const exams = examIds.length
    ? await Exam.find({
        _id: { $in: examIds.map((examId) => new Types.ObjectId(examId)) },
        institution: requester.institution,
      }).select({
        _id: 1,
        title: 1,
        course: 1,
        courseCode: 1,
      })
    : []

  const examById = new Map(exams.map((exam) => [exam.id, exam]))

  const results = attempts
    .map((attempt) => {
      const exam = examById.get(attempt.examId.toString())
      if (!exam) {
        return null
      }

      const finalScore = attempt.grading?.finalScore

      return {
        attemptId: attempt.id,
        examId: attempt.examId.toString(),
        examTitle: exam.title,
        course: exam.course,
        courseCode: exam.courseCode ?? undefined,
        submittedAt: attempt.submittedAt?.toISOString(),
        submittedLate: attempt.submittedLate,
        integrityScore: attempt.integrityScore,
        grading: serializeAttemptGrading(attempt.grading),
        resultStatus: getResultStatus(finalScore),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  res.status(200).send({ results })
})

export { router as listStudentResultsRouter }
