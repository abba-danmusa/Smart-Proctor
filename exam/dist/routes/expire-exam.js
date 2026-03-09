"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expireExamRouter = void 0;
const express_1 = __importDefault(require("express"));
const medlink_common_1 = require("@danmusa/medlink-common");
const Exam_1 = require("../models/Exam");
const ExamAttempt_1 = require("../models/ExamAttempt");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.expireExamRouter = router;
router.post('/api/exams/:examId/expire', medlink_common_1.currentUser, medlink_common_1.requireAuth, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    if (!['lecturer', 'admin'].includes(requester.role)) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const exam = await Exam_1.Exam.findById(req.params.examId);
    if (!exam) {
        throw new medlink_common_1.NotFoundError();
    }
    if (requester.role === 'lecturer' && exam.createdBy.id !== requester.id) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const now = new Date();
    exam.forceExpiredAt = now;
    await exam.save();
    await ExamAttempt_1.ExamAttempt.updateMany({
        examId: exam._id,
        status: 'in_progress',
    }, {
        $set: {
            status: 'expired',
        },
    });
    res.status(200).send({
        exam: {
            id: exam.id,
            title: exam.title,
            status: 'expired',
            forceExpiredAt: exam.forceExpiredAt?.toISOString(),
        },
    });
});
