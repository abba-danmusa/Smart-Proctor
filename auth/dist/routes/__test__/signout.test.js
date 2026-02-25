"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
describe('Signout', () => {
    it('clears the cookie after signing out', async () => {
        await (0, supertest_1.default)(app_1.app)
            .post('/api/users/signup')
            .send({
            name: 'Test User',
            email: 'test@test.com',
            password: 'password',
            role: 'doctor'
        })
            .expect(201);
        const response = await (0, supertest_1.default)(app_1.app)
            .post('/api/users/signout')
            .send({})
            .expect(200);
        const setCookie = response.get('Set-Cookie');
        expect(setCookie).toBeDefined();
        expect(setCookie?.[0]).toMatch(/session=.*expires=.*httponly/);
    });
    it('returns 200 when signing out without being signed in', async () => {
        await (0, supertest_1.default)(app_1.app)
            .post('/api/users/signout')
            .send({})
            .expect(200);
    });
});
