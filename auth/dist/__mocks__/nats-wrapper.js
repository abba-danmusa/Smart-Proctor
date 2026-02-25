"use strict";
/// <reference types="jest" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.natsWrapper = void 0;
exports.natsWrapper = {
    client: {
        publish: jest.fn().mockImplementation((subject, data, callback) => {
            callback();
        })
    }
};
