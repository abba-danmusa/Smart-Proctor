import 'jest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'

let mongo: MongoMemoryServer

beforeAll(async () => {
  process.env.JWT_SECRET = 'asdf'
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  process.env.MONGOMS_START_TIMEOUT = '60000'
  process.env.MONGOMS_TIMEOUT = '60000'

  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/test-db-exam')
  } catch {
    mongo = await MongoMemoryServer.create()
    const mongoUri = mongo.getUri()
    await mongoose.connect(mongoUri)
  }
}, 1000000)

beforeEach(async () => {
  jest.clearAllMocks()

  const collections = await mongoose.connection.db?.collections()

  if (collections) {
    for (const collection of collections) {
      await collection.deleteMany({})
    }
  }
}, 1000000)

afterAll(async () => {
  await mongoose.connection.close()

  if (mongo) {
    await mongo.stop()
  }
}, 1000000)

global.signin = async (options) => {
  const payload = {
    id: options?.id ?? new mongoose.Types.ObjectId().toHexString(),
    email: options?.email ?? 'student@test.com',
    role: options?.role ?? 'student',
    fullName: options?.fullName ?? 'Test User',
    institution: options?.institution ?? 'Riverside University',
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET!)
  const session = { jwt: token }
  const sessionJSON = JSON.stringify(session)
  const base64 = Buffer.from(sessionJSON).toString('base64')

  return [`session=${base64}`]
}
