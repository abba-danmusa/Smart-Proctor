import express, { Request, Response } from 'express'
import { Types } from 'mongoose'
import { BadRequestError, currentUser, requireAuth } from '@danmusa/medlink-common'

import { Course } from '../models/Course'
import { CourseRegistration } from '../models/CourseRegistration'
import { Exam } from '../models/Exam'
import { ExamAttempt, type ExamAttemptDocument } from '../models/ExamAttempt'
import { getExamLifecycleStatus, getStudentExamStatus } from '../services/exam-status'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.get('/api/exams', currentUser, requireAuth, async (req: Request, res: Response) => {
  const requester = getRequesterContext(req)

  const query: Record<string, unknown> = {}
  let registeredCourseIds: Types.ObjectId[] = []
  let registeredCourseCodes: string[] = []
  let registeredCourseTitles: string[] = []

  if (requester.role === 'lecturer') {
    query['createdBy.id'] = requester.id
  }

  if (requester.role === 'student') {
    if (!requester.institution) {
      throw new BadRequestError('Student institution is required to fetch exams')
    }

    query.institution = requester.institution

    const registrations = await CourseRegistration.find({
      studentId: requester.id,
      institution: requester.institution,
    }).select({ courseId: 1 })

    if (registrations.length === 0) {
      return res.status(200).send({ exams: [] })
    }

    registeredCourseIds = registrations.map((registration) => registration.courseId)

    const registeredCourses = await Course.find({
      _id: { $in: registeredCourseIds },
      institution: requester.institution,
    }).select({ code: 1, title: 1 })

    registeredCourseCodes = [...new Set(registeredCourses.map((course) => course.code))]
    registeredCourseTitles = [...new Set(registeredCourses.map((course) => course.title))]

    const courseScopeFilters: Record<string, unknown>[] = []

    if (registeredCourseIds.length > 0) {
      courseScopeFilters.push({ courseId: { $in: registeredCourseIds } })
    }

    if (registeredCourseCodes.length > 0) {
      courseScopeFilters.push({ courseCode: { $in: registeredCourseCodes } })
    }

    if (registeredCourseTitles.length > 0) {
      courseScopeFilters.push({ course: { $in: registeredCourseTitles } })
    }

    if (courseScopeFilters.length === 0) {
      return res.status(200).send({ exams: [] })
    }

    query.$or = courseScopeFilters
  }

  const exams = await Exam.find(query).sort({ startAt: 1 })
  const examObjectIds = exams.map((exam) => exam._id as Types.ObjectId)

  const attemptCountByExam = new Map<string, number>()
  const submittedCountByExam = new Map<string, number>()
  const studentAttemptByExam = new Map<string, ExamAttemptDocument>()

  if (examObjectIds.length > 0) {
    const attempts = await ExamAttempt.find({ examId: { $in: examObjectIds } })

    for (const attempt of attempts) {
      const examId = attempt.examId.toString()
      attemptCountByExam.set(examId, (attemptCountByExam.get(examId) ?? 0) + 1)

      if (attempt.status === 'submitted') {
        submittedCountByExam.set(examId, (submittedCountByExam.get(examId) ?? 0) + 1)
      }

      if (requester.role === 'student' && attempt.studentId === requester.id) {
        studentAttemptByExam.set(examId, attempt)
      }
    }
  }

  const now = new Date()

  const response = exams.map((exam) => {
    const lifecycleStatus = getExamLifecycleStatus(exam, now)
    const attemptCount = attemptCountByExam.get(exam.id) ?? 0
    const submittedAttemptCount = submittedCountByExam.get(exam.id) ?? 0

    if (requester.role === 'student') {
      const studentAttempt = studentAttemptByExam.get(exam.id)

      return {
        id: exam.id,
        title: exam.title,
        course: exam.course,
        courseId: exam.courseId?.toString(),
        courseCode: exam.courseCode ?? undefined,
        courseType: exam.courseType ?? undefined,
        durationMinutes: exam.durationMinutes,
        startAt: exam.startAt.toISOString(),
        endAt: exam.endAt.toISOString(),
        instructions: exam.instructions ?? undefined,
        questionCount: exam.questions.length,
        institution: exam.institution,
        status: lifecycleStatus,
        studentStatus: getStudentExamStatus(lifecycleStatus, studentAttempt?.status ?? null),
        attemptId: studentAttempt?.id,
        attemptStatus: studentAttempt?.status,
        proctoring: exam.proctoring,
        createdBy: exam.createdBy,
      }
    }

    return {
      id: exam.id,
      title: exam.title,
      course: exam.course,
      courseId: exam.courseId?.toString(),
      courseCode: exam.courseCode ?? undefined,
      courseType: exam.courseType ?? undefined,
      durationMinutes: exam.durationMinutes,
      startAt: exam.startAt.toISOString(),
      endAt: exam.endAt.toISOString(),
      instructions: exam.instructions ?? undefined,
      questionCount: exam.questions.length,
      institution: exam.institution,
      status: lifecycleStatus,
      attemptCount,
      submittedAttemptCount,
      proctoring: exam.proctoring,
      createdBy: exam.createdBy,
    }
  })

  res.status(200).send({ exams: response })
})

export { router as listExamsRouter }
