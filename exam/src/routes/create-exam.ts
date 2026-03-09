import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import { Types } from 'mongoose'
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
  Exam,
  type ExamQuestion,
  type ExamQuestionGeneration,
} from '../models/Exam'
import { getRequesterContext } from '../services/requester-context'
import { getExamLifecycleStatus } from '../services/exam-status'

const router = express.Router()

const COURSE_TYPES: ReadonlySet<CourseType> = new Set(['core', 'elective'])
const QUESTION_DIFFICULTIES: ReadonlySet<ExamQuestion['difficulty']> = new Set(['easy', 'medium', 'hard'])

function asOptionalTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function parseCourseType(value: unknown) {
  const rawValue = asOptionalTrimmedString(value)
  if (!rawValue) {
    return undefined
  }

  const normalized = rawValue.toLowerCase() as CourseType

  if (!COURSE_TYPES.has(normalized)) {
    throw new BadRequestError('courseType must be either core or elective')
  }

  return normalized
}

function parseQuestions(value: unknown) {
  if (typeof value === 'undefined') {
    return [] as ExamQuestion[]
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError('questions must be an array')
  }

  if (value.length === 0 || value.length > 200) {
    throw new BadRequestError('questions must contain between 1 and 200 entries')
  }

  return value.map((question, index) => {
    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      throw new BadRequestError('Each question must be an object')
    }

    const questionRecord = question as Record<string, unknown>
    const prompt = asOptionalTrimmedString(questionRecord.prompt)
    const topic = asOptionalTrimmedString(questionRecord.topic)
    const answer = asOptionalTrimmedString(questionRecord.answer)
    const explanation = asOptionalTrimmedString(questionRecord.explanation)

    if (!prompt || prompt.length < 8 || prompt.length > 600) {
      throw new BadRequestError('Each question prompt must be between 8 and 600 characters')
    }

    if (!topic || topic.length < 2 || topic.length > 80) {
      throw new BadRequestError('Each question topic must be between 2 and 80 characters')
    }

    if (!answer || answer.length < 2 || answer.length > 240) {
      throw new BadRequestError('Each question answer must be between 2 and 240 characters')
    }

    if (!explanation || explanation.length < 2 || explanation.length > 1000) {
      throw new BadRequestError('Each question explanation must be between 2 and 1000 characters')
    }

    if (!Array.isArray(questionRecord.options)) {
      throw new BadRequestError('Each question options value must be an array')
    }

    const options = questionRecord.options
      .map((option) => (typeof option === 'string' ? option.trim() : ''))
      .filter((option) => option.length > 0)

    if (options.length < 2 || options.length > 6) {
      throw new BadRequestError('Each question must provide between 2 and 6 options')
    }

    if (!options.includes(answer)) {
      throw new BadRequestError('Each question answer must match one of the options')
    }

    const rawDifficulty = asOptionalTrimmedString(questionRecord.difficulty)?.toLowerCase() as
      | ExamQuestion['difficulty']
      | undefined

    if (!rawDifficulty || !QUESTION_DIFFICULTIES.has(rawDifficulty)) {
      throw new BadRequestError('Each question difficulty must be one of easy, medium, hard')
    }

    const questionNumberFromBody = questionRecord.questionNumber
    const parsedQuestionNumber =
      typeof questionNumberFromBody === 'number' && Number.isInteger(questionNumberFromBody) && questionNumberFromBody > 0
        ? questionNumberFromBody
        : index + 1

    return {
      questionNumber: parsedQuestionNumber,
      topic,
      difficulty: rawDifficulty,
      prompt,
      options,
      answer,
      explanation,
    }
  })
}

function parseQuestionGeneration(value: unknown, questions: ExamQuestion[]) {
  if (typeof value === 'undefined' || value === null) {
    if (questions.length === 0) {
      return undefined
    }

    return {
      numberOfQuestions: questions.length,
      difficulty: questions[0].difficulty,
      topics: [...new Set(questions.map((question) => question.topic))],
    } as ExamQuestionGeneration
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestError('questionGeneration must be an object')
  }

  const generation = value as Record<string, unknown>
  const numberOfQuestions = generation.numberOfQuestions

  if (typeof numberOfQuestions !== 'number' || !Number.isInteger(numberOfQuestions) || numberOfQuestions < 1 || numberOfQuestions > 100) {
    throw new BadRequestError('questionGeneration.numberOfQuestions must be between 1 and 100')
  }

  const difficulty = asOptionalTrimmedString(generation.difficulty)?.toLowerCase() as
    | ExamQuestion['difficulty']
    | undefined

  if (!difficulty || !QUESTION_DIFFICULTIES.has(difficulty)) {
    throw new BadRequestError('questionGeneration.difficulty must be one of easy, medium, hard')
  }

  if (!Array.isArray(generation.topics)) {
    throw new BadRequestError('questionGeneration.topics must be an array')
  }

  const topics = generation.topics
    .map((topic) => (typeof topic === 'string' ? topic.trim() : ''))
    .filter((topic) => topic.length > 0)

  if (topics.length === 0 || topics.length > 25) {
    throw new BadRequestError('questionGeneration.topics must contain between 1 and 25 entries')
  }

  if (questions.length > 0 && numberOfQuestions !== questions.length) {
    throw new BadRequestError('questionGeneration.numberOfQuestions must equal questions length')
  }

  return {
    numberOfQuestions,
    difficulty,
    topics: [...new Set(topics)],
  }
}

