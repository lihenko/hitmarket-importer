import { readFile } from "node:fs/promises";

import {
  parseMangalzavodFile,
} from "./feeds/mangalzavod-parser";

import { importProduct } from "./importer/import-product";

import { db } from "./database/connection";

import {
  startImportRun,
  finishImportRun,
} from "./database/import-runs";


/**
 * ============================================================
 * MANGALZAVOD IMPORT
 * ============================================================
 */

async function main() {

  let runId: number | null = null;

  try {

    console.log("=================================");
    console.log("🚀 HITMARKET MANGALZAVOD IMPORT");
    console.log("=================================");
    console.log();


    /**
     * --------------------------------------------------------
     * ФІЛЬТР КАТЕГОРІЇ
     * --------------------------------------------------------
     *
     * Запуск:
     *
     * npx tsx src/mangalzavod.ts --category=123
     *
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
     * ФІЛЬТР ТОВАРУ ПО ID
     * --------------------------------------------------------
     *
     * Запуск:
     *
     * npx tsx src/mangalzavod.ts --id=123456
     *
     */

    const idArg =
      process.argv.find(
        (arg) =>
          arg.startsWith("--id=")
      );

    const targetProductId =
      idArg
        ? idArg
            .split("=")[1]
        : null;


    /**
     * --------------------------------------------------------
     * LIMIT
     * --------------------------------------------------------
     *
     * Запуск:
     *
     * npx tsx src/mangalzavod.ts --limit=1
     *
     */

    const limitArg =
      process.argv.find(
        (arg) =>
          arg.startsWith("--limit=")
      );

    const limitValue =
      limitArg
        ? Number(
            limitArg
              .split("=")[1]
          )
        : null;

    const limit =
      limitValue !== null &&
      Number.isFinite(limitValue) &&
      limitValue > 0
        ? Math.floor(limitValue)
        : null;


    /**
     * --------------------------------------------------------
     * ІНФОРМАЦІЯ ПРО ФІЛЬТРИ
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


    if (targetProductId) {

      console.log(
        `🎯 Product ID filter: ${targetProductId}`
      );

    }


    if (limit !== null) {

      console.log(
        `🔢 Limit: ${limit}`
      );

    }


    console.log();


    /**
     * --------------------------------------------------------
     * ШЛЯХ ДО ФІДА
     * --------------------------------------------------------
     */

    const feedPath =
      "src/feeds/mangalzavod_products_feed.xml";


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
        "mangalzavod_products_feed.xml"
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
      await parseMangalzavodFile(
        feedPath
      );


    console.log(
      `📦 Products in feed: ${products.length}`
    );

    console.log();


    /**
     * --------------------------------------------------------
     * ФІЛЬТРУЄМО ТОВАРИ
     * --------------------------------------------------------
     */

    let productsToImport =
      products;


    /**
     * --------------------------------------------------------
     * ФІЛЬТР ПО ID
     * --------------------------------------------------------
     */

    if (targetProductId) {

      productsToImport =
        productsToImport.filter(
          (product) =>
            product.sourceOfferId ===
            targetProductId
        );

    }


    /**
     * --------------------------------------------------------
     * ФІЛЬТР ПО КАТЕГОРІЇ
     * --------------------------------------------------------
     */

    if (targetCategoryId) {

      productsToImport =
        productsToImport.filter(
          (product) =>
            product.category?.id ===
            targetCategoryId
        );

    }


    /**
     * --------------------------------------------------------
     * LIMIT
     * --------------------------------------------------------
     */

    if (limit !== null) {

      productsToImport =
        productsToImport.slice(
          0,
          limit
        );

    }


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


    /**
     * --------------------------------------------------------
     * ЯКЩО ТОВАР НЕ ЗНАЙДЕНО
     * --------------------------------------------------------
     */

    if (
      targetProductId &&
      productsToImport.length === 0
    ) {

      console.log(
        `⚠️ No product found with ID ${targetProductId}`
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
     * ЯКЩО ТОВАРІВ НЕМАЄ В КАТЕГОРІЇ
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
     * ЯКЩО LIMIT ДАВ 0 ТОВАРІВ
     * --------------------------------------------------------
     */

    if (
      productsToImport.length === 0
    ) {

      console.log(
        "⚠️ No products selected for import"
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
        `Price: ${product.price}`
      );

      console.log(
        `Old price: ${product.oldPrice ?? "none"}`
      );

      console.log(
        `Available: ${product.available}`
      );

      console.log(
        `Source: ${product.source}`
      );

      console.log(
        `Category ID: ${product.category?.id ?? "none"}`
      );

      console.log(
        `Category: ${product.category?.name ?? "none"}`
      );

      console.log(
        `Images: ${product.images.length}`
      );

      console.log(
        `Params: ${product.params.length}`
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
    console.log("📊 MANGALZAVOD IMPORT SUMMARY");
    console.log("=================================");

    console.log(
      `Total offers in feed: ${products.length}`
    );

    console.log(
      `Selected for import: ${productsToImport.length}`
    );


    if (targetProductId) {

      console.log(
        `Product ID: ${targetProductId}`
      );

    }


    if (targetCategoryId) {

      console.log(
        `Category ID: ${targetCategoryId}`
      );

    }


    if (limit !== null) {

      console.log(
        `Limit: ${limit}`
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
      "✅ Mangalzavod import finished"
    );


  } catch (error) {

    console.error();
    console.error(
      "❌ MANGALZAVOD IMPORT FAILED"
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