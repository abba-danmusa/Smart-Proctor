"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const password_1 = require("../services/password");
const availabilitySlotSchema = new mongoose_1.Schema({
    day: { type: String, required: true, trim: true },
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
}, { _id: false });
const userSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        required: true,
        minlength: 3,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        minlength: 3,
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
        enum: ['doctor', 'nurse', 'student', 'lecturer', 'admin', undefined],
    },
    organization: {
        type: String,
        trim: true,
    },
    termsAccepted: {
        type: Boolean,
        default: false,
    },
    aiConsent: {
        type: Boolean,
        default: false,
    },
    faceCapture: {
        type: String,
    },
    phone: {
        type: String,
        trim: true,
    },
    country: {
        type: String,
        trim: true,
    },
    city: {
        type: String,
        trim: true,
    },
    specialization: {
        type: [String],
        default: [],
    },
    yearsOfExperience: {
        type: Number,
        min: 0,
    },
    licenseNumber: {
        type: String,
        trim: true,
    },
    licenseCountry: {
        type: String,
        trim: true,
    },
    licenseFileUrl: {
        type: String,
        trim: true,
    },
    profileImageUrl: {
        type: String,
        trim: true,
    },
    locale: {
        type: String,
    },
    bio: {
        type: String,
        trim: true,
    },
    languages: {
        type: [String],
        default: [],
    },
    documents: {
        type: [String],
        default: [],
    },
    availability: {
        type: [availabilitySlotSchema],
        default: [{ day: 'mon', from: '09:00', to: '17:00' }],
    },
    approved: {
        type: Boolean,
        default: false,
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
