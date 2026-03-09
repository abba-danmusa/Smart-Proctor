import request from 'supertest'
import { app } from '../../app'

async function createLiveExam(lecturerCookie: string[]) {
  const response = await request(app)
    .post('/api/exams')
    .set('Cookie', lecturerCookie)
    .send({
      title: 'CSC 450 Final',
      course: 'Advanced Algorithms',
      durationMinutes: 120,
      startAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      institution: 'Riverside University',
      proctoring: {
        faceVerification: true,
        tabSwitchDetection: true,
        soundDetection: true,
        multipleFaceDetection: true,
      },
    })
    .expect(201)

  return response.body.exam.id as string
}

it('starts an active exam attempt and allows submission', async () => {
  const lecturerCookie = await global.signin({
    role: 'lecturer',
    institution: 'Riverside University',
    fullName: 'Lecturer One',
  })

  const studentCookie = await global.signin({
    id: 'student-attempt-1',
    role: 'student',
    institution: 'Riverside University',
    email: 'student-attempt@test.com',
  })

  const examId = await createLiveExam(lecturerCookie)

  const startResponse = await request(app)
    .post(`/api/exams/${examId}/start`)
    .set('Cookie', studentCookie)
    .expect(201)

  expect(startResponse.body.attempt.status).toEqual('in_progress')

  const repeatStartResponse = await request(app)
    .post(`/api/exams/${examId}/start`)
    .set('Cookie', studentCookie)
    .expect(200)

  expect(repeatStartResponse.body.attempt.status).toEqual('in_progress')

  const submitResponse = await request(app)
    .post(`/api/exams/${examId}/submit`)
    .set('Cookie', studentCookie)
    .send({ integrityScore: 91, answers: { q1: 'B', q2: 'C' } })
    .expect(200)

  expect(submitResponse.body.attempt.status).toEqual('submitted')
  expect(submitResponse.body.attempt.integrityScore).toEqual(91)
})

it('rejects starting a scheduled exam', async () => {
  const lecturerCookie = await global.signin({
    role: 'lecturer',
    institution: 'Riverside University',
    fullName: 'Lecturer One',
  })

  const studentCookie = await global.signin({
    id: 'student-scheduled',
    role: 'student',
    institution: 'Riverside University',
    email: 'student-scheduled@test.com',
  })

  const createResponse = await request(app)
    .post('/api/exams')
    .set('Cookie', lecturerCookie)
    .send({
      title: 'Future Exam',
      course: 'Discrete Math',
      durationMinutes: 60,
      startAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      institution: 'Riverside University',
      proctoring: {
        faceVerification: true,
        tabSwitchDetection: true,
        soundDetection: true,
        multipleFaceDetection: true,
      },
    })
    .expect(201)

  await request(app)
    .post(`/api/exams/${createResponse.body.exam.id}/start`)
    .set('Cookie', studentCookie)
    .expect(400)
})

it('expires an exam and blocks expired attempts from submission', async () => {
  const lecturerCookie = await global.signin({
    id: 'lecturer-expire',
    role: 'lecturer',
    institution: 'Riverside University',
    fullName: 'Lecturer Expire',
  })

  const studentCookie = await global.signin({
    id: 'student-expire',
    role: 'student',
    institution: 'Riverside University',
    email: 'student-expire@test.com',
  })

  const examId = await createLiveExam(lecturerCookie)

  await request(app)
    .post(`/api/exams/${examId}/start`)
    .set('Cookie', studentCookie)
    .expect(201)

  const expireResponse = await request(app)
    .post(`/api/exams/${examId}/expire`)
    .set('Cookie', lecturerCookie)
    .expect(200)

  expect(expireResponse.body.exam.status).toEqual('expired')

  await request(app)
    .post(`/api/exams/${examId}/submit`)
    .set('Cookie', studentCookie)
    .send({ integrityScore: 80 })
    .expect(400)
})
