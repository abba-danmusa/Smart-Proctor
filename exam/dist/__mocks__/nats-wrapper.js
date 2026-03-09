"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.natsWrapper = void 0;
exports.natsWrapper = {
    client: {
        publish: jest.fn().mockImplementation((_subject, _data, callback) => {
            callback();
        })
    }
};
