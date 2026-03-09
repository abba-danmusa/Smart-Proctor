import { HydratedDocument, Model, Schema, model } from 'mongoose'

export type CourseType = 'core' | 'elective'

export interface CourseCreatorInfo {
  id: string
  email: string
  fullName: string
}

export interface ICourse {
  code: string
  title: string
  type: CourseType
  description?: string | null
  department?: string | null
  level?: string | null
  institution: string
  createdBy: CourseCreatorInfo
}

export type CourseAttrs = {
  code: string
  title: string
  type: CourseType
  description?: string | null
  department?: string | null
  level?: string | null
  institution: string
  createdBy: CourseCreatorInfo
}

export type CourseDocument = HydratedDocument<ICourse>

type ModelStatics = {
  build(attrs: CourseAttrs): CourseDocument
}

type CourseModel = Omit<Model<ICourse>, 'new'> & {
  new(attrs: CourseAttrs): CourseDocument
} & ModelStatics

const courseSchema = new Schema<ICourse, Model<ICourse> & ModelStatics>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 32,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    type: {
      type: String,
      required: true,
      enum: ['core', 'elective'],
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 800,
      default: null,
    },
    department: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    level: {
      type: String,
      trim: true,
      maxlength: 40,
      default: null,
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

courseSchema.index({ institution: 1, code: 1 }, { unique: true })
courseSchema.index({ 'createdBy.id': 1, createdAt: -1 })

courseSchema.statics.build = function(attrs: CourseAttrs) {
  return new this(attrs)
}

const Course = model<ICourse>('Course', courseSchema) as unknown as CourseModel

export { Course }
