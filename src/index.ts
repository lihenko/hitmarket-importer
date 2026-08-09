import { db } from "./database/connection";
import {
  startImportRun,
  finishImportRun,
} from "./database/import-runs";


async function main() {
  try {
    const runId = await startImportRun("test-feed");

    console.log("Import run ID:", runId);


    await finishImportRun(runId, {
      totalOffers: 0,
      status: "completed",
    });


    console.log("Finished");

  } catch (error) {
    console.error(error);

  } finally {
    await db.end();
  }
}

main();