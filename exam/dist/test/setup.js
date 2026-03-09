"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("jest");
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let mongo;
beforeAll(async () => {
    process.env.JWT_SECRET = 'asdf';
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    process.env.MONGOMS_START_TIMEOUT = '60000';
    process.env.MONGOMS_TIMEOUT = '60000';
    try {
        await mongoose_1.default.connect('mongodb://127.0.0.1:27017/test-db-exam');
    }
    catch {
        mongo = await mongodb_memory_server_1.MongoMemoryServer.create();
        const mongoUri = mongo.getUri();
        await mongoose_1.default.connect(mongoUri);
    }
}, 1000000);
beforeEach(async () => {
    jest.clearAllMocks();
    const collections = await mongoose_1.default.connection.db?.collections();
    if (collections) {
        for (const collection of collections) {
            await collection.deleteMany({});
        }
    }
}, 1000000);
afterAll(async () => {
    await mongoose_1.default.connection.close();
    if (mongo) {
        await mongo.stop();
    }
}, 1000000);
global.signin = async (options) => {
    const payload = {
        id: options?.id ?? new mongoose_1.default.Types.ObjectId().toHexString(),
        email: options?.email ?? 'student@test.com',
        role: options?.role ?? 'student',
        fullName: options?.fullName ?? 'Test User',
        institution: options?.institution ?? 'Riverside University',
    };
    const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET);
    const session = { jwt: token };
    const sessionJSON = JSON.stringify(session);
    const base64 = Buffer.from(sessionJSON).toString('base64');
    return [`session=${base64}`];
};
