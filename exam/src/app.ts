import express from 'express'
import { json } from 'body-parser'
import cookieSession from 'cookie-session'
import { errorHandler, NotFoundError } from '@danmusa/medlink-common'

// @ts-ignore
import cors from 'cors'

import { createExamRouter } from './routes/create-exam'
import { createCourseRouter } from './routes/create-course'
import { listCoursesRouter } from './routes/list-courses'
import { registerCourseRouter } from './routes/register-course'
import { generateExamQuestionsRouter } from './routes/generate-exam-questions'
import { listExamsRouter } from './routes/list-exams'
import { startExamRouter } from './routes/start-exam'
import { submitExamRouter } from './routes/submit-exam'
import { expireExamRouter } from './routes/expire-exam'

const app = express()
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'https://smartproctor.dev',
  'https://www.smartproctor.dev',
  'https://494a9d6e096e.ngrok-free.app',
]

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? defaultAllowedOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.set('trust proxy', true)

app.use(json())
app.use(
  cors({
    origin(
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(null, false)
    },
    credentials: true,
  })
)

app.use(
  cookieSession({
    signed: false,
    secure: process.env.NODE_ENV !== 'test',
  })
)

app.use(createExamRouter)
app.use(createCourseRouter)
app.use(listCoursesRouter)
app.use(registerCourseRouter)
app.use(generateExamQuestionsRouter)
app.use(listExamsRouter)
app.use(startExamRouter)
app.use(submitExamRouter)
app.use(expireExamRouter)

app.use((_req, _res, _next) => {
  throw new NotFoundError()
})

app.use(errorHandler)

export { app }
