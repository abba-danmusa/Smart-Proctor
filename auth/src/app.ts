import express from 'express'
import { json } from 'body-parser'
import cookieSession from 'cookie-session'
import { errorHandler, NotFoundError } from '@danmusa/medlink-common'

// @ts-ignore
import cors from 'cors'

import { currentUserRouter } from './routes/current-user'
import { signinRouter } from './routes/signin'
import { signoutRouter } from './routes/signout'
import { signupRouter } from './routes/signup'

const app = express()

app.set('trust proxy', true)

app.use(json())
app.use(cors())

app.use(
  cookieSession({
    signed: false,
    secure: process.env.NODE_ENV !== 'test'
  })
)

app.use(currentUserRouter)
app.use(signinRouter)
app.use(signupRouter)
app.use(signoutRouter)

app.use((req, res, next) => {
  throw new NotFoundError();
});

app.use(errorHandler)

export { app }