import { HydratedDocument, Model, Schema, Types, model } from 'mongoose'

import type { CourseType } from './Course'
import type { QuestionDifficulty } from '../services/question-generator'

export interface ExamProctoringSettings {
  faceVerification: boolean
  tabSwitchDetection: boolean
  soundDetection: boolean
  multipleFaceDetection: boolean
}

export interface ExamCreatorInfo {
  id: string
  email: string
  fullName: string
}

export interface ExamQuestion {
  questionNumber: number
  topic: string
  difficulty: QuestionDifficulty
  prompt: string
  options: string[]
  answer: string
  explanation: string
}

export interface ExamQuestionGeneration {
  numberOfQuestions: number
  difficulty: QuestionDifficulty
  topics: string[]
}

export interface IExam {
  title: string
  course: string
  courseId?: Types.ObjectId | null
  courseCode?: string | null
  courseType?: CourseType | null
  durationMinutes: number
  startAt: Date
  endAt: Date
  instructions?: string | null
  questions: ExamQuestion[]
  questionGeneration?: ExamQuestionGeneration
  institution: string
  createdBy: ExamCreatorInfo
  proctoring: ExamProctoringSettings
  forceExpiredAt?: Date | null
}

export type ExamAttrs = {
  title: string
  course: string
  courseId?: Types.ObjectId | null
  courseCode?: string | null
  courseType?: CourseType | null
  durationMinutes: number
  startAt: Date
  endAt: Date
  instructions?: string | null
  questions?: ExamQuestion[]
  questionGeneration?: ExamQuestionGeneration
  institution: string
  createdBy: ExamCreatorInfo
  proctoring: ExamProctoringSettings
  forceExpiredAt?: Date | null
}

export type ExamDocument = HydratedDocument<IExam>

type ModelStatics = {
  build(attrs: ExamAttrs): ExamDocument
}

type ExamModel = Omit<Model<IExam>, 'new'> & {
  new(attrs: ExamAttrs): ExamDocument
} & ModelStatics

const examSchema = new Schema<IExam, Model<IExam> & ModelStatics>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    course: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    courseCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 32,
      default: null,
    },
    courseType: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ['core', 'elective'],
      default: null,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 720,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    questions: {
      type: [
        {
          questionNumber: {
            type: Number,
            required: true,
            min: 1,
          },
          topic: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80,
          },
          difficulty: {
            type: String,
            required: true,
            enum: ['easy', 'medium', 'hard'],
            lowercase: true,
            trim: true,
          },
          prompt: {
            type: String,
            required: true,
            trim: true,
            minlength: 8,
            maxlength: 600,
          },
          options: {
            type: [
              {
                type: String,
                required: true,
                trim: true,
                minlength: 2,
                maxlength: 240,
              },
            ],
            validate: {
              validator: (value: string[]) => Array.isArray(value) && value.length >= 2 && value.length <= 6,
              message: 'Each question must contain between 2 and 6 options',
            },
            required: true,
          },
          answer: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 240,
          },
          explanation: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 1000,
          },
        },
      ],
      default: [],
    },
    questionGeneration: {
      numberOfQuestions: {
        type: Number,
        min: 1,
        max: 100,
      },
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        lowercase: true,
        trim: true,
      },
      topics: {
        type: [
          {
            type: String,
            trim: true,
            minlength: 2,
            maxlength: 80,
          },
        ],
      },
    },
    institution: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    createdBy: {
      id: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      fullName: {
        type: String,
        required: true,
      },
    },
    proctoring: {
      faceVerification: {
        type: Boolean,
        default: true,
      },
      tabSwitchDetection: {
        type: Boolean,
        default: true,
      },
      soundDetection: {
        type: Boolean,
        default: true,
      },
      multipleFaceDetection: {
        type: Boolean,
        default: true,
      },
    },
    forceExpiredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id
        delete ret._id
      },
      versionKey: false,
    },
  }
)

examSchema.index({ institution: 1, startAt: 1, endAt: 1 })
examSchema.index({ institution: 1, courseId: 1, startAt: 1 })
examSchema.index({ 'createdBy.id': 1, startAt: -1 })

examSchema.statics.build = function(attrs: ExamAttrs) {
  return new this(attrs)
}

const Exam = model<IExam>('Exam', examSchema) as unknown as ExamModel

export { Exam }
