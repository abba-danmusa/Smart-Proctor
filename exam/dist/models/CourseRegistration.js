"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseRegistration = void 0;
const mongoose_1 = require("mongoose");
const courseRegistrationSchema = new mongoose_1.Schema({
    courseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'Course',
    },
    studentId: {
        type: String,
        required: true,
    },
    studentEmail: {
        type: String,
        required: true,
    },
    studentFullName: {
        type: String,
        required: true,
    },
    institution: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 160,
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
courseRegistrationSchema.index({ courseId: 1, studentId: 1 }, { unique: true });
courseRegistrationSchema.index({ studentId: 1, createdAt: -1 });
courseRegistrationSchema.statics.build = function (attrs) {
    return new this(attrs);
};
const CourseRegistration = (0, mongoose_1.model)('CourseRegistration', courseRegistrationSchema);
exports.CourseRegistration = CourseRegistration;
