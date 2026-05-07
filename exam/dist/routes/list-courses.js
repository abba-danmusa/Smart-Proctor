"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCoursesRouter = void 0;
const express_1 = __importDefault(require("express"));
const medlink_common_1 = require("@danmusa/medlink-common");
const Course_1 = require("../models/Course");
const CourseRegistration_1 = require("../models/CourseRegistration");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.listCoursesRouter = router;
router.get('/api/exams/courses', medlink_common_1.currentUser, medlink_common_1.requireAuth, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    if (!['lecturer', 'admin', 'student'].includes(requester.role)) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const query = {};
    if (requester.role === 'lecturer') {
        query['createdBy.id'] = requester.id;
    }
    if (requester.role === 'student' && !requester.institution) {
        throw new medlink_common_1.BadRequestError('Student institution is required to fetch courses');
    }
    if (requester.institution) {
        query.institution = requester.institution;
    }
    const courses = await Course_1.Course.find(query).sort({ title: 1, code: 1 });
    const registrationCreatedAtByCourseId = new Map();
    if (requester.role === 'student' && courses.length > 0) {
        const registrations = await CourseRegistration_1.CourseRegistration.find({
            studentId: requester.id,
            courseId: { $in: courses.map((course) => course._id) },
        }).select({ courseId: 1, createdAt: 1 });
        for (const registration of registrations) {
            const createdAt = registration.createdAt;
            if (createdAt) {
                registrationCreatedAtByCourseId.set(registration.courseId.toString(), createdAt);
            }
        }
    }
    res.status(200).send({
        courses: courses.map((course) => {
            const payload = {
                id: course.id,
                code: course.code,
                title: course.title,
                type: course.type,
                description: course.description ?? undefined,
                department: course.department ?? undefined,
                level: course.level ?? undefined,
                institution: course.institution,
                createdBy: course.createdBy,
            };
            if (requester.role !== 'student') {
                return payload;
            }
            const registrationCreatedAt = registrationCreatedAtByCourseId.get(course.id);
            return {
                ...payload,
                isRegistered: Boolean(registrationCreatedAt),
                registeredAt: registrationCreatedAt?.toISOString(),
            };
        }),
    });
});
