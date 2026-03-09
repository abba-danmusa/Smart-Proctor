"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitExamRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const medlink_common_1 = require("@danmusa/medlink-common");
const Exam_1 = require("../models/Exam");
const ExamAttempt_1 = require("../models/ExamAttempt");
const exam_status_1 = require("../services/exam-status");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.submitExamRouter = router;
router.post('/api/exams/:examId/submit', medlink_common_1.currentUser, medlink_common_1.requireAuth, [
    (0, express_validator_1.body)('integrityScore')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('integrityScore must be between 0 and 100'),
    (0, express_validator_1.body)('answers').optional().isObject().withMessage('answers must be an object'),
], medlink_common_1.validateRequest, async (req, res) => {
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
    const attempt = await ExamAttempt_1.ExamAttempt.findOne({
        examId: exam._id,
        studentId: requester.id,
    });
    if (!attempt) {
        throw new medlink_common_1.BadRequestError('No attempt found for this exam');
    }
    if (attempt.status === 'expired') {
        throw new medlink_common_1.BadRequestError('Attempt has expired and cannot be submitted');
    }
    if (attempt.status === 'submitted') {
        return res.status(200).send({
            attempt: {
                id: attempt.id,
                examId: attempt.examId.toString(),
                status: attempt.status,
                startedAt: attempt.startedAt.toISOString(),
                submittedAt: attempt.submittedAt?.toISOString(),
                submittedLate: attempt.submittedLate,
                integrityScore: attempt.integrityScore,
            },
        });
    }
    const now = new Date();
    attempt.status = 'submitted';
    attempt.submittedAt = now;
    attempt.submittedLate = (0, exam_status_1.getExamLifecycleStatus)(exam, now) === 'expired';
    if (typeof req.body.integrityScore === 'number') {
        attempt.integrityScore = req.body.integrityScore;
    }
    if (req.body.answers && typeof req.body.answers === 'object' && !Array.isArray(req.body.answers)) {
        attempt.answers = req.body.answers;
    }
    await attempt.save();
    res.status(200).send({
        attempt: {
            id: attempt.id,
            examId: attempt.examId.toString(),
            status: attempt.status,
            startedAt: attempt.startedAt.toISOString(),
            submittedAt: attempt.submittedAt?.toISOString(),
            submittedLate: attempt.submittedLate,
            integrityScore: attempt.integrityScore,
        },
    });
});
