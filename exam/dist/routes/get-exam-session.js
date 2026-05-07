"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExamSessionRouter = void 0;
const express_1 = __importDefault(require("express"));
const medlink_common_1 = require("@danmusa/medlink-common");
const Exam_1 = require("../models/Exam");
const ExamAttempt_1 = require("../models/ExamAttempt");
const exam_status_1 = require("../services/exam-status");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.getExamSessionRouter = router;
router.get('/api/exams/:examId/session', medlink_common_1.currentUser, medlink_common_1.requireAuth, async (req, res) => {
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
    const lifecycleStatus = (0, exam_status_1.getExamLifecycleStatus)(exam);
    if (lifecycleStatus === 'scheduled') {
        throw new medlink_common_1.BadRequestError('Exam has not started yet');
    }
    if (lifecycleStatus === 'expired') {
        throw new medlink_common_1.BadRequestError('Exam has expired');
    }
    const attempt = await ExamAttempt_1.ExamAttempt.findOne({
        examId: exam._id,
        studentId: requester.id,
    });
    if (!attempt) {
        throw new medlink_common_1.BadRequestError('No attempt found for this exam. Start the exam first.');
    }
    if (attempt.status !== 'in_progress') {
        throw new medlink_common_1.BadRequestError('Exam attempt is not in progress');
    }
    res.status(200).send({
        session: {
            exam: {
                id: exam.id,
                title: exam.title,
                course: exam.course,
                courseCode: exam.courseCode ?? undefined,
                durationMinutes: exam.durationMinutes,
                startAt: exam.startAt.toISOString(),
                endAt: exam.endAt.toISOString(),
                instructions: exam.instructions ?? undefined,
                proctoring: exam.proctoring,
            },
            attempt: {
                id: attempt.id,
                status: attempt.status,
                startedAt: attempt.startedAt.toISOString(),
            },
            questions: exam.questions
                .slice()
                .sort((first, second) => first.questionNumber - second.questionNumber)
                .map((question) => ({
                questionNumber: question.questionNumber,
                topic: question.topic,
                difficulty: question.difficulty,
                prompt: question.prompt,
                options: question.options,
            })),
            serverTime: new Date().toISOString(),
        },
    });
});
