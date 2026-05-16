"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStudentResultsRouter = void 0;
const express_1 = __importDefault(require("express"));
const mongoose_1 = require("mongoose");
const medlink_common_1 = require("@danmusa/medlink-common");
const Exam_1 = require("../models/Exam");
const ExamAttempt_1 = require("../models/ExamAttempt");
const grading_1 = require("../services/grading");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.listStudentResultsRouter = router;
router.get('/api/exams/results', medlink_common_1.currentUser, medlink_common_1.requireAuth, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    if (requester.role !== 'student') {
        throw new medlink_common_1.NotAuthorizedError();
    }
    if (!requester.institution) {
        throw new medlink_common_1.BadRequestError('Student institution is required to fetch results');
    }
    const attempts = await ExamAttempt_1.ExamAttempt.find({
        studentId: requester.id,
        status: 'submitted',
    }).sort({ submittedAt: -1 });
    const examIds = [...new Set(attempts.map((attempt) => attempt.examId.toString()))];
    const exams = examIds.length
        ? await Exam_1.Exam.find({
            _id: { $in: examIds.map((examId) => new mongoose_1.Types.ObjectId(examId)) },
            institution: requester.institution,
        }).select({
            _id: 1,
            title: 1,
            course: 1,
            courseCode: 1,
        })
        : [];
    const examById = new Map(exams.map((exam) => [exam.id, exam]));
    const results = attempts
        .map((attempt) => {
        const exam = examById.get(attempt.examId.toString());
        if (!exam) {
            return null;
        }
        const finalScore = attempt.grading?.finalScore;
        return {
            attemptId: attempt.id,
            examId: attempt.examId.toString(),
            examTitle: exam.title,
            course: exam.course,
            courseCode: exam.courseCode ?? undefined,
            submittedAt: attempt.submittedAt?.toISOString(),
            submittedLate: attempt.submittedLate,
            integrityScore: attempt.integrityScore,
            grading: (0, grading_1.serializeAttemptGrading)(attempt.grading),
            resultStatus: (0, grading_1.getResultStatus)(finalScore),
        };
    })
        .filter((item) => item !== null);
    res.status(200).send({ results });
});
