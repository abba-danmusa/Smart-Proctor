import { HydratedDocument, Model, Schema, Types, model } from 'mongoose'

export type ProctoringEventSeverity = 'low' | 'medium' | 'high'

export interface IProctoringEvent {
  examId: Types.ObjectId
  attemptId?: Types.ObjectId
  lecturerId: string
  institution: string
  studentId: string
  studentEmail: string
  studentFullName?: string
  eventType: string
  severity: ProctoringEventSeverity
  message: string
  evidence?: Record<string, unknown>
  detectedAt: Date
}

export type ProctoringEventAttrs = {
  examId: Types.ObjectId
  attemptId?: Types.ObjectId
  lecturerId: string
  institution: string
  studentId: string
  studentEmail: string
  studentFullName?: string
  eventType: string
  severity?: ProctoringEventSeverity
  message: string
  evidence?: Record<string, unknown>
  detectedAt?: Date
}

export type ProctoringEventDocument = HydratedDocument<IProctoringEvent>

type ModelStatics = {
  build(attrs: ProctoringEventAttrs): ProctoringEventDocument
}

type ProctoringEventModel = Omit<Model<IProctoringEvent>, 'new'> & {
  new(attrs: ProctoringEventAttrs): ProctoringEventDocument
} & ModelStatics

const proctoringEventSchema = new Schema<IProctoringEvent, Model<IProctoringEvent> & ModelStatics>(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamAttempt',
      default: null,
    },
    lecturerId: {
      type: String,
      required: true,
      index: true,
    },
    institution: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
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
      trim: true,
      lowercase: true,
    },
    studentFullName: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 80,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
      default: 'medium',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
    evidence: {
      type: Schema.Types.Mixed,
    },
    detectedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id
        ret.examId = ret.examId?.toString?.() ?? ret.examId
        ret.attemptId = ret.attemptId?.toString?.() ?? ret.attemptId
        delete ret._id
      },
      versionKey: false,
    },
  }
)

proctoringEventSchema.index({ lecturerId: 1, detectedAt: -1 })
proctoringEventSchema.index({ examId: 1, studentId: 1, detectedAt: -1 })

proctoringEventSchema.statics.build = function(attrs: ProctoringEventAttrs) {
  return new this(attrs)
}

const ProctoringEvent = model<IProctoringEvent>('ProctoringEvent', proctoringEventSchema) as unknown as ProctoringEventModel

export { ProctoringEvent }
