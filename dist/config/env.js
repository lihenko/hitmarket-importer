"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
}
exports.env = {
    dbHost: requiredEnv("DB_HOST"),
    dbUser: requiredEnv("DB_USER"),
    dbPassword: requiredEnv("DB_PASSWORD"),
    dbName: requiredEnv("DB_NAME"),
};
//# sourceMappingURL=env.js.map