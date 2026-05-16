"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExamSubmissionRouter = void 0;
const express_1 = __importDefault(require("express"));
const mongoose_1 = require("mongoose");
const medlink_common_1 = require("@danmusa/medlink-common");
const ExamAttempt_1 = require("../models/ExamAttempt");
const exam_access_1 = require("../services/exam-access");
const grading_1 = require("../services/grading");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.getExamSubmissionRouter = router;
router.get('/api/exams/:examId/submissions/:attemptId', medlink_common_1.currentUser, medlink_common_1.requireAuth, async (req, res) => {
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
    const review = (0, grading_1.buildAttemptQuestionReview)(exam.questions, attempt.answers);
    res.status(200).send({
        exam: {
            id: exam.id,
            title: exam.title,
            course: exam.course,
            courseCode: exam.courseCode ?? undefined,
            questionCount: exam.questions.length,
        },
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
            review,
        },
    });
});
