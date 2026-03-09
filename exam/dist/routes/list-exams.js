"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExamsRouter = void 0;
const express_1 = __importDefault(require("express"));
const medlink_common_1 = require("@danmusa/medlink-common");
const Exam_1 = require("../models/Exam");
const ExamAttempt_1 = require("../models/ExamAttempt");
const exam_status_1 = require("../services/exam-status");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.listExamsRouter = router;
router.get('/api/exams', medlink_common_1.currentUser, medlink_common_1.requireAuth, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    const query = {};
    if (requester.role === 'lecturer') {
        query['createdBy.id'] = requester.id;
    }
    if (requester.role === 'student') {
        if (!requester.institution) {
            throw new medlink_common_1.BadRequestError('Student institution is required to fetch exams');
        }
        query.institution = requester.institution;
    }
    const exams = await Exam_1.Exam.find(query).sort({ startAt: 1 });
    const examObjectIds = exams.map((exam) => exam._id);
    const attemptCountByExam = new Map();
    const submittedCountByExam = new Map();
    const studentAttemptByExam = new Map();
    if (examObjectIds.length > 0) {
        const attempts = await ExamAttempt_1.ExamAttempt.find({ examId: { $in: examObjectIds } });
        for (const attempt of attempts) {
            const examId = attempt.examId.toString();
            attemptCountByExam.set(examId, (attemptCountByExam.get(examId) ?? 0) + 1);
            if (attempt.status === 'submitted') {
                submittedCountByExam.set(examId, (submittedCountByExam.get(examId) ?? 0) + 1);
            }
            if (requester.role === 'student' && attempt.studentId === requester.id) {
                studentAttemptByExam.set(examId, attempt);
            }
        }
    }
    const now = new Date();
    const response = exams.map((exam) => {
        const lifecycleStatus = (0, exam_status_1.getExamLifecycleStatus)(exam, now);
        const attemptCount = attemptCountByExam.get(exam.id) ?? 0;
        const submittedAttemptCount = submittedCountByExam.get(exam.id) ?? 0;
        if (requester.role === 'student') {
            const studentAttempt = studentAttemptByExam.get(exam.id);
            return {
                id: exam.id,
                title: exam.title,
                course: exam.course,
                courseCode: exam.courseCode ?? undefined,
                courseType: exam.courseType ?? undefined,
                durationMinutes: exam.durationMinutes,
                startAt: exam.startAt.toISOString(),
                endAt: exam.endAt.toISOString(),
                instructions: exam.instructions ?? undefined,
                questionCount: exam.questions.length,
                institution: exam.institution,
                status: lifecycleStatus,
                studentStatus: (0, exam_status_1.getStudentExamStatus)(lifecycleStatus, studentAttempt?.status ?? null),
                attemptId: studentAttempt?.id,
                attemptStatus: studentAttempt?.status,
                proctoring: exam.proctoring,
                createdBy: exam.createdBy,
            };
        }
        return {
            id: exam.id,
            title: exam.title,
            course: exam.course,
            courseCode: exam.courseCode ?? undefined,
            courseType: exam.courseType ?? undefined,
            durationMinutes: exam.durationMinutes,
            startAt: exam.startAt.toISOString(),
            endAt: exam.endAt.toISOString(),
            instructions: exam.instructions ?? undefined,
            questionCount: exam.questions.length,
            institution: exam.institution,
            status: lifecycleStatus,
            attemptCount,
            submittedAttemptCount,
            proctoring: exam.proctoring,
            createdBy: exam.createdBy,
        };
    });
    res.status(200).send({ exams: response });
});
