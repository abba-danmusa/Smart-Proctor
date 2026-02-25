import "jest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

jest.mock('../nats-wrapper');

let mongo: MongoMemoryServer;

beforeAll(async () => {
  // Setup code to run before all tests
  process.env.JWT_SECRET = "asdf";
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  process.env.MONGOMS_START_TIMEOUT = '60000';
  process.env.MONGOMS_TIMEOUT = '60000';

  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/test-db');
  } catch (error) {
    mongo = await MongoMemoryServer.create();
    const mongoUri = mongo.getUri();
    await mongoose.connect(mongoUri);
  }
}, 1000000);

beforeEach(async () => {
  jest.clearAllMocks();

  // Setup code to run before each test
  const collections = await mongoose.connection.db?.collections();

  if (collections) {
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  }
}, 1000000);

afterAll(async () => {
  // Cleanup code to run after all tests
  await mongoose.connection.close();
  if (mongo) {
    await mongo.stop();
  }
}, 1000000);

declare global {
  var signin: () => Promise<string[]>;
}

global.signin = async () => {
  // Build a JWT payload... { id, email }
  const payload = {
    id: new mongoose.Types.ObjectId().toHexString(),
    email: "test@test.com",
  };

  // Create the JWT
  const token = jwt.sign(payload, process.env.JWT_SECRET!);

  // Build session object... { jwt: MY_JWT }
  const session = { jwt: token };

  // Turn that session into JSON
  const sessionJSON = JSON.stringify(session);

  // Take JSON and encode it to base64
  const base64 = Buffer.from(sessionJSON).toString("base64");

  // Return a string thats the cookie with the encoded data
  return [`session=${base64}`];
};