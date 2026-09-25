"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionValidationError = exports.CapabilityNeedsError = void 0;
class CapabilityNeedsError extends Error {
    needs;
    constructor(needs) {
        super("capability_needs");
        this.needs = needs;
    }
}
exports.CapabilityNeedsError = CapabilityNeedsError;
class MissionValidationError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
exports.MissionValidationError = MissionValidationError;
