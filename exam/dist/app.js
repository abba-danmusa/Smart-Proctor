"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const cookie_session_1 = __importDefault(require("cookie-session"));
const medlink_common_1 = require("@danmusa/medlink-common");
// @ts-ignore
const cors_1 = __importDefault(require("cors"));
const create_exam_1 = require("./routes/create-exam");
const create_course_1 = require("./routes/create-course");
const list_courses_1 = require("./routes/list-courses");
const generate_exam_questions_1 = require("./routes/generate-exam-questions");
const list_exams_1 = require("./routes/list-exams");
const start_exam_1 = require("./routes/start-exam");
const submit_exam_1 = require("./routes/submit-exam");
const expire_exam_1 = require("./routes/expire-exam");
const app = (0, express_1.default)();
exports.app = app;
const defaultAllowedOrigins = [
    'http://localhost:5173',
    'https://smartproctor.dev',
    'https://www.smartproctor.dev',
    'https://494a9d6e096e.ngrok-free.app',
];
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? defaultAllowedOrigins.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
app.set('trust proxy', true);
app.use((0, body_parser_1.json)());
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(null, false);
    },
    credentials: true,
}));
app.use((0, cookie_session_1.default)({
    signed: false,
    secure: process.env.NODE_ENV !== 'test',
}));
app.use(create_exam_1.createExamRouter);
app.use(create_course_1.createCourseRouter);
app.use(list_courses_1.listCoursesRouter);
app.use(generate_exam_questions_1.generateExamQuestionsRouter);
app.use(list_exams_1.listExamsRouter);
app.use(start_exam_1.startExamRouter);
app.use(submit_exam_1.submitExamRouter);
app.use(expire_exam_1.expireExamRouter);
app.use((_req, _res, _next) => {
    throw new medlink_common_1.NotFoundError();
});
app.use(medlink_common_1.errorHandler);
