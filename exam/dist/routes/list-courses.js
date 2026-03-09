"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCoursesRouter = void 0;
const express_1 = __importDefault(require("express"));
const medlink_common_1 = require("@danmusa/medlink-common");
const Course_1 = require("../models/Course");
const requester_context_1 = require("../services/requester-context");
const router = express_1.default.Router();
exports.listCoursesRouter = router;
router.get('/api/exams/courses', medlink_common_1.currentUser, medlink_common_1.requireAuth, async (req, res) => {
    const requester = (0, requester_context_1.getRequesterContext)(req);
    if (!['lecturer', 'admin'].includes(requester.role)) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const query = {};
    if (requester.role === 'lecturer') {
        query['createdBy.id'] = requester.id;
    }
    if (requester.institution) {
        query.institution = requester.institution;
    }
    const courses = await Course_1.Course.find(query).sort({ title: 1, code: 1 });
    res.status(200).send({
        courses: courses.map((course) => ({
            id: course.id,
            code: course.code,
            title: course.title,
            type: course.type,
            description: course.description ?? undefined,
            department: course.department ?? undefined,
            level: course.level ?? undefined,
            institution: course.institution,
            createdBy: course.createdBy,
        })),
    });
});
