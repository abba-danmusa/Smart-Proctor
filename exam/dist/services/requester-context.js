"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequesterContext = getRequesterContext;
const medlink_common_1 = require("@danmusa/medlink-common");
const USER_ROLES = new Set(['student', 'lecturer', 'admin']);
function asNonEmptyString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
function parseRole(value) {
    const parsed = asNonEmptyString(value);
    if (!parsed || !USER_ROLES.has(parsed)) {
        return undefined;
    }
    return parsed;
}
function getRequesterContext(req) {
    const currentUser = (req.currentUser ?? {});
    const id = asNonEmptyString(currentUser.id);
    const email = asNonEmptyString(currentUser.email);
    if (!id || !email) {
        throw new medlink_common_1.NotAuthorizedError();
    }
    const role = parseRole(currentUser.role ?? req.get('x-user-role'));
    if (!role) {
        throw new medlink_common_1.BadRequestError('Requester role is missing from authenticated context');
    }
    return {
        id,
        email,
        role,
        institution: asNonEmptyString(currentUser.institution ?? req.get('x-user-institution')),
        fullName: asNonEmptyString(currentUser.fullName ?? req.get('x-user-full-name')),
    };
}
