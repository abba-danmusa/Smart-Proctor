import request from 'supertest'
import { app } from '../../app'

async function createExam({
  cookie,
  title,
  institution,
  startAt,
  endAt,
}: {
  cookie: string[]
  title: string
  institution: string
  startAt: string
  endAt: string
}) {
  return request(app)
    .post('/api/exams')
    .set('Cookie', cookie)
    .send({
      title,
      course: 'Software Engineering',
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
    })
    .expect(201)
}

it('returns only lecturer-owned exams for lecturer scope', async () => {
  const lecturerOne = await global.signin({
    id: 'lecturer-one-id',
    email: 'lecturer1@test.com',
    role: 'lecturer',
    fullName: 'Lecturer One',
    institution: 'Riverside University',
  })

  const lecturerTwo = await global.signin({
    id: 'lecturer-two-id',
    email: 'lecturer2@test.com',
    role: 'lecturer',
    fullName: 'Lecturer Two',
    institution: 'Northbridge University',
  })

  const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const endAt = new Date(Date.now() + 120 * 60 * 1000).toISOString()

  await createExam({
    cookie: lecturerOne,
    title: 'CSC 200 Quiz',
    institution: 'Riverside University',
    startAt,
    endAt,
  })

  await createExam({
    cookie: lecturerTwo,
    title: 'MTH 300 Midterm',
    institution: 'Northbridge University',
    startAt,
    endAt,
  })

  const response = await request(app)
    .get('/api/exams')
    .set('Cookie', lecturerOne)
    .expect(200)

  expect(response.body.exams).toHaveLength(1)
  expect(response.body.exams[0].title).toEqual('CSC 200 Quiz')
})

it('returns student institution exams and student statuses', async () => {
  const lecturer = await global.signin({
    role: 'lecturer',
    fullName: 'Lecturer One',
    institution: 'Riverside University',
  })

  const otherInstitutionLecturer = await global.signin({
    id: 'other-lecturer-id',
    email: 'other-lecturer@test.com',
    role: 'lecturer',
    fullName: 'Other Lecturer',
    institution: 'Northbridge University',
  })

  const student = await global.signin({
    id: 'student-1',
    email: 'student1@test.com',
    role: 'student',
    institution: 'Riverside University',
  })

  const liveExam = await createExam({
    cookie: lecturer,
    title: 'Live Exam',
    institution: 'Riverside University',
    startAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
  })

  await createExam({
    cookie: lecturer,
    title: 'Upcoming Exam',
    institution: 'Riverside University',
    startAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 100 * 60 * 1000).toISOString(),
  })

  await createExam({
    cookie: otherInstitutionLecturer,
    title: 'Other Institution Exam',
    institution: 'Northbridge University',
    startAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
  })

  const beforeSubmit = await request(app)
    .get('/api/exams')
    .set('Cookie', student)
    .expect(200)

  expect(beforeSubmit.body.exams).toHaveLength(2)
  expect(beforeSubmit.body.exams[0].title).toEqual('Live Exam')
  expect(beforeSubmit.body.exams[0].studentStatus).toEqual('active')
  expect(beforeSubmit.body.exams[1].title).toEqual('Upcoming Exam')
  expect(beforeSubmit.body.exams[1].studentStatus).toEqual('upcoming')

  await request(app)
    .post(`/api/exams/${liveExam.body.exam.id}/start`)
    .set('Cookie', student)
    .expect(201)

  await request(app)
    .post(`/api/exams/${liveExam.body.exam.id}/submit`)
    .set('Cookie', student)
    .send({ integrityScore: 98, answers: { q1: 'A' } })
    .expect(200)

  const afterSubmit = await request(app)
    .get('/api/exams')
    .set('Cookie', student)
    .expect(200)

  const completedExam = afterSubmit.body.exams.find((exam: { title: string }) => exam.title === 'Live Exam')
  expect(completedExam.studentStatus).toEqual('completed')
})
