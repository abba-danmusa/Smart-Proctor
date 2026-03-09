"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
async function createExam({ cookie, title, institution, startAt, endAt, course, courseId, }) {
    const payload = {
        title,
        durationMinutes: 90,
        startAt,
        endAt,
        institution,
        proctoring: {
            faceVerification: true,
            tabSwitchDetection: true,
            soundDetection: true,
            multipleFaceDetection: true,
        },
    };
    if (courseId) {
        payload.courseId = courseId;
    }
    else {
        payload.course = course ?? 'Software Engineering';
    }
    return (0, supertest_1.default)(app_1.app)
        .post('/api/exams')
        .set('Cookie', cookie)
        .send(payload)
        .expect(201);
}
async function createCourse({ cookie, institution, code, title, type, }) {
    return (0, supertest_1.default)(app_1.app)
        .post('/api/exams/courses')
        .set('Cookie', cookie)
        .send({
        code,
        title,
        type,
        institution,
    })
        .expect(201);
}
it('returns only lecturer-owned exams for lecturer scope', async () => {
    const lecturerOne = await global.signin({
        id: 'lecturer-one-id',
        email: 'lecturer1@test.com',
        role: 'lecturer',
        fullName: 'Lecturer One',
        institution: 'Riverside University',
    });
    const lecturerTwo = await global.signin({
        id: 'lecturer-two-id',
        email: 'lecturer2@test.com',
        role: 'lecturer',
        fullName: 'Lecturer Two',
        institution: 'Northbridge University',
    });
    const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 120 * 60 * 1000).toISOString();
    await createExam({
        cookie: lecturerOne,
        title: 'CSC 200 Quiz',
        institution: 'Riverside University',
        startAt,
        endAt,
    });
    await createExam({
        cookie: lecturerTwo,
        title: 'MTH 300 Midterm',
        institution: 'Northbridge University',
        startAt,
        endAt,
    });
    const response = await (0, supertest_1.default)(app_1.app)
        .get('/api/exams')
        .set('Cookie', lecturerOne)
        .expect(200);
    expect(response.body.exams).toHaveLength(1);
    expect(response.body.exams[0].title).toEqual('CSC 200 Quiz');
});
it('returns student institution exams and student statuses', async () => {
    const lecturer = await global.signin({
        role: 'lecturer',
        fullName: 'Lecturer One',
        institution: 'Riverside University',
    });
    const otherInstitutionLecturer = await global.signin({
        id: 'other-lecturer-id',
        email: 'other-lecturer@test.com',
        role: 'lecturer',
        fullName: 'Other Lecturer',
        institution: 'Northbridge University',
    });
    const student = await global.signin({
        id: 'student-1',
        email: 'student1@test.com',
        role: 'student',
        institution: 'Riverside University',
    });
    const liveCourse = await createCourse({
        cookie: lecturer,
        institution: 'Riverside University',
        code: 'CSC-410',
        title: 'Live Course',
        type: 'core',
    });
    const upcomingCourse = await createCourse({
        cookie: lecturer,
        institution: 'Riverside University',
        code: 'CSC-420',
        title: 'Upcoming Course',
        type: 'elective',
    });
    const otherInstitutionCourse = await createCourse({
        cookie: otherInstitutionLecturer,
        institution: 'Northbridge University',
        code: 'MTH-390',
        title: 'Other Institution Course',
        type: 'core',
    });
    const liveExam = await createExam({
        cookie: lecturer,
        title: 'Live Exam',
        institution: 'Riverside University',
        courseId: liveCourse.body.course.id,
        startAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
    });
    await createExam({
        cookie: lecturer,
        title: 'Upcoming Exam',
        institution: 'Riverside University',
        courseId: upcomingCourse.body.course.id,
        startAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() + 100 * 60 * 1000).toISOString(),
    });
    await createExam({
        cookie: otherInstitutionLecturer,
        title: 'Other Institution Exam',
        institution: 'Northbridge University',
        courseId: otherInstitutionCourse.body.course.id,
        startAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
    });
    await (0, supertest_1.default)(app_1.app)
        .post(`/api/exams/courses/${liveCourse.body.course.id}/register`)
        .set('Cookie', student)
        .expect(201);
    await (0, supertest_1.default)(app_1.app)
        .post(`/api/exams/courses/${upcomingCourse.body.course.id}/register`)
        .set('Cookie', student)
        .expect(201);
    const beforeSubmit = await (0, supertest_1.default)(app_1.app)
        .get('/api/exams')
        .set('Cookie', student)
        .expect(200);
    expect(beforeSubmit.body.exams).toHaveLength(2);
    expect(beforeSubmit.body.exams[0].title).toEqual('Live Exam');
    expect(beforeSubmit.body.exams[0].studentStatus).toEqual('active');
    expect(beforeSubmit.body.exams[1].title).toEqual('Upcoming Exam');
    expect(beforeSubmit.body.exams[1].studentStatus).toEqual('upcoming');
    await (0, supertest_1.default)(app_1.app)
        .post(`/api/exams/${liveExam.body.exam.id}/start`)
        .set('Cookie', student)
        .expect(201);
    await (0, supertest_1.default)(app_1.app)
        .post(`/api/exams/${liveExam.body.exam.id}/submit`)
        .set('Cookie', student)
        .send({ integrityScore: 98, answers: { q1: 'A' } })
        .expect(200);
    const afterSubmit = await (0, supertest_1.default)(app_1.app)
        .get('/api/exams')
        .set('Cookie', student)
        .expect(200);
    const completedExam = afterSubmit.body.exams.find((exam) => exam.title === 'Live Exam');
    expect(completedExam.studentStatus).toEqual('completed');
});
it('returns no exams for students without registered courses', async () => {
    const lecturer = await global.signin({
        role: 'lecturer',
        fullName: 'Lecturer One',
        institution: 'Riverside University',
    });
    const student = await global.signin({
        id: 'student-without-courses',
        email: 'student.without.courses@test.com',
        role: 'student',
        institution: 'Riverside University',
    });
    const course = await createCourse({
        cookie: lecturer,
        institution: 'Riverside University',
        code: 'CSC-430',
        title: 'Computer Networks',
        type: 'core',
    });
    await createExam({
        cookie: lecturer,
        title: 'Networks Midterm',
        institution: 'Riverside University',
        courseId: course.body.course.id,
        startAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() + 100 * 60 * 1000).toISOString(),
    });
    const response = await (0, supertest_1.default)(app_1.app)
        .get('/api/exams')
        .set('Cookie', student)
        .expect(200);
    expect(response.body.exams).toHaveLength(0);
});
