"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExamRouter = void 0;
const express_1 = __importDefault(require("express"));
const medlink_common_1 = require("@danmusa/medlink-common");
const Exam_1 = require("../models/Exam");
const ExamAttempt_1 = require("../models/ExamAttempt");
const exam_status_1 = require("../services/exam-status");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.startExamRouter = router;
router.post('/api/exams/:examId/start', medlink_common_1.currentUser, medlink_common_1.requireAuth, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    if (requester.role !== 'student') {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const exam = await Exam_1.Exam.findById(req.params.examId);
    if (!exam) {
        throw new medlink_common_1.NotFoundError();
    }
    if (requester.institution && requester.institution !== exam.institution) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const examStatus = (0, exam_status_1.getExamLifecycleStatus)(exam);
    if (examStatus !== 'live') {
        throw new medlink_common_1.BadRequestError('Exam is not active and cannot be started');
    }
    const existingAttempt = await ExamAttempt_1.ExamAttempt.findOne({
        examId: exam._id,
        studentId: requester.id,
    });
    if (existingAttempt) {
        if (existingAttempt.status === 'submitted') {
            throw new medlink_common_1.BadRequestError('Exam attempt was already submitted');
        }
        if (existingAttempt.status === 'expired') {
            throw new medlink_common_1.BadRequestError('Exam attempt has expired');
        }
        return res.status(200).send({
            attempt: {
                id: existingAttempt.id,
                examId: existingAttempt.examId.toString(),
                status: existingAttempt.status,
                startedAt: existingAttempt.startedAt.toISOString(),
            },
        });
    }
    const attempt = ExamAttempt_1.ExamAttempt.build({
        examId: exam._id,
        studentId: requester.id,
        studentEmail: requester.email,
        studentFullName: requester.fullName,
        status: 'in_progress',
        startedAt: new Date(),
    });
    await attempt.save();
    res.status(201).send({
        attempt: {
            id: attempt.id,
            examId: attempt.examId.toString(),
            status: attempt.status,
            startedAt: attempt.startedAt.toISOString(),
        },
    });
});
