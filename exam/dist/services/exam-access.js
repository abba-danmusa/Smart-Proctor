"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findExamForLecturerAccess = findExamForLecturerAccess;
const mongoose_1 = require("mongoose");
const medlink_common_1 = require("@danmusa/medlink-common");
const Exam_1 = require("../models/Exam");
async function findExamForLecturerAccess(examId, requester) {
    const normalizedExamId = examId.trim();
    if (!mongoose_1.Types.ObjectId.isValid(normalizedExamId)) {
        throw new medlink_common_1.BadRequestError('examId must be a valid id');
    }
    const exam = await Exam_1.Exam.findById(normalizedExamId);
    if (!exam) {
        throw new medlink_common_1.NotFoundError();
    }
    if (!['lecturer', 'admin'].includes(requester.role)) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    if (requester.role === 'lecturer' && exam.createdBy.id !== requester.id) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    if (requester.institution && requester.institution !== exam.institution) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    return exam;
}
