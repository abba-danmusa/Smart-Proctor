"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeExamSubmissionRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const mongoose_1 = require("mongoose");
const medlink_common_1 = require("@danmusa/medlink-common");
const ExamAttempt_1 = require("../models/ExamAttempt");
const exam_access_1 = require("../services/exam-access");
const grading_1 = require("../services/grading");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.gradeExamSubmissionRouter = router;
router.put('/api/exams/:examId/submissions/:attemptId/grade', medlink_common_1.currentUser, medlink_common_1.requireAuth, [
    (0, express_validator_1.body)('score').isInt({ min: 0, max: 100 }).withMessage('score must be between 0 and 100'),
    (0, express_validator_1.body)('feedback')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 3, max: 1500 })
        .withMessage('feedback must be between 3 and 1500 characters'),
], medlink_common_1.validateRequest, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    const examId = typeof req.params.examId === 'string' ? req.params.examId : req.params.examId?.[0] ?? '';
    const rawAttemptId = typeof req.params.attemptId === 'string' ? req.params.attemptId : req.params.attemptId?.[0] ?? '';
    const exam = await (0, exam_access_1.findExamForLecturerAccess)(examId, requester);
    const attemptId = rawAttemptId.trim();
    if (!mongoose_1.Types.ObjectId.isValid(attemptId)) {
        throw new medlink_common_1.BadRequestError('attemptId must be a valid id');
    }
    const attempt = await ExamAttempt_1.ExamAttempt.findOne({
        _id: new mongoose_1.Types.ObjectId(attemptId),
        examId: exam._id,
        status: 'submitted',
    });
    if (!attempt) {
        throw new medlink_common_1.NotFoundError();
    }
    const reviewedAt = new Date();
    const automaticGrading = (0, grading_1.buildAutomaticGrading)(exam.questions, attempt.answers, reviewedAt);
    const score = Number(req.body.score);
    attempt.grading = {
        status: 'manually_graded',
        method: 'manual',
        autoScore: automaticGrading.grading.autoScore,
        manualScore: score,
        finalScore: score,
        correctAnswers: automaticGrading.grading.correctAnswers,
        totalQuestions: automaticGrading.grading.totalQuestions,
        feedback: typeof req.body.feedback === 'string' ? req.body.feedback.trim() : undefined,
        gradedAt: reviewedAt,
        gradedBy: {
            id: requester.id,
            email: requester.email,
            fullName: requester.fullName ?? requester.email,
        },
    };
    await attempt.save();
    res.status(200).send({
        submission: {
            attemptId: attempt.id,
            studentId: attempt.studentId,
            studentEmail: attempt.studentEmail,
            studentFullName: attempt.studentFullName ?? undefined,
            startedAt: attempt.startedAt.toISOString(),
            submittedAt: attempt.submittedAt?.toISOString(),
            submittedLate: attempt.submittedLate,
            integrityScore: attempt.integrityScore,
            grading: (0, grading_1.serializeAttemptGrading)(attempt.grading),
        },
    });
});
