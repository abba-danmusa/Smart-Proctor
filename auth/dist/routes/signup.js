"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const medlink_common_1 = require("@danmusa/medlink-common");
const user_created_publisher_1 = require("../events/publishers/user-created-publisher");
const nats_wrapper_1 = require("../nats-wrapper");
const router = express_1.default.Router();
exports.signupRouter = router;
router.post('/api/users/signup', [
    (0, express_validator_1.body)().custom((value) => {
        const candidateName = value?.fullName ?? value?.name;
        if (typeof candidateName !== 'string' || !candidateName.trim()) {
            throw new Error('Full name is required');
        }
        if (candidateName.trim().length < 3) {
            throw new Error('Name must be at least 3 characters long');
        }
        if (candidateName.trim().split(/\s+/).length < 2) {
            throw new Error('Name must include both first and last name');
        }
        return true;
    }),
    (0, express_validator_1.body)('organization')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Organization must be at least 2 characters long'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password')
        .trim()
        .isLength({ min: 8, max: 20 })
        .withMessage('Password must be between 8 and 20 characters long'),
    (0, express_validator_1.body)('role')
        .optional()
        .isIn(['doctor', 'nurse', 'student', 'lecturer', 'admin'])
        .withMessage('Invalid role'),
    (0, express_validator_1.body)('termsAccepted')
        .optional()
        .isBoolean()
        .withMessage('termsAccepted must be a boolean'),
    (0, express_validator_1.body)('aiConsent')
        .optional()
        .isBoolean()
        .withMessage('aiConsent must be a boolean'),
    (0, express_validator_1.body)('faceCapture')
        .optional()
        .isString()
        .isLength({ min: 16 })
        .withMessage('faceCapture must be a valid image data string'),
], medlink_common_1.validateRequest, async (req, res) => {
    const { fullName, name, organization, email, password, role, termsAccepted, aiConsent, faceCapture, ...otherDetails } = req.body;
    const candidateName = (fullName ?? name);
    const [firstName, ...rest] = candidateName.trim().split(/\s+/);
    const lastName = rest.join(' ');
    if (!firstName || !lastName) {
        throw new medlink_common_1.BadRequestError('Name must include both first and last name');
    }
    const existingUser = await User_1.User.findOne({ email });
    if (existingUser) {
        throw new medlink_common_1.BadRequestError('Email in use');
    }
    const user = new User_1.User({
        firstName,
        lastName,
        organization,
        email,
        password,
        role,
        termsAccepted,
        aiConsent,
        faceCapture,
        ...otherDetails
    });
    await user.save();
    const eventRole = user.role === 'doctor' || user.role === 'nurse' ? user.role : undefined;
    await new user_created_publisher_1.UserCreatedPublisher(nats_wrapper_1.natsWrapper.client).publish({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: eventRole,
        phone: user.phone,
        country: user.country,
        city: user.city,
        specialization: user.specialization,
        yearsOfExperience: user.yearsOfExperience,
        licenseNumber: user.licenseNumber,
        licenseCountry: user.licenseCountry,
        licenseFileUrl: user.licenseFileUrl,
        profileImageUrl: user.profileImageUrl,
        locale: user.locale,
        bio: user.bio,
        languages: user.languages,
        documents: user.documents,
        availability: user.availability?.map(({ day, from, to }) => ({ day, from, to })),
        approved: user.approved,
    });
    const userJwt = jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email
    }, process.env.JWT_SECRET);
    req.session = {
        jwt: userJwt
    };
    res.status(201).send({ user, token: userJwt });
});
