"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCourseRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const medlink_common_1 = require("@danmusa/medlink-common");
const Course_1 = require("../models/Course");
const CourseRegistration_1 = require("../models/CourseRegistration");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.registerCourseRouter = router;
router.post('/api/exams/courses/:courseId/register', medlink_common_1.currentUser, medlink_common_1.requireAuth, [(0, express_validator_1.param)('courseId').isMongoId().withMessage('courseId must be a valid id')], medlink_common_1.validateRequest, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    if (requester.role !== 'student') {
        throw new medlink_common_1.NotAuthorizedError();
    }
    if (!requester.institution) {
        throw new medlink_common_1.BadRequestError('Student institution is required to register for a course');
    }
    const course = await Course_1.Course.findById(req.params.courseId);
    if (!course) {
        throw new medlink_common_1.NotFoundError();
    }
    if (course.institution !== requester.institution) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const existingRegistration = await CourseRegistration_1.CourseRegistration.findOne({
        courseId: course._id,
        studentId: requester.id,
    });
    if (existingRegistration) {
        return res.status(200).send({
            registration: {
                id: existingRegistration.id,
                courseId: course.id,
                studentId: existingRegistration.studentId,
                studentEmail: existingRegistration.studentEmail,
                studentFullName: existingRegistration.studentFullName,
                institution: existingRegistration.institution,
                registeredAt: existingRegistration.createdAt?.toISOString(),
            },
        });
    }
    const registration = CourseRegistration_1.CourseRegistration.build({
        courseId: course._id,
        studentId: requester.id,
        studentEmail: requester.email,
        studentFullName: requester.fullName ?? 'Student',
        institution: requester.institution,
    });
    await registration.save();
    res.status(201).send({
        registration: {
            id: registration.id,
            courseId: course.id,
            studentId: registration.studentId,
            studentEmail: registration.studentEmail,
            studentFullName: registration.studentFullName,
            institution: registration.institution,
            registeredAt: registration.createdAt?.toISOString(),
        },
    });
});
