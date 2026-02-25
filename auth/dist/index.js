"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = require("./app");
const nats_wrapper_1 = require("./nats-wrapper");
const start = async () => {
    // process.env.JWT_SECRET = 'asdf'
    // process.env.MONGO_URI = 'mongodb://127.0.0.1/auth'
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET must be defined');
    }
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI must be defined');
    }
    if (!process.env.NATS_CLIENT_ID) {
        throw new Error('NATS_CLIENT_ID must be defined');
    }
    if (!process.env.NATS_URL) {
        throw new Error('NATS_URL must be defined');
    }
    if (!process.env.NATS_CLUSTER_ID) {
        throw new Error('NATS_CLUSTER_ID must be defined');
    }
    try {
        await nats_wrapper_1.natsWrapper.connect(process.env.NATS_CLUSTER_ID, process.env.NATS_CLIENT_ID, process.env.NATS_URL);
        nats_wrapper_1.natsWrapper.client.on('close', () => {
            console.log('NATS connection closed!');
            process.exit();
        });
        process.on('SIGINT', () => nats_wrapper_1.natsWrapper.client.close());
        process.on('SIGTERM', () => nats_wrapper_1.natsWrapper.client.close());
        await mongoose_1.default.connect(process.env.MONGO_URI);
        // await mongoose.connect('mongodb://127.0.0.1/auth')
        console.log('Connected to mongoose');
    }
    catch (error) {
        console.error(error);
    }
    app_1.app.listen('3000', () => {
        console.log('Auth Service listening on port 3000');
    });
};
start();
