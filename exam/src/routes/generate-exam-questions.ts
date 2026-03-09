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

import { Course, type CourseType } from '../models/Course'
import {
  type QuestionDifficulty,
  generateExamQuestions,
} from '../services/question-generator'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

const QUESTION_DIFFICULTIES: ReadonlySet<QuestionDifficulty> = new Set(['easy', 'medium', 'hard'])
const COURSE_TYPES: ReadonlySet<CourseType> = new Set(['core', 'elective'])

function asOptionalTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function normalizeTopics(value: unknown) {
  if (!Array.isArray(value)) {
    throw new BadRequestError('topics must be an array of strings')
  }

  const normalizedTopics = value
    .map((topic) => (typeof topic === 'string' ? topic.trim() : ''))
    .filter((topic) => topic.length > 0)

  if (normalizedTopics.length === 0) {
    throw new BadRequestError('At least one valid topic is required')
  }

  const uniqueTopics = [...new Set(normalizedTopics)]

  if (uniqueTopics.length > 25) {
    throw new BadRequestError('topics cannot exceed 25 entries')
  }

  return uniqueTopics
}

router.post(
  '/api/exams/questions/generate',
  currentUser,
  requireAuth,
  [
    body('courseId').optional({ values: 'falsy' }).isMongoId().withMessage('courseId must be a valid id'),
    body('courseCode')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 2, max: 32 })
      .withMessage('courseCode must be between 2 and 32 characters')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('courseCode can only include letters, numbers, and hyphens'),
    body('courseTitle')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('courseTitle must be between 2 and 120 characters'),
    body('courseType')
      .optional({ values: 'falsy' })
      .trim()
      .toLowerCase()
      .isIn(['core', 'elective'])
      .withMessage('courseType must be either core or elective'),
    body('examTitle')
      .trim()
      .isLength({ min: 3, max: 120 })
      .withMessage('examTitle must be between 3 and 120 characters'),
    body('instructions')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('instructions must be between 10 and 1000 characters'),
    body('numberOfQuestions')
      .isInt({ min: 1, max: 100 })
      .withMessage('numberOfQuestions must be between 1 and 100'),
    body('difficulty')
      .trim()
      .toLowerCase()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('difficulty must be one of easy, medium, hard'),
    body('topics').isArray({ min: 1, max: 25 }).withMessage('topics must contain between 1 and 25 entries'),
    body('topics.*')
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('each topic must be between 2 and 80 characters'),
    body().custom((payload) => {
      const hasCourseId = typeof payload.courseId === 'string' && payload.courseId.trim().length > 0
      const hasCourseCode = typeof payload.courseCode === 'string' && payload.courseCode.trim().length > 0
      const hasCourseTitle = typeof payload.courseTitle === 'string' && payload.courseTitle.trim().length > 0

      if (!hasCourseId && !(hasCourseCode && hasCourseTitle)) {
        throw new Error('Provide either courseId or both courseCode and courseTitle')
      }

      return true
    }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const requester = getRequesterContext(req)

    if (!['lecturer', 'admin'].includes(requester.role)) {
      throw new NotAuthorizedError()
    }

    const topics = normalizeTopics(req.body.topics)
    const difficulty = String(req.body.difficulty).trim().toLowerCase() as QuestionDifficulty

    if (!QUESTION_DIFFICULTIES.has(difficulty)) {
      throw new BadRequestError('difficulty must be one of easy, medium, hard')
    }

    const requestedCourseId = asOptionalTrimmedString(req.body.courseId)

    let resolvedCourseId: string | undefined
    let resolvedCourseCode = ''
    let resolvedCourseTitle = ''
    let resolvedCourseType: CourseType | undefined
    let resolvedInstitution = requester.institution

    if (requestedCourseId) {
      const course = await Course.findById(requestedCourseId)

      if (!course) {
        throw new NotFoundError()
      }

      if (requester.role === 'lecturer' && course.createdBy.id !== requester.id) {
        throw new NotAuthorizedError()
      }

      if (requester.institution && requester.institution !== course.institution) {
        throw new NotAuthorizedError()
      }

      resolvedCourseId = course.id
      resolvedCourseCode = course.code
      resolvedCourseTitle = course.title
      resolvedCourseType = course.type
      resolvedInstitution = course.institution
    } else {
      resolvedCourseCode = String(req.body.courseCode).trim().toUpperCase()
      resolvedCourseTitle = String(req.body.courseTitle).trim()

      const maybeCourseType = asOptionalTrimmedString(req.body.courseType)
      if (maybeCourseType) {
        const normalizedType = maybeCourseType.toLowerCase() as CourseType

        if (!COURSE_TYPES.has(normalizedType)) {
          throw new BadRequestError('courseType must be either core or elective')
        }

        resolvedCourseType = normalizedType
      }
    }

    const examTitle = String(req.body.examTitle).trim()
    const instructions = String(req.body.instructions).trim()
    const numberOfQuestions = Number(req.body.numberOfQuestions)

    const questions = generateExamQuestions({
      courseCode: resolvedCourseCode,
      courseTitle: resolvedCourseTitle,
      examTitle,
      instructions,
      topics,
      numberOfQuestions,
      difficulty,
    })

    res.status(200).send({
      generation: {
        course: {
          id: resolvedCourseId,
          code: resolvedCourseCode,
          title: resolvedCourseTitle,
          type: resolvedCourseType,
          institution: resolvedInstitution,
        },
        examTitle,
        instructions,
        numberOfQuestions,
        difficulty,
        topics,
        questions,
      },
    })
  }
)

export { router as generateExamQuestionsRouter }
