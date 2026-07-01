"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExamSubmissionsRouter = void 0;
const express_1 = __importDefault(require("express"));
const medlink_common_1 = require("@danmusa/medlink-common");
const ExamAttempt_1 = require("../models/ExamAttempt");
const exam_access_1 = require("../services/exam-access");
const grading_1 = require("../services/grading");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.listExamSubmissionsRouter = router;
router.get('/api/exams/:examId/submissions', medlink_common_1.currentUser, medlink_common_1.requireAuth, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    const examId = typeof req.params.examId === 'string' ? req.params.examId : req.params.examId?.[0] ?? '';
    const exam = await (0, exam_access_1.findExamForLecturerAccess)(examId, requester);
    const attempts = await ExamAttempt_1.ExamAttempt.find({
        examId: exam._id,
        status: 'submitted',
    }).sort({ submittedAt: -1 });
    res.status(200).send({
        exam: {
            id: exam.id,
            title: exam.title,
            course: exam.course,
            courseCode: exam.courseCode ?? undefined,
            questionCount: exam.questions.length,
        },
        submissions: attempts.map((attempt) => ({
            attemptId: attempt.id,
            studentId: attempt.studentId,
            studentEmail: attempt.studentEmail,
            studentFullName: attempt.studentFullName ?? undefined,
            startedAt: attempt.startedAt.toISOString(),
            submittedAt: attempt.submittedAt?.toISOString(),
            submittedLate: attempt.submittedLate,
            integrityScore: attempt.integrityScore,
            grading: (0, grading_1.serializeAttemptGrading)(attempt.grading),
        })),
    });
});
