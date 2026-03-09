import request from 'supertest'
import { app } from '../../app'

async function createCourse(cookie: string[], payload: { code: string; title: string; type: 'core' | 'elective'; institution: string }) {
  return request(app)
    .post('/api/exams/courses')
    .set('Cookie', cookie)
    .send({
      code: payload.code,
      title: payload.title,
      type: payload.type,
      institution: payload.institution,
    })
    .expect(201)
}

it('allows student to list all courses in their institution', async () => {
  const lecturerOne = await global.signin({
    id: 'lecturer-course-1',
    role: 'lecturer',
    institution: 'Riverside University',
  })

  const lecturerTwo = await global.signin({
    id: 'lecturer-course-2',
    role: 'lecturer',
    institution: 'Riverside University',
  })

  const otherInstitutionLecturer = await global.signin({
    id: 'lecturer-other-inst',
    role: 'lecturer',
    institution: 'Northbridge University',
  })

  await createCourse(lecturerOne, {
    code: 'CSC-401',
    title: 'Compiler Design',
    type: 'core',
    institution: 'Riverside University',
  })

  await createCourse(lecturerTwo, {
    code: 'CSC-402',
    title: 'Parallel Computing',
    type: 'elective',
    institution: 'Riverside University',
  })

  await createCourse(otherInstitutionLecturer, {
    code: 'MTH-301',
    title: 'Advanced Calculus',
    type: 'core',
    institution: 'Northbridge University',
  })

  const studentCookie = await global.signin({
    id: 'student-course-viewer',
    role: 'student',
    institution: 'Riverside University',
  })

  const response = await request(app)
    .get('/api/exams/courses')
    .set('Cookie', studentCookie)
    .expect(200)

  expect(response.body.courses).toHaveLength(2)
  expect(response.body.courses.map((course: { code: string }) => course.code).sort()).toEqual(['CSC-401', 'CSC-402'])
  expect(response.body.courses.every((course: { isRegistered: boolean }) => course.isRegistered === false)).toBe(true)
})

it('allows student to register for a course and returns idempotent response on repeat', async () => {
  const lecturerCookie = await global.signin({
    id: 'lecturer-registration-owner',
    role: 'lecturer',
    institution: 'Riverside University',
  })

  const createdCourse = await createCourse(lecturerCookie, {
    code: 'CSC-450',
    title: 'Machine Learning Systems',
    type: 'elective',
    institution: 'Riverside University',
  })

  const studentCookie = await global.signin({
    id: 'student-registered-one',
    role: 'student',
    institution: 'Riverside University',
  })

  const firstRegistration = await request(app)
    .post(`/api/exams/courses/${createdCourse.body.course.id}/register`)
    .set('Cookie', studentCookie)
    .expect(201)

  expect(firstRegistration.body.registration.courseId).toEqual(createdCourse.body.course.id)
  expect(firstRegistration.body.registration.studentId).toEqual('student-registered-one')
  expect(typeof firstRegistration.body.registration.registeredAt).toEqual('string')

  const secondRegistration = await request(app)
    .post(`/api/exams/courses/${createdCourse.body.course.id}/register`)
    .set('Cookie', studentCookie)
    .expect(200)

  expect(secondRegistration.body.registration.courseId).toEqual(createdCourse.body.course.id)
  expect(secondRegistration.body.registration.studentId).toEqual('student-registered-one')

  const listResponse = await request(app)
    .get('/api/exams/courses')
    .set('Cookie', studentCookie)
    .expect(200)

  expect(listResponse.body.courses).toHaveLength(1)
  expect(listResponse.body.courses[0].isRegistered).toEqual(true)
  expect(typeof listResponse.body.courses[0].registeredAt).toEqual('string')
})

it('blocks course registration for students outside the course institution', async () => {
  const lecturerCookie = await global.signin({
    id: 'lecturer-restricted',
    role: 'lecturer',
    institution: 'Riverside University',
  })

  const createdCourse = await createCourse(lecturerCookie, {
    code: 'CSC-500',
    title: 'Distributed Systems',
    type: 'core',
    institution: 'Riverside University',
  })

  const externalStudentCookie = await global.signin({
    id: 'student-external',
    role: 'student',
    institution: 'Northbridge University',
  })

  await request(app)
    .post(`/api/exams/courses/${createdCourse.body.course.id}/register`)
    .set('Cookie', externalStudentCookie)
    .expect(401)
})

it('blocks non-student users from registering for a course', async () => {
  const lecturerCookie = await global.signin({
    id: 'lecturer-no-register',
    role: 'lecturer',
    institution: 'Riverside University',
  })

  const createdCourse = await createCourse(lecturerCookie, {
    code: 'CSC-410',
    title: 'Computer Graphics',
    type: 'elective',
    institution: 'Riverside University',
  })

  await request(app)
    .post(`/api/exams/courses/${createdCourse.body.course.id}/register`)
    .set('Cookie', lecturerCookie)
    .expect(401)
})
