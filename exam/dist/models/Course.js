"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Course = void 0;
const mongoose_1 = require("mongoose");
const courseSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        minlength: 2,
        maxlength: 32,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 120,
    },
    type: {
        type: String,
        required: true,
        enum: ['core', 'elective'],
        lowercase: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 800,
        default: null,
    },
    department: {
        type: String,
        trim: true,
        maxlength: 120,
        default: null,
    },
    level: {
        type: String,
        trim: true,
        maxlength: 40,
        default: null,
    },
    institution: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 160,
    },
    createdBy: {
        id: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        fullName: {
            type: String,
            required: true,
        },
    },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            ret.id = ret._id;
            delete ret._id;
        },
        versionKey: false,
    },
});
courseSchema.index({ institution: 1, code: 1 }, { unique: true });
courseSchema.index({ 'createdBy.id': 1, createdAt: -1 });
courseSchema.statics.build = function (attrs) {
    return new this(attrs);
};
const Course = (0, mongoose_1.model)('Course', courseSchema);
exports.Course = Course;
