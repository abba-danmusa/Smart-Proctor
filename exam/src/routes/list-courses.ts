import express, { Request, Response } from 'express'
import { NotAuthorizedError, currentUser, requireAuth } from '@danmusa/medlink-common'

import { Course } from '../models/Course'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.get('/api/exams/courses', currentUser, requireAuth, async (req: Request, res: Response) => {
  const requester = getRequesterContext(req)

  if (!['lecturer', 'admin'].includes(requester.role)) {
    throw new NotAuthorizedError()
  }

  const query: Record<string, unknown> = {}

  if (requester.role === 'lecturer') {
    query['createdBy.id'] = requester.id
  }

  if (requester.institution) {
    query.institution = requester.institution
  }

  const courses = await Course.find(query).sort({ title: 1, code: 1 })

  res.status(200).send({
    courses: courses.map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      type: course.type,
      description: course.description ?? undefined,
      department: course.department ?? undefined,
      level: course.level ?? undefined,
      institution: course.institution,
      createdBy: course.createdBy,
    })),
  })
})

export { router as listCoursesRouter }
