import request from 'supertest'
import { app } from '../../app'

async function createLiveExam(lecturerCookie: string[]) {
  const response = await request(app)
    .post('/api/exams')
    .set('Cookie', lecturerCookie)
    .send({
      title: 'CSC 470 Assessment',
      course: 'Compiler Construction',
      durationMinutes: 90,
      startAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      institution: 'Riverside University',
      proctoring: {
        faceVerification: true,
        tabSwitchDetection: true,
        soundDetection: true,
        multipleFaceDetection: true,
      },
      questions: [
        {
          questionNumber: 1,
          topic: 'Lexical Analysis',
          difficulty: 'easy',
          prompt: 'Which phase converts source code into tokens?',
          options: ['Parsing', 'Lexical Analysis', 'Linking', 'Scheduling'],
          answer: 'Lexical Analysis',
          explanation: 'Lexical analysis tokenizes input before parsing.',
        },
        {
          questionNumber: 2,
          topic: 'Optimization',
          difficulty: 'medium',
          prompt: 'Which option best describes dead code elimination?',
          options: ['Removing unreachable instructions', 'Adding debugging symbols', 'Expanding loops', 'Encrypting binaries'],
          answer: 'Removing unreachable instructions',
          explanation: 'Dead code elimination removes code that does not affect outcomes.',
        },
      ],
    })
    .expect(201)

  return response.body.exam.id as string
}

it('auto-grades submitted exams and exposes results to lecturers and students', async () => {
  const lecturerCookie = await global.signin({
    id: 'lecturer-grade-1',
    role: 'lecturer',
    institution: 'Riverside University',
    fullName: 'Lecturer Grade',
    email: 'lecturer.grade@test.com',
  })

  const studentCookie = await global.signin({
    id: 'student-grade-1',
    role: 'student',
    institution: 'Riverside University',
    email: 'student.grade@test.com',
    fullName: 'Student Grade',
  })

  const examId = await createLiveExam(lecturerCookie)

  await request(app)
    .post(`/api/exams/${examId}/start`)
    .set('Cookie', studentCookie)
    .expect(201)

  const submitResponse = await request(app)
    .post(`/api/exams/${examId}/submit`)
    .set('Cookie', studentCookie)
    .send({
      integrityScore: 94,
      answers: {
        q1: 'B',
        q2: 'B',
      },
    })
    .expect(200)

  expect(submitResponse.body.attempt.grading.status).toEqual('auto_graded')
  expect(submitResponse.body.attempt.grading.correctAnswers).toEqual(1)
  expect(submitResponse.body.attempt.grading.totalQuestions).toEqual(2)
  expect(submitResponse.body.attempt.grading.finalScore).toEqual(50)

  const submissionsResponse = await request(app)
    .get(`/api/exams/${examId}/submissions`)
    .set('Cookie', lecturerCookie)
    .expect(200)

  expect(submissionsResponse.body.submissions).toHaveLength(1)
  expect(submissionsResponse.body.submissions[0].grading.finalScore).toEqual(50)

  const attemptId = submissionsResponse.body.submissions[0].attemptId as string

  const detailResponse = await request(app)
    .get(`/api/exams/${examId}/submissions/${attemptId}`)
    .set('Cookie', lecturerCookie)
    .expect(200)

  expect(detailResponse.body.submission.review).toHaveLength(2)
  expect(detailResponse.body.submission.review[0].isCorrect).toEqual(true)
  expect(detailResponse.body.submission.review[1].isCorrect).toEqual(false)

  const resultsResponse = await request(app)
    .get('/api/exams/results')
    .set('Cookie', studentCookie)
    .expect(200)

  expect(resultsResponse.body.results).toHaveLength(1)
  expect(resultsResponse.body.results[0].examId).toEqual(examId)
  expect(resultsResponse.body.results[0].grading.finalScore).toEqual(50)
  expect(resultsResponse.body.results[0].resultStatus).toEqual('passed')
})

it('allows lecturers to manually override an auto-graded score', async () => {
  const lecturerCookie = await global.signin({
    id: 'lecturer-grade-2',
    role: 'lecturer',
    institution: 'Riverside University',
    fullName: 'Lecturer Override',
    email: 'lecturer.override@test.com',
  })

  const studentCookie = await global.signin({
    id: 'student-grade-2',
    role: 'student',
    institution: 'Riverside University',
    email: 'student.override@test.com',
    fullName: 'Student Override',
  })

  const examId = await createLiveExam(lecturerCookie)

  await request(app)
    .post(`/api/exams/${examId}/start`)
    .set('Cookie', studentCookie)
    .expect(201)

  await request(app)
    .post(`/api/exams/${examId}/submit`)
    .set('Cookie', studentCookie)
    .send({
      integrityScore: 88,
      answers: {
        q1: 'A',
        q2: 'D',
      },
    })
    .expect(200)

  const submissionsResponse = await request(app)
    .get(`/api/exams/${examId}/submissions`)
    .set('Cookie', lecturerCookie)
    .expect(200)

  const attemptId = submissionsResponse.body.submissions[0].attemptId as string

  const gradingResponse = await request(app)
    .put(`/api/exams/${examId}/submissions/${attemptId}/grade`)
    .set('Cookie', lecturerCookie)
    .send({
      score: 35,
      feedback: 'Manual review identified unsupported work in the submission.',
    })
    .expect(200)

  expect(gradingResponse.body.submission.grading.status).toEqual('manually_graded')
  expect(gradingResponse.body.submission.grading.autoScore).toEqual(0)
  expect(gradingResponse.body.submission.grading.manualScore).toEqual(35)
  expect(gradingResponse.body.submission.grading.finalScore).toEqual(35)
  expect(gradingResponse.body.submission.grading.feedback).toContain('Manual review')

  const resultsResponse = await request(app)
    .get('/api/exams/results')
    .set('Cookie', studentCookie)
    .expect(200)

  expect(resultsResponse.body.results[0].grading.status).toEqual('manually_graded')
  expect(resultsResponse.body.results[0].grading.finalScore).toEqual(35)
  expect(resultsResponse.body.results[0].resultStatus).toEqual('failed')
})
