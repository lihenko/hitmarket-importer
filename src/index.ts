import { readFile } from "node:fs/promises";

import { parseYmlFile } from "./feeds/yml-parser";
import { importProduct } from "./importer/import-product";

import { db } from "./database/connection";

import {
  startImportRun,
  finishImportRun,
} from "./database/import-runs";


/**
 * ============================================================
 * MAIN IMPORT
 * ============================================================
 */

async function main() {

  let runId: number | null = null;

  try {

    console.log("=================================");
    console.log("🚀 HITMARKET IMPORT");
    console.log("=================================");
    console.log();


    /**
     * --------------------------------------------------------
     * ШЛЯХ ДО ФІДА
     * --------------------------------------------------------
     */

    const feedPath =
      "src/feeds/products_feed.xml";


    /**
     * --------------------------------------------------------
     * ПЕРЕВІРЯЄМО ФАЙЛ
     * --------------------------------------------------------
     */

    await readFile(
      feedPath,
      "utf8"
    );


    console.log(
      `📦 Reading feed: ${feedPath}`
    );


    /**
     * --------------------------------------------------------
     * ПОЧАТОК IMPORT RUN
     * --------------------------------------------------------
     */

    runId =
      await startImportRun(
        "products_feed.xml"
      );


    console.log(
      `🆔 Import run ID: ${runId}`
    );

    console.log();


    /**
     * --------------------------------------------------------
     * ПАРСИМО ФІД
     * --------------------------------------------------------
     */

    const products =
      await parseYmlFile(
        feedPath
      );


    console.log(
      `📦 Products in feed: ${products.length}`
    );

    console.log();


    /**
     * --------------------------------------------------------
     * ЛІЧИЛЬНИКИ
     * --------------------------------------------------------
     */

    let created = 0;

    let updated = 0;

    let unchanged = 0;

    let skipped = 0;

    let failed = 0;


    /**
     * --------------------------------------------------------
     * ІМПОРТ ВСІХ ТОВАРІВ
     * --------------------------------------------------------
     *
     * Тут більше НЕМАЄ:
     *
     * products.slice(...)
     *
     * Обробляємо весь фід.
     */

    for (
      const [
        index,
        product,
      ]
      of products.entries()
    ) {

      console.log(
        "================================="
      );

      console.log(
        `📦 Product ${index + 1}/${products.length}`
      );

      console.log(
        `ID: ${product.sourceOfferId}`
      );

      console.log(
        `Name: ${product.name}`
      );

      console.log(
        `Available: ${product.available}`
      );

      console.log(
        "================================="
      );


      try {

        const result =
          await importProduct(
            product
          );


        console.log(
          `✅ Result: ${result.status}`
        );


        switch (
          result.status
        ) {

          case "created":

            created++;

            break;


          case "updated":

            updated++;

            break;


          case "unchanged":

            unchanged++;

            break;


          case "skipped":

            skipped++;

            break;

        }


      } catch (error) {

        failed++;


        console.error(
          "❌ Product import failed:"
        );

        console.error(
          error
        );

      }


      console.log();

    }


    /**
     * --------------------------------------------------------
     * ПІДСУМОК
     * --------------------------------------------------------
     */

    console.log();
    console.log("=================================");
    console.log("📊 IMPORT SUMMARY");
    console.log("=================================");

    console.log(
      `Total offers: ${products.length}`
    );

    console.log(
      `Created: ${created}`
    );

    console.log(
      `Updated: ${updated}`
    );

    console.log(
      `Unchanged: ${unchanged}`
    );

    console.log(
      `Skipped: ${skipped}`
    );

    console.log(
      `Failed: ${failed}`
    );

    console.log(
      "=================================");


    /**
     * --------------------------------------------------------
     * ЗАВЕРШУЄМО IMPORT RUN
     * --------------------------------------------------------
     */

    if (runId !== null) {

      await finishImportRun(
        runId,
        {
          totalOffers:
            products.length,

          status:
            failed > 0
              ? "completed"
              : "completed",
        }
      );

    }


    console.log();
    console.log(
      "✅ Import finished"
    );


  } catch (error) {

    console.error();
    console.error(
      "❌ IMPORT FAILED"
    );

    console.error(
      error
    );


    /**
     * --------------------------------------------------------
     * Якщо import run вже створений,
     * позначаємо його завершеним.
     * --------------------------------------------------------
     *
     * Поки використовуємо тільки ті поля,
     * які вже є у твоєму finishImportRun.
     */

    if (runId !== null) {

      try {

        await finishImportRun(
          runId,
          {
            totalOffers: 0,
            status: "completed",
          }
        );

      } catch (finishError) {

        console.error(
          "❌ Failed to finish import run:"
        );

        console.error(
          finishError
        );

      }

    }


    process.exitCode = 1;


  } finally {

    /**
     * --------------------------------------------------------
     * ЗАКРИВАЄМО MYSQL
     * --------------------------------------------------------
     */

    await db.end();

  }

}


main();