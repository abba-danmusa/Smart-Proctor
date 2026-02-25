import mongoose from 'mongoose'
import { app } from './app'
import { natsWrapper } from './nats-wrapper'

const start = async () => {
  // process.env.JWT_SECRET = 'asdf'
  // process.env.MONGO_URI = 'mongodb://127.0.0.1/auth'

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

  try {
    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL
    )

    natsWrapper.client.on('close', () => {
      console.log('NATS connection closed!')
      process.exit()
    })

    process.on('SIGINT', () => natsWrapper.client.close())
    process.on('SIGTERM', () => natsWrapper.client.close())

    await mongoose.connect(process.env.MONGO_URI)
    // await mongoose.connect('mongodb://127.0.0.1/auth')
    console.log('Connected to mongoose')
  } catch (error) {
    console.error(error)
  }

  app.listen('3000', () => {
    console.log('Auth Service listening on port 3000')
  })
}

start()