router.post(
  '/api/exams',
  currentUser,
  requireAuth,
  [
    body('courseId').optional({ values: 'falsy' }).isMongoId().withMessage('courseId must be a valid id'),
    body('title')
      .trim()
      .isLength({ min: 3, max: 120 })
      .withMessage('Title must be between 3 and 120 characters'),
    body('course')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('Course must be between 2 and 120 characters'),
    body('courseCode')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 2, max: 32 })
      .withMessage('courseCode must be between 2 and 32 characters')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('courseCode can only include letters, numbers, and hyphens'),
    body('courseType')
      .optional({ values: 'falsy' })
      .trim()
      .toLowerCase()
      .isIn(['core', 'elective'])
      .withMessage('courseType must be either core or elective'),
    body('instructions')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('instructions must be between 10 and 1000 characters'),
    body('durationMinutes')
      .isInt({ min: 1, max: 720 })
      .withMessage('durationMinutes must be between 1 and 720'),
    body('startAt').isISO8601().withMessage('startAt must be a valid ISO date-time'),
    body('endAt').isISO8601().withMessage('endAt must be a valid ISO date-time'),
    body('proctoring.faceVerification').isBoolean().withMessage('proctoring.faceVerification must be a boolean'),
    body('proctoring.tabSwitchDetection').isBoolean().withMessage('proctoring.tabSwitchDetection must be a boolean'),
    body('proctoring.soundDetection').isBoolean().withMessage('proctoring.soundDetection must be a boolean'),
    body('proctoring.multipleFaceDetection').isBoolean().withMessage('proctoring.multipleFaceDetection must be a boolean'),
    body('questions').optional().isArray({ min: 1, max: 200 }).withMessage('questions must contain between 1 and 200 entries'),
    body('questionGeneration').optional().isObject().withMessage('questionGeneration must be an object'),
    body().custom((payload) => {
      const startAt = new Date(payload.startAt)
      const endAt = new Date(payload.endAt)

      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        throw new Error('Exam dates are invalid')
      }

      if (endAt <= startAt) {
        throw new Error('endAt must be later than startAt')
      }

      const hasCourseId = typeof payload.courseId === 'string' && payload.courseId.trim().length > 0
      const hasCourseTitle = typeof payload.course === 'string' && payload.course.trim().length > 0

      if (!hasCourseId && !hasCourseTitle) {
        throw new Error('Provide either courseId or course title in course field')
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

    const institutionFromBody = asOptionalTrimmedString(req.body.institution)
    let institution = requester.institution ?? institutionFromBody

    if (!institution) {
      throw new BadRequestError('Institution is required to create an exam')
    }

    const courseId = asOptionalTrimmedString(req.body.courseId)
    let course = asOptionalTrimmedString(req.body.course)
    let resolvedCourseId: Types.ObjectId | undefined
    let courseCode = asOptionalTrimmedString(req.body.courseCode)?.toUpperCase()
    let courseType = parseCourseType(req.body.courseType)

    if (courseId) {
      const existingCourse = await Course.findById(courseId)

      if (!existingCourse) {
        throw new NotFoundError()
      }

      if (requester.role === 'lecturer' && existingCourse.createdBy.id !== requester.id) {
        throw new NotAuthorizedError()
      }

      if (requester.institution && requester.institution !== existingCourse.institution) {
        throw new NotAuthorizedError()
      }

      institution = existingCourse.institution
      course = existingCourse.title
      resolvedCourseId = existingCourse._id as Types.ObjectId
      courseCode = existingCourse.code
      courseType = existingCourse.type
    }

    if (!course) {
      throw new BadRequestError('Course title is required')
    }

    const questions = parseQuestions(req.body.questions)
    const questionGeneration = parseQuestionGeneration(req.body.questionGeneration, questions)

    const exam = Exam.build({
      title: String(req.body.title).trim(),
      course,
      courseId: resolvedCourseId,
      courseCode,
      courseType,
      durationMinutes: Number(req.body.durationMinutes),
      startAt: new Date(req.body.startAt),
      endAt: new Date(req.body.endAt),
      instructions: asOptionalTrimmedString(req.body.instructions),
      questions,
      questionGeneration,
      institution,
      createdBy: {
        id: requester.id,
        email: requester.email,
        fullName: requester.fullName ?? 'Lecturer',
      },
      proctoring: {
        faceVerification: Boolean(req.body.proctoring.faceVerification),
        tabSwitchDetection: Boolean(req.body.proctoring.tabSwitchDetection),
        soundDetection: Boolean(req.body.proctoring.soundDetection),
        multipleFaceDetection: Boolean(req.body.proctoring.multipleFaceDetection),
      },
    })

    await exam.save()

    const status = getExamLifecycleStatus(exam)

    res.status(201).send({
      exam: {
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
        questions: exam.questions,
        questionGeneration: exam.questionGeneration,
        institution: exam.institution,
        proctoring: exam.proctoring,
        createdBy: exam.createdBy,
        status,
      },
    })
  }
)

export { router as createExamRouter }
