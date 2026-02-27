"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const password_1 = require("../services/password");
const userSchema = new mongoose_1.Schema({
    fullName: {
        type: String,
        required: true,
        minlength: 3,
        trim: true,
    },
    firstName: {
        type: String,
        required: true,
        minlength: 2,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        minlength: 2,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['student', 'lecturer', 'admin'],
        required: true,
    },
    studentId: {
        type: String,
        trim: true,
    },
    staffId: {
        type: String,
        trim: true,
    },
    institution: {
        type: String,
        trim: true,
    },
    department: {
        type: String,
        trim: true,
    },
    level: {
        type: String,
        trim: true,
    },
    aiConsent: {
        type: Boolean,
        default: false,
    },
    staffDocumentName: {
        type: String,
        trim: true,
    },
    faceCapture: {
        type: String,
    },
}, {
    toJSON: {
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret?._id;
            delete ret?.password;
        },
        versionKey: false,
    },
});
userSchema.pre('save', async function () {
    if (this.isModified('password')) {
        const hashed = await password_1.Password.toHash(this.get('password'));
        this.set('password', hashed);
    }
});
userSchema.statics.build = function (attrs) {
    return new this(attrs);
};
const User = (0, mongoose_1.model)('User', userSchema);
exports.User = User;
