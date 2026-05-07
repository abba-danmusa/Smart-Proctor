"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProctoringEventsRouter = void 0;
const express_1 = __importDefault(require("express"));
const mongoose_1 = require("mongoose");
const medlink_common_1 = require("@danmusa/medlink-common");
const Exam_1 = require("../models/Exam");
const ProctoringEvent_1 = require("../models/ProctoringEvent");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.listProctoringEventsRouter = router;
function asPositiveInteger(value, fallbackValue, maxValue) {
    if (typeof value !== 'string') {
        return fallbackValue;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallbackValue;
    }
    return Math.min(parsed, maxValue);
}
router.get('/api/exams/proctoring/events', medlink_common_1.currentUser, medlink_common_1.requireAuth, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    if (requester.role !== 'lecturer') {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const filter = {
        lecturerId: requester.id,
    };
    if (requester.institution) {
        filter.institution = requester.institution;
    }
    const examIdFromQuery = typeof req.query.examId === 'string' ? req.query.examId.trim() : undefined;
    if (examIdFromQuery) {
        if (!mongoose_1.Types.ObjectId.isValid(examIdFromQuery)) {
            throw new medlink_common_1.BadRequestError('examId must be a valid id');
        }
        filter.examId = new mongoose_1.Types.ObjectId(examIdFromQuery);
    }
    const studentIdFromQuery = typeof req.query.studentId === 'string' ? req.query.studentId.trim() : undefined;
    if (studentIdFromQuery) {
        filter.studentId = studentIdFromQuery;
    }
    const limit = asPositiveInteger(req.query.limit, 300, 1000);
    const events = await ProctoringEvent_1.ProctoringEvent.find(filter).sort({ detectedAt: -1 }).limit(limit);
    const examIds = [...new Set(events.map((event) => event.examId.toString()))];
    const exams = examIds.length
        ? await Exam_1.Exam.find({ _id: { $in: examIds.map((examId) => new mongoose_1.Types.ObjectId(examId)) } }).select({
            _id: 1,
            title: 1,
            course: 1,
            courseCode: 1,
        })
        : [];
    const examById = new Map(exams.map((exam) => [exam.id, exam]));
    res.status(200).send({
        events: events.map((event) => {
            const eventExam = examById.get(event.examId.toString());
            return {
                id: event.id,
                examId: event.examId.toString(),
                examTitle: eventExam?.title ?? 'Exam',
                examCourse: eventExam?.course ?? undefined,
                examCourseCode: eventExam?.courseCode ?? undefined,
                attemptId: event.attemptId?.toString(),
                studentId: event.studentId,
                studentEmail: event.studentEmail,
                studentFullName: event.studentFullName ?? undefined,
                eventType: event.eventType,
                severity: event.severity,
                message: event.message,
                evidence: event.evidence,
                detectedAt: event.detectedAt.toISOString(),
            };
        }),
    });
});
