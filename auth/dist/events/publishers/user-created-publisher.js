"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCreatedPublisher = void 0;
const medlink_common_1 = require("@danmusa/medlink-common");
class UserCreatedPublisher extends medlink_common_1.Publisher {
    constructor() {
        super(...arguments);
        this.subject = medlink_common_1.Subjects.UserCreated;
    }
}
exports.UserCreatedPublisher = UserCreatedPublisher;
