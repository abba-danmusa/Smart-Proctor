import { HydratedDocument, Model, Schema, Types, model } from 'mongoose'

export interface ICourseRegistration {
  courseId: Types.ObjectId
  studentId: string
  studentEmail: string
  studentFullName: string
  institution: string
  createdAt?: Date
  updatedAt?: Date
}

export type CourseRegistrationAttrs = {
  courseId: Types.ObjectId
  studentId: string
  studentEmail: string
  studentFullName: string
  institution: string
}

export type CourseRegistrationDocument = HydratedDocument<ICourseRegistration>

type ModelStatics = {
  build(attrs: CourseRegistrationAttrs): CourseRegistrationDocument
}

type CourseRegistrationModel = Omit<Model<ICourseRegistration>, 'new'> & {
  new(attrs: CourseRegistrationAttrs): CourseRegistrationDocument
} & ModelStatics

const courseRegistrationSchema = new Schema<ICourseRegistration, Model<ICourseRegistration> & ModelStatics>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Course',
    },
    studentId: {
      type: String,
      required: true,
    },
    studentEmail: {
      type: String,
      required: true,
    },
    studentFullName: {
      type: String,
      required: true,
    },
    institution: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
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

courseRegistrationSchema.index({ courseId: 1, studentId: 1 }, { unique: true })
courseRegistrationSchema.index({ studentId: 1, createdAt: -1 })

courseRegistrationSchema.statics.build = function(attrs: CourseRegistrationAttrs) {
  return new this(attrs)
}

const CourseRegistration = model<ICourseRegistration>('CourseRegistration', courseRegistrationSchema) as unknown as CourseRegistrationModel

export { CourseRegistration }
