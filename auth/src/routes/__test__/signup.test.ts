import request from 'supertest';
import { app } from '../../app';
import { natsWrapper } from '../../nats-wrapper';
import { User } from '../../models/User';

const FACE_CAPTURE = `data:image/jpeg;base64,${'a'.repeat(120)}`;

const buildStudentSignupPayload = (overrides = {}) => ({
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
  faceCapture: FACE_CAPTURE,
  ...overrides,
});

const buildLecturerSignupPayload = (overrides = {}) => ({
  fullName: 'Lecturer One',
  email: 'lecturer@test.com',
  password: 'password1',
  confirmPassword: 'password1',
  role: 'lecturer',
  staffId: 'STAFF-0041',
  institution: 'Riverside University',
  department: 'Mathematics',
  staffDocumentName: 'id-card.pdf',
  faceCapture: FACE_CAPTURE,
  ...overrides,
});

const buildAdminSignupPayload = (overrides = {}) => ({
  fullName: 'Admin User',
  email: 'admin@test.com',
  password: 'password1',
  confirmPassword: 'password1',
  role: 'admin',
  faceCapture: FACE_CAPTURE,
  ...overrides,
});

it('returns a 201 on successful student signup and stores signup fields', async () => {
  const response = await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload())
    .expect(201);

  expect(response.body.user.fullName).toEqual('Test User');
  expect(response.body.user.firstName).toEqual('Test');
  expect(response.body.user.lastName).toEqual('User');
  expect(response.body.user.email).toEqual('test@test.com');
  expect(response.body.user.role).toEqual('student');
  expect(response.body.user.studentId).toEqual('MAT-2023-0001');
  expect(response.body.user.institution).toEqual('Riverside University');
  expect(response.body.user.department).toEqual('Computer Science');
  expect(response.body.user.level).toEqual('300');
  expect(response.body.user.aiConsent).toEqual(true);
  expect(response.body.user.faceCapture).toEqual(FACE_CAPTURE);
  expect(response.body.user.password).toBeUndefined();
  expect(response.body.token).toBeDefined();

  const user = await User.findOne({ email: 'test@test.com' });

  expect(user).not.toBeNull();
  expect(user!.password).not.toEqual('password1');
  expect(user!.fullName).toEqual('Test User');
  expect(user!.studentId).toEqual('MAT-2023-0001');
  expect(user!.faceCapture).toEqual(FACE_CAPTURE);
});

it('accepts name as an alternative to fullName', async () => {
  const { fullName, ...payload } = buildStudentSignupPayload({
    email: 'jane@test.com',
  });

  const response = await request(app)
    .post('/api/users/signup')
    .send({
      ...payload,
      name: 'Jane Doe',
    })
    .expect(201);

  expect(fullName).toEqual('Test User');
  expect(response.body.user.fullName).toEqual('Jane Doe');
  expect(response.body.user.firstName).toEqual('Jane');
  expect(response.body.user.lastName).toEqual('Doe');
});

it('creates a lecturer account with staff-specific fields', async () => {
  const response = await request(app)
    .post('/api/users/signup')
    .send(buildLecturerSignupPayload())
    .expect(201);

  expect(response.body.user.role).toEqual('lecturer');
  expect(response.body.user.staffId).toEqual('STAFF-0041');
  expect(response.body.user.institution).toEqual('Riverside University');
  expect(response.body.user.department).toEqual('Mathematics');
  expect(response.body.user.staffDocumentName).toEqual('id-card.pdf');
  expect(response.body.user.studentId).toBeUndefined();
});

it('creates an admin account with common fields only', async () => {
  const response = await request(app)
    .post('/api/users/signup')
    .send(buildAdminSignupPayload())
    .expect(201);

  expect(response.body.user.role).toEqual('admin');
  expect(response.body.user.studentId).toBeUndefined();
  expect(response.body.user.staffId).toBeUndefined();
  expect(response.body.user.institution).toBeUndefined();
  expect(response.body.user.department).toBeUndefined();
});

it('returns a 400 with an invalid email', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload({ email: 'invalidemailformat' }))
    .expect(400);
});

it('returns a 400 with an invalid password', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload({ password: 'short' }))
    .expect(400);
});

it('returns a 400 when confirmPassword does not match', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload({ confirmPassword: 'different-password' }))
    .expect(400);
});

it('returns a 400 with a one-part name', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload({ fullName: 'Prince' }))
    .expect(400);
});

it('returns a 400 with an invalid role', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload({ role: 'doctor' }))
    .expect(400);
});

it('returns a 400 when student required fields are missing', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload({ studentId: '', aiConsent: false }))
    .expect(400);
});

it('returns a 400 when lecturer required fields are missing', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildLecturerSignupPayload({ staffId: '' }))
    .expect(400);
});

it('returns a 400 when faceCapture is missing', async () => {
  const { faceCapture, ...payload } = buildStudentSignupPayload();

  expect(faceCapture).toEqual(FACE_CAPTURE);

  await request(app)
    .post('/api/users/signup')
    .send(payload)
    .expect(400);
});

it('returns a 400 with missing email and password', async () => {
  await request(app)
    .post('/api/users/signup')
    .send({})
    .expect(400);
});

it('disallows duplicate emails', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload())
    .expect(201);

  await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload({ fullName: 'Test User Two' }))
    .expect(400);
});

it('sets a cookie after successful signup', async () => {
  const response = await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload())
    .expect(201);

  expect(response.get('Set-Cookie')).toBeDefined();
});

it('publishes an event after successful signup', async () => {
  await request(app)
    .post('/api/users/signup')
    .send(buildStudentSignupPayload())
    .expect(201);

  expect(natsWrapper.client.publish).toHaveBeenCalled();
});
