"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportProctoringEventRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const medlink_common_1 = require("@danmusa/medlink-common");
const Exam_1 = require("../models/Exam");
const ExamAttempt_1 = require("../models/ExamAttempt");
const ProctoringEvent_1 = require("../models/ProctoringEvent");
const exam_status_1 = require("../services/exam-status");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.reportProctoringEventRouter = router;
router.post('/api/exams/:examId/proctoring/events', medlink_common_1.currentUser, medlink_common_1.requireAuth, [
    (0, express_validator_1.body)('eventType').trim().isLength({ min: 2, max: 80 }).withMessage('eventType must be between 2 and 80 characters'),
    (0, express_validator_1.body)('severity')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('severity must be one of low, medium, high'),
    (0, express_validator_1.body)('message').trim().isLength({ min: 3, max: 500 }).withMessage('message must be between 3 and 500 characters'),
    (0, express_validator_1.body)('detectedAt').optional().isISO8601().withMessage('detectedAt must be a valid ISO8601 date'),
    (0, express_validator_1.body)('evidence')
        .optional()
        .custom((value) => value !== null && typeof value === 'object' && !Array.isArray(value))
        .withMessage('evidence must be an object'),
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
    const examStatus = (0, exam_status_1.getExamLifecycleStatus)(exam);
    if (examStatus !== 'live') {
        throw new medlink_common_1.BadRequestError('Proctoring events can only be reported while the exam is live');
    }
    const attempt = await ExamAttempt_1.ExamAttempt.findOne({
        examId: exam._id,
        studentId: requester.id,
    });
    if (!attempt) {
        throw new medlink_common_1.BadRequestError('No attempt found for this exam');
    }
    if (attempt.status !== 'in_progress') {
        throw new medlink_common_1.BadRequestError('Attempt is not active');
    }
    const detectedAt = req.body.detectedAt ? new Date(req.body.detectedAt) : new Date();
    const event = ProctoringEvent_1.ProctoringEvent.build({
        examId: exam._id,
        attemptId: attempt._id,
        lecturerId: exam.createdBy.id,
        institution: exam.institution,
        studentId: requester.id,
        studentEmail: requester.email,
        studentFullName: requester.fullName,
        eventType: String(req.body.eventType).trim().toLowerCase(),
        severity: req.body.severity ?? 'medium',
        message: String(req.body.message).trim(),
        evidence: req.body.evidence && typeof req.body.evidence === 'object' && !Array.isArray(req.body.evidence)
            ? req.body.evidence
            : undefined,
        detectedAt,
    });
    await event.save();
    res.status(201).send({
        event: {
            id: event.id,
            examId: event.examId.toString(),
            attemptId: event.attemptId?.toString(),
            eventType: event.eventType,
            severity: event.severity,
            message: event.message,
            evidence: event.evidence,
            detectedAt: event.detectedAt.toISOString(),
        },
    });
});
