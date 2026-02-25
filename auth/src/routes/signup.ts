import express, {Request, Response} from 'express'
import { body } from 'express-validator'
import jwt from 'jsonwebtoken'

import { User } from '../models/User'
import { BadRequestError, validateRequest } from '@danmusa/medlink-common'
import { UserCreatedPublisher } from '../events/publishers/user-created-publisher'
import { natsWrapper } from '../nats-wrapper'

const router = express.Router()

router.post('/api/users/signup',
  [
    body().custom((value) => {
      const candidateName = value?.fullName ?? value?.name
      if (typeof candidateName !== 'string' || !candidateName.trim()) {
        throw new Error('Full name is required')
      }

      if (candidateName.trim().length < 3) {
        throw new Error('Name must be at least 3 characters long')
      }

      if (candidateName.trim().split(/\s+/).length < 2) {
        throw new Error('Name must include both first and last name')
      }

      return true
    }),
    body('organization')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Organization must be at least 2 characters long'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .trim()
      .isLength({ min: 8, max: 20 })
      .withMessage('Password must be between 8 and 20 characters long'),
    body('role')
      .optional()
      .isIn(['student', 'lecturer', 'admin'])
      .withMessage('Invalid role'),
    body('termsAccepted')
      .optional()
      .isBoolean()
      .withMessage('termsAccepted must be a boolean'),
    body('aiConsent')
      .optional()
      .isBoolean()
      .withMessage('aiConsent must be a boolean'),
    body('faceCapture')
      .optional()
      .isString()
      .isLength({ min: 16 })
      .withMessage('faceCapture must be a valid image data string'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {

    const {
      fullName,
      name,
      organization,
      email,
      password,
      role,
      termsAccepted,
      aiConsent,
      faceCapture,
      ...otherDetails
    } = req.body

    const candidateName = (fullName ?? name) as string

    const [firstName, ...rest] = candidateName.trim().split(/\s+/)
    const lastName = rest.join(' ')

    if (!firstName || !lastName) {
      throw new BadRequestError('Name must include both first and last name')
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      throw new BadRequestError('Email in use')
    }

    const user = new User({
      firstName,
      lastName,
      organization,
      email,
      password,
      role,
      termsAccepted,
      aiConsent,
      faceCapture,
      ...otherDetails
    })
    await user.save()

    await new UserCreatedPublisher(natsWrapper.client).publish({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      organization: user.organization,
    })

    const userJwt = jwt.sign({
      id: user.id,
      email: user.email
    }, process.env.JWT_SECRET!)

    req.session = {
      jwt: userJwt
    }

    res.status(201).send({ user, token: userJwt })
  }
)

export { router as signupRouter }
