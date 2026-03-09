"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExamRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const medlink_common_1 = require("@danmusa/medlink-common");
const Course_1 = require("../models/Course");
const Exam_1 = require("../models/Exam");
const requester_context_1 = require("../services/requester-context");
const exam_status_1 = require("../services/exam-status");
const router = express_1.default.Router();
exports.createExamRouter = router;
const COURSE_TYPES = new Set(['core', 'elective']);
const QUESTION_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
function asOptionalTrimmedString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
function parseCourseType(value) {
    const rawValue = asOptionalTrimmedString(value);
    if (!rawValue) {
        return undefined;
    }
    const normalized = rawValue.toLowerCase();
    if (!COURSE_TYPES.has(normalized)) {
        throw new medlink_common_1.BadRequestError('courseType must be either core or elective');
    }
    return normalized;
}
function parseQuestions(value) {
    if (typeof value === 'undefined') {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new medlink_common_1.BadRequestError('questions must be an array');
    }
    if (value.length === 0 || value.length > 200) {
        throw new medlink_common_1.BadRequestError('questions must contain between 1 and 200 entries');
    }
    return value.map((question, index) => {
        if (!question || typeof question !== 'object' || Array.isArray(question)) {
            throw new medlink_common_1.BadRequestError('Each question must be an object');
        }
        const questionRecord = question;
        const prompt = asOptionalTrimmedString(questionRecord.prompt);
        const topic = asOptionalTrimmedString(questionRecord.topic);
        const answer = asOptionalTrimmedString(questionRecord.answer);
        const explanation = asOptionalTrimmedString(questionRecord.explanation);
        if (!prompt || prompt.length < 8 || prompt.length > 600) {
            throw new medlink_common_1.BadRequestError('Each question prompt must be between 8 and 600 characters');
        }
        if (!topic || topic.length < 2 || topic.length > 80) {
            throw new medlink_common_1.BadRequestError('Each question topic must be between 2 and 80 characters');
        }
        if (!answer || answer.length < 2 || answer.length > 240) {
            throw new medlink_common_1.BadRequestError('Each question answer must be between 2 and 240 characters');
        }
        if (!explanation || explanation.length < 2 || explanation.length > 1000) {
            throw new medlink_common_1.BadRequestError('Each question explanation must be between 2 and 1000 characters');
        }
        if (!Array.isArray(questionRecord.options)) {
            throw new medlink_common_1.BadRequestError('Each question options value must be an array');
        }
        const options = questionRecord.options
            .map((option) => (typeof option === 'string' ? option.trim() : ''))
            .filter((option) => option.length > 0);
        if (options.length < 2 || options.length > 6) {
            throw new medlink_common_1.BadRequestError('Each question must provide between 2 and 6 options');
        }
        if (!options.includes(answer)) {
            throw new medlink_common_1.BadRequestError('Each question answer must match one of the options');
        }
        const rawDifficulty = asOptionalTrimmedString(questionRecord.difficulty)?.toLowerCase();
        if (!rawDifficulty || !QUESTION_DIFFICULTIES.has(rawDifficulty)) {
            throw new medlink_common_1.BadRequestError('Each question difficulty must be one of easy, medium, hard');
        }
        const questionNumberFromBody = questionRecord.questionNumber;
        const parsedQuestionNumber = typeof questionNumberFromBody === 'number' && Number.isInteger(questionNumberFromBody) && questionNumberFromBody > 0
            ? questionNumberFromBody
            : index + 1;
        return {
            questionNumber: parsedQuestionNumber,
            topic,
            difficulty: rawDifficulty,
            prompt,
            options,
            answer,
            explanation,
        };
    });
}
function parseQuestionGeneration(value, questions) {
    if (typeof value === 'undefined' || value === null) {
        if (questions.length === 0) {
            return undefined;
        }
        return {
            numberOfQuestions: questions.length,
            difficulty: questions[0].difficulty,
            topics: [...new Set(questions.map((question) => question.topic))],
        };
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new medlink_common_1.BadRequestError('questionGeneration must be an object');
    }
    const generation = value;
    const numberOfQuestions = generation.numberOfQuestions;
    if (typeof numberOfQuestions !== 'number' || !Number.isInteger(numberOfQuestions) || numberOfQuestions < 1 || numberOfQuestions > 100) {
        throw new medlink_common_1.BadRequestError('questionGeneration.numberOfQuestions must be between 1 and 100');
    }
    const difficulty = asOptionalTrimmedString(generation.difficulty)?.toLowerCase();
    if (!difficulty || !QUESTION_DIFFICULTIES.has(difficulty)) {
        throw new medlink_common_1.BadRequestError('questionGeneration.difficulty must be one of easy, medium, hard');
    }
    if (!Array.isArray(generation.topics)) {
        throw new medlink_common_1.BadRequestError('questionGeneration.topics must be an array');
    }
    const topics = generation.topics
        .map((topic) => (typeof topic === 'string' ? topic.trim() : ''))
        .filter((topic) => topic.length > 0);
    if (topics.length === 0 || topics.length > 25) {
        throw new medlink_common_1.BadRequestError('questionGeneration.topics must contain between 1 and 25 entries');
    }
    if (questions.length > 0 && numberOfQuestions !== questions.length) {
        throw new medlink_common_1.BadRequestError('questionGeneration.numberOfQuestions must equal questions length');
    }
    return {
        numberOfQuestions,
        difficulty,
        topics: [...new Set(topics)],
    };
}
router.post('/api/exams', medlink_common_1.currentUser, medlink_common_1.requireAuth, [
    (0, express_validator_1.body)('courseId').optional({ values: 'falsy' }).isMongoId().withMessage('courseId must be a valid id'),
    (0, express_validator_1.body)('title')
        .trim()
        .isLength({ min: 3, max: 120 })
        .withMessage('Title must be between 3 and 120 characters'),
    (0, express_validator_1.body)('course')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 120 })
        .withMessage('Course must be between 2 and 120 characters'),
    (0, express_validator_1.body)('courseCode')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 2, max: 32 })
        .withMessage('courseCode must be between 2 and 32 characters')
        .matches(/^[A-Za-z0-9-]+$/)
        .withMessage('courseCode can only include letters, numbers, and hyphens'),
    (0, express_validator_1.body)('courseType')
        .optional({ values: 'falsy' })
        .trim()
        .toLowerCase()
        .isIn(['core', 'elective'])
        .withMessage('courseType must be either core or elective'),
    (0, express_validator_1.body)('instructions')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('instructions must be between 10 and 1000 characters'),
    (0, express_validator_1.body)('durationMinutes')
        .isInt({ min: 1, max: 720 })
        .withMessage('durationMinutes must be between 1 and 720'),
    (0, express_validator_1.body)('startAt').isISO8601().withMessage('startAt must be a valid ISO date-time'),
    (0, express_validator_1.body)('endAt').isISO8601().withMessage('endAt must be a valid ISO date-time'),
    (0, express_validator_1.body)('proctoring.faceVerification').isBoolean().withMessage('proctoring.faceVerification must be a boolean'),
    (0, express_validator_1.body)('proctoring.tabSwitchDetection').isBoolean().withMessage('proctoring.tabSwitchDetection must be a boolean'),
    (0, express_validator_1.body)('proctoring.soundDetection').isBoolean().withMessage('proctoring.soundDetection must be a boolean'),
    (0, express_validator_1.body)('proctoring.multipleFaceDetection').isBoolean().withMessage('proctoring.multipleFaceDetection must be a boolean'),
    (0, express_validator_1.body)('questions').optional().isArray({ min: 1, max: 200 }).withMessage('questions must contain between 1 and 200 entries'),
    (0, express_validator_1.body)('questionGeneration').optional().isObject().withMessage('questionGeneration must be an object'),
    (0, express_validator_1.body)().custom((payload) => {
        const startAt = new Date(payload.startAt);
        const endAt = new Date(payload.endAt);
        if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
            throw new Error('Exam dates are invalid');
        }
        if (endAt <= startAt) {
            throw new Error('endAt must be later than startAt');
        }
        const hasCourseId = typeof payload.courseId === 'string' && payload.courseId.trim().length > 0;
        const hasCourseTitle = typeof payload.course === 'string' && payload.course.trim().length > 0;
        if (!hasCourseId && !hasCourseTitle) {
            throw new Error('Provide either courseId or course title in course field');
        }
        return true;
    }),
], medlink_common_1.validateRequest, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    if (!['lecturer', 'admin'].includes(requester.role)) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const institutionFromBody = asOptionalTrimmedString(req.body.institution);
    let institution = requester.institution ?? institutionFromBody;
    if (!institution) {
        throw new medlink_common_1.BadRequestError('Institution is required to create an exam');
    }
    const courseId = asOptionalTrimmedString(req.body.courseId);
    let course = asOptionalTrimmedString(req.body.course);
    let courseCode = asOptionalTrimmedString(req.body.courseCode)?.toUpperCase();
    let courseType = parseCourseType(req.body.courseType);
    if (courseId) {
        const existingCourse = await Course_1.Course.findById(courseId);
        if (!existingCourse) {
            throw new medlink_common_1.NotFoundError();
        }
        if (requester.role === 'lecturer' && existingCourse.createdBy.id !== requester.id) {
            throw new medlink_common_1.NotAuthorizedError();
        }
        if (requester.institution && requester.institution !== existingCourse.institution) {
            throw new medlink_common_1.NotAuthorizedError();
        }
        institution = existingCourse.institution;
        course = existingCourse.title;
        courseCode = existingCourse.code;
        courseType = existingCourse.type;
    }
    if (!course) {
        throw new medlink_common_1.BadRequestError('Course title is required');
    }
    const questions = parseQuestions(req.body.questions);
    const questionGeneration = parseQuestionGeneration(req.body.questionGeneration, questions);
    const exam = Exam_1.Exam.build({
        title: String(req.body.title).trim(),
        course,
        courseCode,
        courseType,
        durationMinutes: Number(req.body.durationMinutes),
        startAt: new Date(req.body.startAt),
        endAt: new Date(req.body.endAt),
        instructions: asOptionalTrimmedString(req.body.instructions),
        questions,
        questionGeneration,
        institution,
        createdBy: {
            id: requester.id,
            email: requester.email,
            fullName: requester.fullName ?? 'Lecturer',
        },
        proctoring: {
            faceVerification: Boolean(req.body.proctoring.faceVerification),
            tabSwitchDetection: Boolean(req.body.proctoring.tabSwitchDetection),
            soundDetection: Boolean(req.body.proctoring.soundDetection),
            multipleFaceDetection: Boolean(req.body.proctoring.multipleFaceDetection),
        },
    });
    await exam.save();
    const status = (0, exam_status_1.getExamLifecycleStatus)(exam);
    res.status(201).send({
        exam: {
            id: exam.id,
            title: exam.title,
            course: exam.course,
            courseCode: exam.courseCode ?? undefined,
            courseType: exam.courseType ?? undefined,
            durationMinutes: exam.durationMinutes,
            startAt: exam.startAt.toISOString(),
            endAt: exam.endAt.toISOString(),
            instructions: exam.instructions ?? undefined,
            questionCount: exam.questions.length,
            questions: exam.questions,
            questionGeneration: exam.questionGeneration,
            institution: exam.institution,
            proctoring: exam.proctoring,
            createdBy: exam.createdBy,
            status,
        },
    });
});
