"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamAttempt = void 0;
const mongoose_1 = require("mongoose");
const examAttemptSchema = new mongoose_1.Schema({
    examId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
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
    },
    studentFullName: {
        type: String,
    },
    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'expired'],
        default: 'in_progress',
        required: true,
    },
    startedAt: {
        type: Date,
        required: true,
        default: () => new Date(),
    },
    submittedAt: {
        type: Date,
    },
    submittedLate: {
        type: Boolean,
        default: false,
    },
    integrityScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    answers: {
        type: mongoose_1.Schema.Types.Mixed,
    },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            ret.id = ret._id;
            ret.examId = ret.examId?.toString?.() ?? ret.examId;
            delete ret._id;
        },
        versionKey: false,
    },
});
examAttemptSchema.index({ examId: 1, studentId: 1 }, { unique: true });
examAttemptSchema.statics.build = function (attrs) {
    return new this(attrs);
};
const ExamAttempt = (0, mongoose_1.model)('ExamAttempt', examAttemptSchema);
exports.ExamAttempt = ExamAttempt;
