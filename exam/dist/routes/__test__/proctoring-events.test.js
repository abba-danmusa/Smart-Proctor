"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
async function createLiveExam(lecturerCookie) {
    const response = await (0, supertest_1.default)(app_1.app)
        .post('/api/exams')
        .set('Cookie', lecturerCookie)
        .send({
        title: 'CSC 470 Secure Systems',
        course: 'Secure Systems',
        durationMinutes: 90,
        startAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
        institution: 'Riverside University',
        proctoring: {
            faceVerification: true,
            tabSwitchDetection: true,
            soundDetection: true,
            multipleFaceDetection: true,
        },
    })
        .expect(201);
    return response.body.exam.id;
}
it('returns a student session after an exam attempt has started', async () => {
    const lecturerCookie = await global.signin({
        id: 'lecturer-session-1',
        role: 'lecturer',
        institution: 'Riverside University',
        fullName: 'Lecturer Session',
    });
    const studentCookie = await global.signin({
        id: 'student-session-1',
        role: 'student',
        institution: 'Riverside University',
        email: 'student.session.1@test.com',
        fullName: 'Student Session',
    });
    const examId = await createLiveExam(lecturerCookie);
    await (0, supertest_1.default)(app_1.app)
        .post(`/api/exams/${examId}/start`)
        .set('Cookie', studentCookie)
        .expect(201);
    const sessionResponse = await (0, supertest_1.default)(app_1.app)
        .get(`/api/exams/${examId}/session`)
        .set('Cookie', studentCookie)
        .expect(200);
    expect(sessionResponse.body.session.exam.id).toEqual(examId);
    expect(sessionResponse.body.session.attempt.status).toEqual('in_progress');
    expect(Array.isArray(sessionResponse.body.session.questions)).toEqual(true);
});
it('stores student proctoring events and exposes them to the owning lecturer', async () => {
    const lecturerCookie = await global.signin({
        id: 'lecturer-events-1',
        role: 'lecturer',
        institution: 'Riverside University',
        fullName: 'Lecturer Events',
        email: 'lecturer.events@test.com',
    });
    const studentCookie = await global.signin({
        id: 'student-events-1',
        role: 'student',
        institution: 'Riverside University',
        email: 'student.events@test.com',
        fullName: 'Student Events',
    });
    const examId = await createLiveExam(lecturerCookie);
    await (0, supertest_1.default)(app_1.app)
        .post(`/api/exams/${examId}/start`)
        .set('Cookie', studentCookie)
        .expect(201);
    await (0, supertest_1.default)(app_1.app)
        .post(`/api/exams/${examId}/proctoring/events`)
        .set('Cookie', studentCookie)
        .send({
        eventType: 'tab_switch',
        severity: 'medium',
        message: 'Browser tab lost focus',
        evidence: {
            visibilityState: 'hidden',
        },
    })
        .expect(201);
    const lecturerEventsResponse = await (0, supertest_1.default)(app_1.app)
        .get('/api/exams/proctoring/events')
        .set('Cookie', lecturerCookie)
        .expect(200);
    expect(lecturerEventsResponse.body.events).toHaveLength(1);
    expect(lecturerEventsResponse.body.events[0].examId).toEqual(examId);
    expect(lecturerEventsResponse.body.events[0].eventType).toEqual('tab_switch');
    expect(lecturerEventsResponse.body.events[0].studentId).toEqual('student-events-1');
});
