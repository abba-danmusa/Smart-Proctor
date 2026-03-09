"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
const buildExamPayload = (overrides = {}) => ({
    title: 'CSC 441 Midterm',
    course: 'Artificial Intelligence',
    durationMinutes: 120,
    startAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 150 * 60 * 1000).toISOString(),
    proctoring: {
        faceVerification: true,
        tabSwitchDetection: true,
        soundDetection: true,
        multipleFaceDetection: true,
    },
    ...overrides,
});
it('returns 401 when user is not authenticated', async () => {
    await (0, supertest_1.default)(app_1.app)
        .post('/api/exams')
        .send(buildExamPayload())
        .expect(401);
});
it('returns 401 when student attempts to create an exam', async () => {
    await (0, supertest_1.default)(app_1.app)
        .post('/api/exams')
        .set('Cookie', await global.signin({ role: 'student' }))
        .send(buildExamPayload())
        .expect(401);
});
it('creates an exam for lecturer with authenticated context', async () => {
    const response = await (0, supertest_1.default)(app_1.app)
        .post('/api/exams')
        .set('Cookie', await global.signin({
        role: 'lecturer',
        fullName: 'Lecturer One',
        institution: 'Riverside University',
        email: 'lecturer@test.com',
    }))
        .send(buildExamPayload())
        .expect(201);
    expect(response.body.exam.title).toEqual('CSC 441 Midterm');
    expect(response.body.exam.course).toEqual('Artificial Intelligence');
    expect(response.body.exam.institution).toEqual('Riverside University');
    expect(response.body.exam.createdBy.fullName).toEqual('Lecturer One');
    expect(response.body.exam.status).toEqual('scheduled');
});
it('returns 400 when exam window is invalid', async () => {
    const startAt = new Date(Date.now() + 120 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await (0, supertest_1.default)(app_1.app)
        .post('/api/exams')
        .set('Cookie', await global.signin({ role: 'lecturer' }))
        .send(buildExamPayload({ startAt, endAt }))
        .expect(400);
});
it('creates an exam using a courseId and generated questions payload', async () => {
    const lecturerCookie = await global.signin({
        role: 'lecturer',
        fullName: 'Lecturer Two',
        institution: 'Riverside University',
        email: 'lecturer-two@test.com',
    });
    const createCourseResponse = await (0, supertest_1.default)(app_1.app)
        .post('/api/exams/courses')
        .set('Cookie', lecturerCookie)
        .send({
        code: 'CSC-450',
        title: 'Advanced Algorithms',
        type: 'core',
        department: 'Computer Science',
        level: '400',
    })
        .expect(201);
    const generateResponse = await (0, supertest_1.default)(app_1.app)
        .post('/api/exams/questions/generate')
        .set('Cookie', lecturerCookie)
        .send({
        courseId: createCourseResponse.body.course.id,
        examTitle: 'CSC 450 Final',
        instructions: 'Answer every question and justify your selection briefly.',
        numberOfQuestions: 3,
        difficulty: 'medium',
        topics: ['Dynamic Programming', 'Graph Algorithms'],
    })
        .expect(200);
    const response = await (0, supertest_1.default)(app_1.app)
        .post('/api/exams')
        .set('Cookie', lecturerCookie)
        .send({
        ...buildExamPayload({
            title: 'CSC 450 Final',
            course: undefined,
        }),
        courseId: createCourseResponse.body.course.id,
        courseType: 'core',
        instructions: generateResponse.body.generation.instructions,
        questions: generateResponse.body.generation.questions,
        questionGeneration: {
            numberOfQuestions: generateResponse.body.generation.numberOfQuestions,
            difficulty: generateResponse.body.generation.difficulty,
            topics: generateResponse.body.generation.topics,
        },
    })
        .expect(201);
    expect(response.body.exam.course).toEqual('Advanced Algorithms');
    expect(response.body.exam.courseCode).toEqual('CSC-450');
    expect(response.body.exam.questionCount).toEqual(3);
    expect(response.body.exam.questions).toHaveLength(3);
});
