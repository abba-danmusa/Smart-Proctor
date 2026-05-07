"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProctoringEvent = void 0;
const mongoose_1 = require("mongoose");
const proctoringEventSchema = new mongoose_1.Schema({
    examId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true,
    },
    attemptId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'ExamAttempt',
        default: null,
    },
    lecturerId: {
        type: String,
        required: true,
        index: true,
    },
    institution: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 160,
        index: true,
    },
    studentId: {
        type: String,
        required: true,
        index: true,
    },
    studentEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    studentFullName: {
        type: String,
        trim: true,
        maxlength: 160,
    },
    eventType: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        minlength: 2,
        maxlength: 80,
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true,
        default: 'medium',
    },
    message: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 500,
    },
    evidence: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    detectedAt: {
        type: Date,
        required: true,
        default: () => new Date(),
        index: true,
    },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            ret.id = ret._id;
            ret.examId = ret.examId?.toString?.() ?? ret.examId;
            ret.attemptId = ret.attemptId?.toString?.() ?? ret.attemptId;
            delete ret._id;
        },
        versionKey: false,
    },
});
proctoringEventSchema.index({ lecturerId: 1, detectedAt: -1 });
proctoringEventSchema.index({ examId: 1, studentId: 1, detectedAt: -1 });
proctoringEventSchema.statics.build = function (attrs) {
    return new this(attrs);
};
const ProctoringEvent = (0, mongoose_1.model)('ProctoringEvent', proctoringEventSchema);
exports.ProctoringEvent = ProctoringEvent;
