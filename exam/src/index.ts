import mongoose from 'mongoose'
import { app } from './app'
import { natsWrapper } from './nats-wrapper'

const wait = (durationMs: number) =>
  new Promise((resolve) => setTimeout(resolve, durationMs))

const connectToNatsWithRetry = async () => {
  while (true) {
    try {
      await natsWrapper.connect(
        process.env.NATS_CLUSTER_ID!,
        process.env.NATS_CLIENT_ID!,
        process.env.NATS_URL!
      )

      return
    } catch (error) {
      console.error('Waiting for NATS connection...', error)
      await wait(5000)
    }
  }
}

const connectToMongoWithRetry = async () => {
  const mongoDbName = process.env.MONGO_DB_NAME ?? 'exam'

  while (true) {
    try {
      await mongoose.connect(process.env.MONGO_URI!, {
        dbName: mongoDbName,
      })
      console.log('Connected to mongoose')

      return
    } catch (error) {
      console.error('Waiting for MongoDB connection...', error)
      await wait(5000)
    }
  }
}

const start = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined')
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be defined')
  }

  if (!process.env.NATS_CLIENT_ID) {
    throw new Error('NATS_CLIENT_ID must be defined')
  }

  if (!process.env.NATS_URL) {
    throw new Error('NATS_URL must be defined')
  }

  if (!process.env.NATS_CLUSTER_ID) {
    throw new Error('NATS_CLUSTER_ID must be defined')
  }

  await connectToNatsWithRetry()

  natsWrapper.client.on('close', () => {
    console.log('NATS connection closed!')
    process.exit()
  })

  process.on('SIGINT', () => natsWrapper.client.close())
  process.on('SIGTERM', () => natsWrapper.client.close())

  await connectToMongoWithRetry()

  const port = Number(process.env.PORT ?? 3001)

  app.listen(port, () => {
    console.log(`Exam Service listening on port ${port}`)
  })
}

start().catch((error) => {
  console.error(error)
})
