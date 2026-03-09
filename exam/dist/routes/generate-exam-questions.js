"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateExamQuestionsRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const medlink_common_1 = require("@danmusa/medlink-common");
const Course_1 = require("../models/Course");
const question_generator_1 = require("../services/question-generator");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.generateExamQuestionsRouter = router;
const QUESTION_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const COURSE_TYPES = new Set(['core', 'elective']);
function asOptionalTrimmedString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
function normalizeTopics(value) {
    if (!Array.isArray(value)) {
        throw new medlink_common_1.BadRequestError('topics must be an array of strings');
    }
    const normalizedTopics = value
        .map((topic) => (typeof topic === 'string' ? topic.trim() : ''))
        .filter((topic) => topic.length > 0);
    if (normalizedTopics.length === 0) {
        throw new medlink_common_1.BadRequestError('At least one valid topic is required');
    }
    const uniqueTopics = [...new Set(normalizedTopics)];
    if (uniqueTopics.length > 25) {
        throw new medlink_common_1.BadRequestError('topics cannot exceed 25 entries');
    }
    return uniqueTopics;
}
router.post('/api/exams/questions/generate', medlink_common_1.currentUser, medlink_common_1.requireAuth, [
    (0, express_validator_1.body)('courseId').optional({ values: 'falsy' }).isMongoId().withMessage('courseId must be a valid id'),
    (0, express_validator_1.body)('courseCode')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 32 })
        .withMessage('courseCode must be between 2 and 32 characters')
        .matches(/^[A-Za-z0-9-]+$/)
        .withMessage('courseCode can only include letters, numbers, and hyphens'),
    (0, express_validator_1.body)('courseTitle')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 120 })
        .withMessage('courseTitle must be between 2 and 120 characters'),
    (0, express_validator_1.body)('courseType')
        .optional({ values: 'falsy' })
        .trim()
        .toLowerCase()
        .isIn(['core', 'elective'])
        .withMessage('courseType must be either core or elective'),
    (0, express_validator_1.body)('examTitle')
        .trim()
        .isLength({ min: 3, max: 120 })
        .withMessage('examTitle must be between 3 and 120 characters'),
    (0, express_validator_1.body)('instructions')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('instructions must be between 10 and 1000 characters'),
    (0, express_validator_1.body)('numberOfQuestions')
        .isInt({ min: 1, max: 100 })
        .withMessage('numberOfQuestions must be between 1 and 100'),
    (0, express_validator_1.body)('difficulty')
        .trim()
        .toLowerCase()
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('difficulty must be one of easy, medium, hard'),
    (0, express_validator_1.body)('topics').isArray({ min: 1, max: 25 }).withMessage('topics must contain between 1 and 25 entries'),
    (0, express_validator_1.body)('topics.*')
        .trim()
        .isLength({ min: 2, max: 80 })
        .withMessage('each topic must be between 2 and 80 characters'),
    (0, express_validator_1.body)().custom((payload) => {
        const hasCourseId = typeof payload.courseId === 'string' && payload.courseId.trim().length > 0;
        const hasCourseCode = typeof payload.courseCode === 'string' && payload.courseCode.trim().length > 0;
        const hasCourseTitle = typeof payload.courseTitle === 'string' && payload.courseTitle.trim().length > 0;
        if (!hasCourseId && !(hasCourseCode && hasCourseTitle)) {
            throw new Error('Provide either courseId or both courseCode and courseTitle');
        }
        return true;
    }),
], medlink_common_1.validateRequest, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    if (!['lecturer', 'admin'].includes(requester.role)) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const topics = normalizeTopics(req.body.topics);
    const difficulty = String(req.body.difficulty).trim().toLowerCase();
    if (!QUESTION_DIFFICULTIES.has(difficulty)) {
        throw new medlink_common_1.BadRequestError('difficulty must be one of easy, medium, hard');
    }
    const requestedCourseId = asOptionalTrimmedString(req.body.courseId);
    let resolvedCourseId;
    let resolvedCourseCode = '';
    let resolvedCourseTitle = '';
    let resolvedCourseType;
    let resolvedInstitution = requester.institution;
    if (requestedCourseId) {
        const course = await Course_1.Course.findById(requestedCourseId);
        if (!course) {
            throw new medlink_common_1.NotFoundError();
        }
        if (requester.role === 'lecturer' && course.createdBy.id !== requester.id) {
            throw new medlink_common_1.NotAuthorizedError();
        }
        if (requester.institution && requester.institution !== course.institution) {
            throw new medlink_common_1.NotAuthorizedError();
        }
        resolvedCourseId = course.id;
        resolvedCourseCode = course.code;
        resolvedCourseTitle = course.title;
        resolvedCourseType = course.type;
        resolvedInstitution = course.institution;
    }
    else {
        resolvedCourseCode = String(req.body.courseCode).trim().toUpperCase();
        resolvedCourseTitle = String(req.body.courseTitle).trim();
        const maybeCourseType = asOptionalTrimmedString(req.body.courseType);
        if (maybeCourseType) {
            const normalizedType = maybeCourseType.toLowerCase();
            if (!COURSE_TYPES.has(normalizedType)) {
                throw new medlink_common_1.BadRequestError('courseType must be either core or elective');
            }
            resolvedCourseType = normalizedType;
        }
    }
    const examTitle = String(req.body.examTitle).trim();
    const instructions = String(req.body.instructions).trim();
    const numberOfQuestions = Number(req.body.numberOfQuestions);
    const questions = (0, question_generator_1.generateExamQuestions)({
        courseCode: resolvedCourseCode,
        courseTitle: resolvedCourseTitle,
        examTitle,
        instructions,
        topics,
        numberOfQuestions,
        difficulty,
    });
    res.status(200).send({
        generation: {
            course: {
                id: resolvedCourseId,
                code: resolvedCourseCode,
                title: resolvedCourseTitle,
                type: resolvedCourseType,
                institution: resolvedInstitution,
            },
            examTitle,
            instructions,
            numberOfQuestions,
            difficulty,
            topics,
            questions,
        },
    });
});
