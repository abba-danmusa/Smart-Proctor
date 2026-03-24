import express, { Request, Response } from 'express'
import { Types } from 'mongoose'
import { BadRequestError, NotAuthorizedError, currentUser, requireAuth } from '@danmusa/medlink-common'

import { Exam } from '../models/Exam'
import { ProctoringEvent } from '../models/ProctoringEvent'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

function asPositiveInteger(value: unknown, fallbackValue: number, maxValue: number) {
  if (typeof value !== 'string') {
    return fallbackValue
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue
  }

  return Math.min(parsed, maxValue)
}

router.get('/api/exams/proctoring/events', currentUser, requireAuth, async (req: Request, res: Response) => {
  const requester = getRequesterContext(req)

  if (requester.role !== 'lecturer') {
    throw new NotAuthorizedError()
  }

  const filter: Record<string, unknown> = {
    lecturerId: requester.id,
  }

  if (requester.institution) {
    filter.institution = requester.institution
  }

  const examIdFromQuery = typeof req.query.examId === 'string' ? req.query.examId.trim() : undefined
  if (examIdFromQuery) {
    if (!Types.ObjectId.isValid(examIdFromQuery)) {
      throw new BadRequestError('examId must be a valid id')
    }

    filter.examId = new Types.ObjectId(examIdFromQuery)
  }

  const studentIdFromQuery = typeof req.query.studentId === 'string' ? req.query.studentId.trim() : undefined
  if (studentIdFromQuery) {
    filter.studentId = studentIdFromQuery
  }

  const limit = asPositiveInteger(req.query.limit, 300, 1000)
  const events = await ProctoringEvent.find(filter).sort({ detectedAt: -1 }).limit(limit)

  const examIds = [...new Set(events.map((event) => event.examId.toString()))]
  const exams = examIds.length
    ? await Exam.find({ _id: { $in: examIds.map((examId) => new Types.ObjectId(examId)) } }).select({
        _id: 1,
        title: 1,
        course: 1,
        courseCode: 1,
      })
    : []

  const examById = new Map(exams.map((exam) => [exam.id, exam]))

  res.status(200).send({
    events: events.map((event) => {
      const eventExam = examById.get(event.examId.toString())

      return {
        id: event.id,
        examId: event.examId.toString(),
        examTitle: eventExam?.title ?? 'Exam',
        examCourse: eventExam?.course ?? undefined,
        examCourseCode: eventExam?.courseCode ?? undefined,
        attemptId: event.attemptId?.toString(),
        studentId: event.studentId,
        studentEmail: event.studentEmail,
        studentFullName: event.studentFullName ?? undefined,
        eventType: event.eventType,
        severity: event.severity,
        message: event.message,
        evidence: event.evidence,
        detectedAt: event.detectedAt.toISOString(),
      }
    }),
  })
})

export { router as listProctoringEventsRouter }
