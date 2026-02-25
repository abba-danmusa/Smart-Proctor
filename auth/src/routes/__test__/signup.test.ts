import request from 'supertest';
import { app } from '../../app';
import { natsWrapper } from '../../nats-wrapper';

it('returns a 201 on successful signup', async () => {
  return request(app)
    .post('/api/users/signup')
    .send({
      name: 'Test User',
      email: 'test@test.com',
      password: 'password',
      role: 'doctor'
    })
    .expect(201);
});

it('returns a 400 with an invalid email', async () => {
  return request(app)
    .post('/api/users/signup')
    .send({
      name: 'Test User',
      email: 'invalidemailformat',
      password: 'password',
      role: 'doctor'
    })
    .expect(400);
});

it('returns a 400 with an invalid password', async () => {
  return request(app)
    .post('/api/users/signup')
    .send({
      name: 'Test User',
      email: 'test@test.com',
      password: 'p',
      role: 'doctor'
    })
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
    .send({
      name: 'Test User',
      email: 'test@test.com',
      password: 'password',
      role: 'doctor'
    })
    .expect(201);

  await request(app)
    .post('/api/users/signup')
    .send({
      name: 'Test User 2',
      email: 'test@test.com',
      password: 'password',
      role: 'doctor'
    })
    .expect(400);
});

it('sets a cookie after successful signup', async () => {
  const response = await request(app)
    .post('/api/users/signup')
    .send({
      name: 'Test User',
      email: 'test@test.com',
      password: 'password',
      role: 'doctor'
    })
    .expect(201);
  expect(response.get('Set-Cookie')).toBeDefined();
});

it('publishes an event after successful signup', async () => {
  await request(app)
    .post('/api/users/signup')
    .send({
      name: 'Test User',
      email: 'test@test.com',
      password: 'password',
      role: 'doctor'
    })
    .expect(201);

  expect(natsWrapper.client.publish).toHaveBeenCalled();
});
