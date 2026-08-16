"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("./database/connection");
const import_runs_1 = require("./database/import-runs");
async function main() {
    try {
        const runId = await (0, import_runs_1.startImportRun)("test-feed");
        console.log("Import run ID:", runId);
        await (0, import_runs_1.finishImportRun)(runId, {
            totalOffers: 0,
            status: "completed",
        });
        console.log("Finished");
    }
    catch (error) {
        console.error(error);
    }
    finally {
        await connection_1.db.end();
    }
}
main();
//# sourceMappingURL=index.js.map