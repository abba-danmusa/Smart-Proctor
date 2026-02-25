import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import jwt from 'jsonwebtoken'

import { validateRequest, BadRequestError } from '@danmusa/medlink-common'
import { Password } from '../services/password'

import { User } from '../models/User'

const router = express.Router()

router.post('/api/users/signin',
  [
    body('email')
      .isEmail()
      .withMessage('Email must be valid'),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('You must supply a password')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    
    const { email, password } = req.body

    const user = await User.findOne({ email })

    if (!user) {
      throw new BadRequestError('Invalid Credentials')
    }

    const passwordsMatch = await Password.compare(
      user.password,
      password
    )

    if(!passwordsMatch) {
      throw new BadRequestError('Invalid Credentials')
    }

    const userJwt = jwt.sign({
      id: user.id,
      email: user.email
    }, process.env.JWT_SECRET!)

    req.session = {
      jwt: userJwt
    }

    res.status(200).send({ user, token: userJwt })
  }
)

export { router as signinRouter }