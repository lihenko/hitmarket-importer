"use strict";
// src/database/connection.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const env_1 = require("../config/env");
exports.db = promise_1.default.createPool({
    host: env_1.env.dbHost,
    user: env_1.env.dbUser,
    password: env_1.env.dbPassword,
    database: env_1.env.dbName,
    waitForConnections: true,
    connectionLimit: 10,
});
//# sourceMappingURL=connection.js.map