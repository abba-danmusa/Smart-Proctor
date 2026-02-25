import { Schema, model, Model, HydratedDocument } from 'mongoose'
import { Password } from '../services/password'

export interface IAvailability {
  day: string;
  from: string;
  to: string;
}

export type UserRole = 'student' | 'lecturer' | 'admin';

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: UserRole;
  organization?: string;
  termsAccepted?: boolean;
  aiConsent?: boolean;
  faceCapture?: string;
}

export type UserAttrs = IUser

export type UserDocument = HydratedDocument<IUser>

type ModelStatics = {
  build(attrs: UserAttrs): UserDocument;
}

type UserModel = Omit<Model<IUser>, 'new'> & {
  new(attrs: UserAttrs): UserDocument;
} & ModelStatics

const userSchema = new Schema<IUser, Model<IUser> & ModelStatics>(
  {
    firstName: {
      type: String,
      required: true,
      minlength: 2,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      minlength: 2,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    organization: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'lecturer', 'admin'],
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    aiConsent: {
      type: Boolean,
      default: false,
    },
    faceCapture: {
      type: String,
    }
  },
  {
    toJSON: {
      transform(doc, ret: Record<string, any>) {
        ret.id = ret._id
        delete ret?._id
        delete ret?.password
      },
      versionKey: false,
    },
  }
)

userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    const hashed = await Password.toHash(this.get('password'))
    this.set('password', hashed)
  }
})

userSchema.statics.build = function(attrs: UserAttrs) {
  return new this(attrs)

}

const User = model<IUser>('User', userSchema) as unknown as UserModel

export { User }
