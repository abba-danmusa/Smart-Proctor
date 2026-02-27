import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';

import { User, UserRole } from '../models/User';
import { BadRequestError, validateRequest } from '@danmusa/medlink-common';
import { UserCreatedPublisher } from '../events/publishers/user-created-publisher';
import { natsWrapper } from '../nats-wrapper';

const router = express.Router();

const parseName = (raw: unknown) => {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Full name is required');
  }

  const normalized = raw.trim().replace(/\s+/g, ' ');

  if (normalized.length < 3) {
    throw new Error('Name must be at least 3 characters long');
  }

  const [firstName, ...rest] = normalized.split(' ');
  const lastName = rest.join(' ').trim();

  if (!firstName || !lastName) {
    throw new Error('Name must include both first and last name');
  }

  return {
    fullName: normalized,
    firstName,
    lastName,
  };
};

router.post(
  '/api/users/signup',
  [
    body().custom((value) => {
      parseName(value?.fullName ?? value?.name);
      return true;
    }),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .trim()
      .isLength({ min: 8, max: 20 })
      .withMessage('Password must be between 8 and 20 characters long'),
    body('confirmPassword')
      .optional()
      .isString()
      .withMessage('confirmPassword must be a string'),
    body().custom((value) => {
      if (
        typeof value?.confirmPassword === 'string' &&
        value.confirmPassword !== value.password
      ) {
        throw new Error('Password and confirmPassword must match');
      }

      return true;
    }),
    body('role')
      .isIn(['student', 'lecturer', 'admin'])
      .withMessage('Invalid role'),
    body('studentId')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('studentId must be at least 2 characters long'),
    body('staffId')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('staffId must be at least 2 characters long'),
    body('institution')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('institution must be at least 2 characters long'),
    body('department')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('department must be at least 2 characters long'),
    body('level')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('level must not be empty'),
    body('aiConsent')
      .optional()
      .isBoolean()
      .withMessage('aiConsent must be a boolean'),
    body('staffDocumentName')
      .optional()
      .isString()
      .withMessage('staffDocumentName must be a string'),
    body('faceCapture')
      .isString()
      .isLength({ min: 16 })
      .withMessage('faceCapture must be a valid image data string'),
    body().custom((value) => {
      const role = value?.role as UserRole;
      const studentId = typeof value?.studentId === 'string' ? value.studentId.trim() : '';
      const staffId = typeof value?.staffId === 'string' ? value.staffId.trim() : '';
      const institution = typeof value?.institution === 'string' ? value.institution.trim() : '';
      const department = typeof value?.department === 'string' ? value.department.trim() : '';
      const level = typeof value?.level === 'string' ? value.level.trim() : '';
      const aiConsent = value?.aiConsent;

      if (role === 'student') {
        if (!studentId || !institution || !department || !level) {
          throw new Error('Student signup requires studentId, institution, department, and level');
        }

        if (aiConsent !== true) {
          throw new Error('Student signup requires aiConsent to be true');
        }
      }

      if (role === 'lecturer') {
        if (!staffId || !institution || !department) {
          throw new Error('Lecturer signup requires staffId, institution, and department');
        }
      }

      return true;
    }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const {
      fullName,
      name,
      email,
      password,
      role,
      studentId,
      staffId,
      institution,
      department,
      level,
      aiConsent,
      staffDocumentName,
      faceCapture,
    } = req.body;

    const parsedName = parseName(fullName ?? name);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new BadRequestError('Email in use');
    }

    const normalizedRole = role as UserRole;

    const user = User.build({
      fullName: parsedName.fullName,
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      email,
      password,
      role: normalizedRole,
      studentId: normalizedRole === 'student' ? studentId?.trim() : undefined,
      staffId: normalizedRole === 'lecturer' ? staffId?.trim() : undefined,
      institution: ['student', 'lecturer'].includes(normalizedRole)
        ? institution?.trim()
        : undefined,
      department: ['student', 'lecturer'].includes(normalizedRole)
        ? department?.trim()
        : undefined,
      level: normalizedRole === 'student' ? level?.trim() : undefined,
      aiConsent: normalizedRole === 'student' ? aiConsent === true : false,
      staffDocumentName:
        normalizedRole === 'lecturer' && typeof staffDocumentName === 'string' && staffDocumentName.trim().length > 0
          ? staffDocumentName.trim()
          : undefined,
      faceCapture,
    });

    await user.save();

    await new UserCreatedPublisher(natsWrapper.client).publish({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      organization: user.institution,
    });

    const userJwt = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET!
    );

    req.session = {
      jwt: userJwt,
    };

    res.status(201).send({ user, token: userJwt });
  }
);

export { router as signupRouter };
