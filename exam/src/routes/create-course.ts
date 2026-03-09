import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import {
  BadRequestError,
  NotAuthorizedError,
  currentUser,
  requireAuth,
  validateRequest,
} from '@danmusa/medlink-common'

import { Course, type CourseType } from '../models/Course'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

const COURSE_TYPES: ReadonlySet<CourseType> = new Set(['core', 'elective'])

function asOptionalTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

router.post(
  '/api/exams/courses',
  currentUser,
  requireAuth,
  [
    body('code')
      .trim()
      .isLength({ min: 2, max: 32 })
      .withMessage('Course code must be between 2 and 32 characters')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('Course code can only include letters, numbers, and hyphens'),
    body('title')
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('Course title must be between 2 and 120 characters'),
    body('type')
      .trim()
      .toLowerCase()
      .isIn(['core', 'elective'])
      .withMessage('Course type must be either core or elective'),
    body('description')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 800 })
      .withMessage('Course description must be 800 characters or fewer'),
    body('department')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('Department must be between 2 and 120 characters'),
    body('level')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 1, max: 40 })
      .withMessage('Level must be between 1 and 40 characters'),
    body('institution')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 2, max: 160 })
      .withMessage('Institution must be between 2 and 160 characters'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const requester = getRequesterContext(req)

    if (!['lecturer', 'admin'].includes(requester.role)) {
      throw new NotAuthorizedError()
    }

    const institution = requester.institution ?? asOptionalTrimmedString(req.body.institution)

    if (!institution) {
      throw new BadRequestError('Institution is required to create a course')
    }

    const type = String(req.body.type).trim().toLowerCase() as CourseType

    if (!COURSE_TYPES.has(type)) {
      throw new BadRequestError('Course type must be either core or elective')
    }

    const code = String(req.body.code).trim().toUpperCase()

    const existingCourse = await Course.findOne({ institution, code })

    if (existingCourse) {
      throw new BadRequestError('Course code already exists for this institution')
    }

    const course = Course.build({
      code,
      title: String(req.body.title).trim(),
      type,
      description: asOptionalTrimmedString(req.body.description),
      department: asOptionalTrimmedString(req.body.department),
      level: asOptionalTrimmedString(req.body.level),
      institution,
      createdBy: {
        id: requester.id,
        email: requester.email,
        fullName: requester.fullName ?? 'Lecturer',
      },
    })

    await course.save()

    res.status(201).send({
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        type: course.type,
        description: course.description ?? undefined,
        department: course.department ?? undefined,
        level: course.level ?? undefined,
        institution: course.institution,
        createdBy: course.createdBy,
      },
    })
  }
)

export { router as createCourseRouter }
