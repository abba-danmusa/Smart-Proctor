import express, { Request, Response } from 'express'
import { param } from 'express-validator'
import {
  BadRequestError,
  NotAuthorizedError,
  NotFoundError,
  currentUser,
  requireAuth,
  validateRequest,
} from '@danmusa/medlink-common'

import { Course } from '../models/Course'
import { CourseRegistration } from '../models/CourseRegistration'
import { getRequesterContext } from '../services/requester-context'

const router = express.Router()

router.post(
  '/api/exams/courses/:courseId/register',
  currentUser,
  requireAuth,
  [param('courseId').isMongoId().withMessage('courseId must be a valid id')],
  validateRequest,
  async (req: Request, res: Response) => {
    const requester = getRequesterContext(req)

    if (requester.role !== 'student') {
      throw new NotAuthorizedError()
    }

    if (!requester.institution) {
      throw new BadRequestError('Student institution is required to register for a course')
    }

    const course = await Course.findById(req.params.courseId)

    if (!course) {
      throw new NotFoundError()
    }

    if (course.institution !== requester.institution) {
      throw new NotAuthorizedError()
    }

    const existingRegistration = await CourseRegistration.findOne({
      courseId: course._id,
      studentId: requester.id,
    })

    if (existingRegistration) {
      return res.status(200).send({
        registration: {
          id: existingRegistration.id,
          courseId: course.id,
          studentId: existingRegistration.studentId,
          studentEmail: existingRegistration.studentEmail,
          studentFullName: existingRegistration.studentFullName,
          institution: existingRegistration.institution,
          registeredAt: existingRegistration.createdAt?.toISOString(),
        },
      })
    }

    const registration = CourseRegistration.build({
      courseId: course._id,
      studentId: requester.id,
      studentEmail: requester.email,
      studentFullName: requester.fullName ?? 'Student',
      institution: requester.institution,
    })

    await registration.save()

    res.status(201).send({
      registration: {
        id: registration.id,
        courseId: course.id,
        studentId: registration.studentId,
        studentEmail: registration.studentEmail,
        studentFullName: registration.studentFullName,
        institution: registration.institution,
        registeredAt: registration.createdAt?.toISOString(),
      },
    })
  }
)

export { router as registerCourseRouter }
