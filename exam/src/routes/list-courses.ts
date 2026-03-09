import express, { Request, Response } from 'express'
import { BadRequestError, NotAuthorizedError, currentUser, requireAuth } from '@danmusa/medlink-common'

import { Course } from '../models/Course'
import { CourseRegistration } from '../models/CourseRegistration'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.get('/api/exams/courses', currentUser, requireAuth, async (req: Request, res: Response) => {
  const requester = getRequesterContext(req)

  if (!['lecturer', 'admin', 'student'].includes(requester.role)) {
    throw new NotAuthorizedError()
  }

  const query: Record<string, unknown> = {}

  if (requester.role === 'lecturer') {
    query['createdBy.id'] = requester.id
  }

  if (requester.role === 'student' && !requester.institution) {
    throw new BadRequestError('Student institution is required to fetch courses')
  }

  if (requester.institution) {
    query.institution = requester.institution
  }

  const courses = await Course.find(query).sort({ title: 1, code: 1 })
  const registrationCreatedAtByCourseId = new Map<string, Date>()

  if (requester.role === 'student' && courses.length > 0) {
    const registrations = await CourseRegistration.find({
      studentId: requester.id,
      courseId: { $in: courses.map((course) => course._id) },
    }).select({ courseId: 1, createdAt: 1 })

    for (const registration of registrations) {
      const createdAt = registration.createdAt
      if (createdAt) {
        registrationCreatedAtByCourseId.set(registration.courseId.toString(), createdAt)
      }
    }
  }

  res.status(200).send({
    courses: courses.map((course) => {
      const payload = {
        id: course.id,
        code: course.code,
        title: course.title,
        type: course.type,
        description: course.description ?? undefined,
        department: course.department ?? undefined,
        level: course.level ?? undefined,
        institution: course.institution,
        createdBy: course.createdBy,
      }

      if (requester.role !== 'student') {
        return payload
      }

      const registrationCreatedAt = registrationCreatedAtByCourseId.get(course.id)

      return {
        ...payload,
        isRegistered: Boolean(registrationCreatedAt),
        registeredAt: registrationCreatedAt?.toISOString(),
      }
    }),
  })
})

export { router as listCoursesRouter }
