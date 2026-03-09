"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
it('creates a course and lists lecturer-owned courses', async () => {
    const lecturerCookie = await global.signin({
        id: 'lecturer-course-owner',
        role: 'lecturer',
        institution: 'Riverside University',
        fullName: 'Course Owner',
    });
    const createResponse = await (0, supertest_1.default)(app_1.app)
        .post('/api/exams/courses')
        .set('Cookie', lecturerCookie)
        .send({
        code: 'CSC-441',
        title: 'Artificial Intelligence',
        type: 'core',
        department: 'Computer Science',
        level: '400',
        description: 'Core AI concepts and applications.',
    })
        .expect(201);
    expect(createResponse.body.course.code).toEqual('CSC-441');
    expect(createResponse.body.course.type).toEqual('core');
    const listResponse = await (0, supertest_1.default)(app_1.app)
        .get('/api/exams/courses')
        .set('Cookie', lecturerCookie)
        .expect(200);
    expect(listResponse.body.courses).toHaveLength(1);
    expect(listResponse.body.courses[0].title).toEqual('Artificial Intelligence');
});
it('blocks duplicate course code within the same institution', async () => {
    const lecturerCookie = await global.signin({
        id: 'lecturer-duplicate',
        role: 'lecturer',
        institution: 'Riverside University',
    });
    await (0, supertest_1.default)(app_1.app)
        .post('/api/exams/courses')
        .set('Cookie', lecturerCookie)
        .send({
        code: 'CSC-450',
        title: 'Advanced Algorithms',
        type: 'core',
    })
        .expect(201);
    await (0, supertest_1.default)(app_1.app)
        .post('/api/exams/courses')
        .set('Cookie', lecturerCookie)
        .send({
        code: 'CSC-450',
        title: 'Algorithms II',
        type: 'elective',
    })
        .expect(400);
});
it('generates questions from a saved course', async () => {
    const lecturerCookie = await global.signin({
        id: 'lecturer-generator',
        role: 'lecturer',
        institution: 'Riverside University',
    });
    const courseResponse = await (0, supertest_1.default)(app_1.app)
        .post('/api/exams/courses')
        .set('Cookie', lecturerCookie)
        .send({
        code: 'CSC-460',
        title: 'Machine Learning Systems',
        type: 'elective',
    })
        .expect(201);
    const generationResponse = await (0, supertest_1.default)(app_1.app)
        .post('/api/exams/questions/generate')
        .set('Cookie', lecturerCookie)
        .send({
        courseId: courseResponse.body.course.id,
        examTitle: 'CSC 460 Midterm',
        instructions: 'Answer all questions and pick one best option per question.',
        numberOfQuestions: 4,
        difficulty: 'hard',
        topics: ['Model Deployment', 'Monitoring'],
    })
        .expect(200);
    expect(generationResponse.body.generation.course.code).toEqual('CSC-460');
    expect(generationResponse.body.generation.questions).toHaveLength(4);
    expect(generationResponse.body.generation.questions[0].options).toHaveLength(4);
});
