"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCourseRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const medlink_common_1 = require("@danmusa/medlink-common");
const Course_1 = require("../models/Course");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.createCourseRouter = router;
const COURSE_TYPES = new Set(['core', 'elective']);
function asOptionalTrimmedString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
router.post('/api/exams/courses', medlink_common_1.currentUser, medlink_common_1.requireAuth, [
    (0, express_validator_1.body)('code')
        .trim()
        .isLength({ min: 2, max: 32 })
        .withMessage('Course code must be between 2 and 32 characters')
        .matches(/^[A-Za-z0-9-]+$/)
        .withMessage('Course code can only include letters, numbers, and hyphens'),
    (0, express_validator_1.body)('title')
        .trim()
        .isLength({ min: 2, max: 120 })
        .withMessage('Course title must be between 2 and 120 characters'),
    (0, express_validator_1.body)('type')
        .trim()
        .toLowerCase()
        .isIn(['core', 'elective'])
        .withMessage('Course type must be either core or elective'),
    (0, express_validator_1.body)('description')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 800 })
        .withMessage('Course description must be 800 characters or fewer'),
    (0, express_validator_1.body)('department')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 120 })
        .withMessage('Department must be between 2 and 120 characters'),
    (0, express_validator_1.body)('level')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 1, max: 40 })
        .withMessage('Level must be between 1 and 40 characters'),
    (0, express_validator_1.body)('institution')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 160 })
        .withMessage('Institution must be between 2 and 160 characters'),
], medlink_common_1.validateRequest, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    if (!['lecturer', 'admin'].includes(requester.role)) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const institution = requester.institution ?? asOptionalTrimmedString(req.body.institution);
    if (!institution) {
        throw new medlink_common_1.BadRequestError('Institution is required to create a course');
    }
    const type = String(req.body.type).trim().toLowerCase();
    if (!COURSE_TYPES.has(type)) {
        throw new medlink_common_1.BadRequestError('Course type must be either core or elective');
    }
    const code = String(req.body.code).trim().toUpperCase();
    const existingCourse = await Course_1.Course.findOne({ institution, code });
    if (existingCourse) {
        throw new medlink_common_1.BadRequestError('Course code already exists for this institution');
    }
    const course = Course_1.Course.build({
        code,
        title: String(req.body.title).trim(),
        type,
        description: asOptionalTrimmedString(req.body.description),
        department: asOptionalTrimmedString(req.body.department),
        level: asOptionalTrimmedString(req.body.level),
        institution,
        createdBy: {
            id: requester.id,
            email: requester.email,
            fullName: requester.fullName ?? 'Lecturer',
        },
    });
    await course.save();
    res.status(201).send({
        course: {
            id: course.id,
            code: course.code,
            title: course.title,
            type: course.type,
            description: course.description ?? undefined,
            department: course.department ?? undefined,
            level: course.level ?? undefined,
            institution: course.institution,
            createdBy: course.createdBy,
        },
    });
});
