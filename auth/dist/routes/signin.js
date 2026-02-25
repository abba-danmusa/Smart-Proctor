"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signinRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const medlink_common_1 = require("@danmusa/medlink-common");
const password_1 = require("../services/password");
const User_1 = require("../models/User");
const router = express_1.default.Router();
exports.signinRouter = router;
router.post('/api/users/signin', [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Email must be valid'),
    (0, express_validator_1.body)('password')
        .trim()
        .notEmpty()
        .withMessage('You must supply a password')
], medlink_common_1.validateRequest, async (req, res) => {
    const { email, password } = req.body;
    const user = await User_1.User.findOne({ email });
    if (!user) {
        throw new medlink_common_1.BadRequestError('Invalid Credentials');
    }
    const passwordsMatch = await password_1.Password.compare(user.password, password);
    if (!passwordsMatch) {
        throw new medlink_common_1.BadRequestError('Invalid Credentials');
    }
    const userJwt = jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email
    }, process.env.JWT_SECRET);
    req.session = {
        jwt: userJwt
    };
    res.status(200).send({ user, token: userJwt });
});
