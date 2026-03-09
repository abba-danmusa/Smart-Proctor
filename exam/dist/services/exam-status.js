"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExamLifecycleStatus = getExamLifecycleStatus;
exports.getStudentExamStatus = getStudentExamStatus;
function getExamLifecycleStatus(exam, now = new Date()) {
    if (exam.forceExpiredAt) {
        return 'expired';
    }
    if (now < exam.startAt) {
        return 'scheduled';
    }
    if (now > exam.endAt) {
        return 'expired';
    }
    return 'live';
}
function getStudentExamStatus(lifecycleStatus, attemptStatus) {
    if (attemptStatus === 'submitted') {
        return 'completed';
    }
    if (lifecycleStatus === 'live') {
        return 'active';
    }
    if (lifecycleStatus === 'scheduled') {
        return 'upcoming';
    }
    return 'expired';
}
