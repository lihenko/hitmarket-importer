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
     * ФІЛЬТР КАТЕГОРІЇ
     * --------------------------------------------------------
     *
     * Запуск:
     *
     * npx tsx src/index.ts --category=70180949
     *
     * Якщо --category не переданий,
     * імпортується весь фід.
     */

    const categoryArg =
      process.argv.find(
        (arg) =>
          arg.startsWith("--category=")
      );

    const targetCategoryId =
      categoryArg
        ? categoryArg
            .split("=")[1]
        : null;


    /**
     * --------------------------------------------------------
     * ІНФОРМАЦІЯ ПРО ФІЛЬТР
     * --------------------------------------------------------
     */

    if (targetCategoryId) {

      console.log(
        `🎯 Category filter: ${targetCategoryId}`
      );

    } else {

      console.log(
        "🎯 Category filter: ALL"
      );

    }

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
     * ФІЛЬТРУЄМО ТОВАРИ ПО КАТЕГОРІЇ
     * --------------------------------------------------------
     */

    const productsToImport =
      targetCategoryId
        ? products.filter(
            (product) =>
              product.category?.id ===
              targetCategoryId
          )
        : products;


    /**
     * --------------------------------------------------------
     * ІНФОРМАЦІЯ ПРО ВІДІБРАНІ ТОВАРИ
     * --------------------------------------------------------
     */

    console.log(
      `🎯 Products selected for import: ${productsToImport.length}`
    );

    if (targetCategoryId) {

      const categoryNames =
        new Set(
          productsToImport
            .map(
              product =>
                product.category?.name
            )
            .filter(Boolean)
        );


      for (
        const categoryName
        of categoryNames
      ) {

        console.log(
          `📂 Category: ${categoryName}`
        );

      }

    }

    console.log();


    /**
     * --------------------------------------------------------
     * ЯКЩО ТОВАРІВ НЕМАЄ
     * --------------------------------------------------------
     */

    if (
      targetCategoryId &&
      productsToImport.length === 0
    ) {

      console.log(
        `⚠️ No products found for category ${targetCategoryId}`
      );

      console.log();

      if (runId !== null) {

        await finishImportRun(
          runId,
          {
            totalOffers: 0,
            status: "completed",
          }
        );

      }

      return;

    }


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
     * ІМПОРТ ТОВАРІВ
     * --------------------------------------------------------
     */

    for (
      const [
        index,
        product,
      ]
      of productsToImport.entries()
    ) {

      console.log(
        "================================="
      );

      console.log(
        `📦 Product ${index + 1}/${productsToImport.length}`
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
        `Category ID: ${product.category?.id ?? "none"}`
      );

      console.log(
        `Category: ${product.category?.name ?? "none"}`
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
      `Total offers in feed: ${products.length}`
    );

    console.log(
      `Selected for import: ${productsToImport.length}`
    );

    if (targetCategoryId) {

      console.log(
        `Category ID: ${targetCategoryId}`
      );

    }

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
      "================================="
    );


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
            productsToImport.length,

          status:
            "completed",
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