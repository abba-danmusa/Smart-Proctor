import { Types } from 'mongoose'
import { BadRequestError, NotAuthorizedError, NotFoundError } from '@danmusa/medlink-common'

import { Exam } from '../models/Exam'
import type { RequesterContext } from './requester-context'

export async function findExamForLecturerAccess(examId: string, requester: RequesterContext) {
  const normalizedExamId = examId.trim()

  if (!Types.ObjectId.isValid(normalizedExamId)) {
    throw new BadRequestError('examId must be a valid id')
  }

  const exam = await Exam.findById(normalizedExamId)

  if (!exam) {
    throw new NotFoundError()
  }

  if (!['lecturer', 'admin'].includes(requester.role)) {
    throw new NotAuthorizedError()
  }

  if (requester.role === 'lecturer' && exam.createdBy.id !== requester.id) {
    throw new NotAuthorizedError()
  }

  if (requester.institution && requester.institution !== exam.institution) {
    throw new NotAuthorizedError()
  }

  return exam
}
