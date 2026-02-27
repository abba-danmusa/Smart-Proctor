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

describe('Signout', () => {
  it('clears the cookie after signing out', async () => {
    await request(app)
      .post('/api/users/signup')
      .send(buildSignupPayload())
      .expect(201);

    const response = await request(app)
      .post('/api/users/signout')
      .send({})
      .expect(200);

    const setCookie = response.get('Set-Cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie?.[0]).toMatch(/session=.*expires=.*httponly/);
  });

  it('returns 200 when signing out without being signed in', async () => {
    await request(app)
      .post('/api/users/signout')
      .send({})
      .expect(200);
  });
});
