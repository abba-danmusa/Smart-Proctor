import { Schema, Types, model, Model, HydratedDocument } from 'mongoose'

export type ExamAttemptStatus = 'in_progress' | 'submitted' | 'expired'

export interface IExamAttempt {
  examId: Types.ObjectId
  studentId: string
  studentEmail: string
  studentFullName?: string
  status: ExamAttemptStatus
  startedAt: Date
  submittedAt?: Date
  submittedLate?: boolean
  integrityScore?: number
  answers?: Record<string, unknown>
}

export type ExamAttemptAttrs = {
  examId: Types.ObjectId
  studentId: string
  studentEmail: string
  studentFullName?: string
  status?: ExamAttemptStatus
  startedAt?: Date
  submittedAt?: Date
  submittedLate?: boolean
  integrityScore?: number
  answers?: Record<string, unknown>
}

export type ExamAttemptDocument = HydratedDocument<IExamAttempt>

type ModelStatics = {
  build(attrs: ExamAttemptAttrs): ExamAttemptDocument
}

type ExamAttemptModel = Omit<Model<IExamAttempt>, 'new'> & {
  new(attrs: ExamAttemptAttrs): ExamAttemptDocument
} & ModelStatics

const examAttemptSchema = new Schema<IExamAttempt, Model<IExamAttempt> & ModelStatics>(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    studentEmail: {
      type: String,
      required: true,
    },
    studentFullName: {
      type: String,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'expired'],
      default: 'in_progress',
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    submittedAt: {
      type: Date,
    },
    submittedLate: {
      type: Boolean,
      default: false,
    },
    integrityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    answers: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id
        ret.examId = ret.examId?.toString?.() ?? ret.examId
        delete ret._id
      },
      versionKey: false,
    },
  }
)

examAttemptSchema.index({ examId: 1, studentId: 1 }, { unique: true })

examAttemptSchema.statics.build = function(attrs: ExamAttemptAttrs) {
  return new this(attrs)
}

const ExamAttempt = model<IExamAttempt>('ExamAttempt', examAttemptSchema) as unknown as ExamAttemptModel

export { ExamAttempt }
