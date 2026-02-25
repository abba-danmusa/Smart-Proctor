import request from 'supertest';
import { app } from '../../app';

describe('Signout', () => {
  it('clears the cookie after signing out', async () => {
    await request(app)
      .post('/api/users/signup')
      .send({
        name: 'Test User',
        email: 'test@test.com',
        password: 'password',
        role: 'doctor'
      })
      .expect(201);

    const response = await request(app)
      .post('/api/users/signout')
      .send({})
      .expect(200);

    const setCookie = response.get('Set-Cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie?.[0]).toMatch(/session=.*expires=.*httponly/)
  });
  
  it('returns 200 when signing out without being signed in', async () => {
    await request(app)
      .post('/api/users/signout')
      .send({})
      .expect(200);
  });
});
