import path from "node:path";

import { db } from "./database/connection";

import {
  parseYmlFile,
} from "./feeds/yml-parser";

import {
  importProduct,
} from "./importer/import-product";


async function main() {

  const filePath =
    path.resolve(
      "src/feeds/products_feed.xml"
    );

  console.log("🚀 YML import started");

  console.log(
    `Feed: ${filePath}`
  );


  const products =
    await parseYmlFile(
      filePath
    );


  console.log(
    `Products in feed: ${products.length}`
  );


  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;


  for (
    const [index, product]
    of products.entries()
  ) {

    try {

      const result =
        await importProduct(
          product
        );


      if (
        result.status ===
        "created"
      ) {
        created++;
      }

      else if (
        result.status ===
        "updated"
      ) {
        updated++;
      }

      else if (
        result.status ===
        "skipped"
      ) {
        skipped++;
      }


      console.log(
        `[${index + 1}/${products.length}]`,
        product.name,
        "→",
        result.status
      );

    } catch (error) {

      errors++;

      console.error(
        `❌ ${product.sourceOfferId}`,
        product.name,
        error
      );

    }

  }


  console.log("");
  console.log("✅ YML import finished");

  console.log({
    total: products.length,
    created,
    updated,
    skipped,
    errors,
  });


  await db.end();

}


main().catch(error => {

  console.error(
    "❌ Import failed:",
    error
  );

  process.exit(1);

});