import request from 'supertest';
import { app } from '../../app';

const buildSignupPayload = (overrides = {}) => ({
  fullName: 'Test User',
  email: 'test@test.com',
  password: 'password1',
  confirmPassword: 'password1',
  role: 'student',
  studentId: 'MAT-2023-0001',
  institution: 'Riverside University',
  department: 'Computer Science',
  level: '300',
  aiConsent: true,
  faceCapture: `data:image/jpeg;base64,${'a'.repeat(120)}`,
  ...overrides,
});

it('fails when an email that does not exist is supplied', async () => {
  await request(app)
    .post('/api/users/signin')
    .send({
      email: 'test@test.com',
      password: 'password1'
    })
    .expect(400);
});

it('fails when an incorrect password is supplied', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildSignupPayload())
    .expect(201);

  await request(app)
    .post('/api/users/signin')
    .send({
      email: 'test@test.com',
      password: 'wrongpassword',
    })
    .expect(400);
});

it('responds with a cookie when given valid credentials', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildSignupPayload())
    .expect(201);

  const response = await request(app)
    .post('/api/users/signin')
    .send({
      email: 'test@test.com',
      password: 'password1',
    })
    .expect(200);

  expect(response.get('Set-Cookie')).toBeDefined();
});
