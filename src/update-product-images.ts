import path from "node:path";

import type { RowDataPacket } from "mysql2";

import { db } from "./database/connection";
import { saveProductImage } from "./importer/save-product-image";


/**
 * ============================================================
 * UPDATE PRODUCT IMAGES
 * ============================================================
 *
 * Перезавантажує зображення конкретного товару.
 *
 * Використання:
 *
 * npx tsx src/update-product-images.ts 12345
 *
 * ============================================================
 */


/**
 * ------------------------------------------------------------
 * TYPES
 * ------------------------------------------------------------
 */

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
}


interface ProductImageRow extends RowDataPacket {
  id: number;
  product_id: number;
  source_url: string;
  local_path: string | null;
  source_hash: string | null;
  sort_order: number;
}


/**
 * ------------------------------------------------------------
 * ARGUMENTS
 * ------------------------------------------------------------
 */

const args =
  process.argv.slice(2);


const productIdArg =
  args.find(
    (arg) =>
      !arg.startsWith("--")
  );


/**
 * ------------------------------------------------------------
 * PRODUCT ID VALIDATION
 * ------------------------------------------------------------
 */

if (!productIdArg) {

  console.error();
  console.error(
    "❌ Product ID is required."
  );

  console.error();

  console.error(
    "Usage:"
  );

  console.error(
    "npx tsx src/update-product-images.ts 12345"
  );

  console.error();

  process.exit(1);
}


const productId =
  Number(productIdArg);


if (
  !Number.isInteger(productId) ||
  productId <= 0
) {

  console.error(
    `❌ Invalid product ID: ${productIdArg}`
  );

  process.exit(1);
}


/**
 * ============================================================
 * MAIN
 * ============================================================
 */

async function main() {

  try {

    console.log(
      "================================="
    );

    console.log(
      "🖼️ UPDATE PRODUCT IMAGES"
    );

    console.log(
      "================================="
    );

    console.log();

    console.log(
      `Product ID: ${productId}`
    );

    console.log();


    /**
     * --------------------------------------------------------
     * FIND PRODUCT
     * --------------------------------------------------------
     */

    const [
      productRows,
    ] =
      await db.execute<ProductRow[]>(
        `
          SELECT
            id,
            name
          FROM products
          WHERE id = ?
          LIMIT 1
        `,
        [productId]
      );


    const product =
      productRows[0];


    if (!product) {

      console.error(
        `❌ Product ${productId} not found`
      );

      return;
    }


    console.log(
      `📦 Product: ${product.name}`
    );

    console.log();


    /**
     * --------------------------------------------------------
     * FIND IMAGES
     * --------------------------------------------------------
     */

    const [
      imageRows,
    ] =
      await db.execute<ProductImageRow[]>(
        `
          SELECT
            id,
            product_id,
            source_url,
            local_path,
            source_hash,
            sort_order
          FROM product_images
          WHERE product_id = ?
          ORDER BY
            sort_order ASC,
            id ASC
        `,
        [productId]
      );


    /**
     * --------------------------------------------------------
     * NO IMAGES
     * --------------------------------------------------------
     */

    if (
      imageRows.length === 0
    ) {

      console.log(
        "⚠️ No images found in product_images."
      );

      return;
    }


    console.log(
      `🖼️ Images found: ${imageRows.length}`
    );

    console.log();


    /**
     * --------------------------------------------------------
     * COUNTERS
     * --------------------------------------------------------
     */

    let downloaded = 0;

    let skipped = 0;

    let failed = 0;


    /**
     * --------------------------------------------------------
     * PROCESS IMAGES
     * --------------------------------------------------------
     */

    for (
      const [
        index,
        image,
      ]
      of imageRows.entries()
    ) {

      console.log(
        "---------------------------------"
      );

      console.log(
        `🖼️ Image ${index + 1}/${imageRows.length}`
      );

      console.log(
        `DB image ID: ${image.id}`
      );

      console.log(
        `Source URL: ${image.source_url}`
      );

      console.log(
        `Local path: ${image.local_path ?? "NULL"}`
      );

      console.log();


      try {

        /**
         * ----------------------------------------------------
         * CHECK SOURCE URL
         * ----------------------------------------------------
         */

        if (
          !image.source_url ||
          image.source_url.trim() === ""
        ) {

          console.log(
            "⏭️ Skipped: source_url is empty"
          );

          skipped++;

          continue;
        }


        /**
         * ----------------------------------------------------
         * DETERMINE FILE NAME
         * ----------------------------------------------------
         *
         * Якщо local_path вже є:
         *
         * /products/example.webp
         *
         * використовуємо:
         *
         * example
         *
         * saveProductImage() додасть .webp.
         *
         *
         * Якщо local_path відсутній:
         *
         * product-12345-678
         */

        let fileName: string;


        if (
          image.local_path &&
          image.local_path.trim() !== ""
        ) {

          const baseName =
            path.basename(
              image.local_path
            );


          fileName =
            path.parse(
              baseName
            ).name;

        } else {

          fileName =
            `product-${productId}-${image.id}`;

        }


        console.log(
          `📁 File name: ${fileName}`
        );


        /**
         * ----------------------------------------------------
         * DOWNLOAD IMAGE
         * ----------------------------------------------------
         *
         * Використовуємо існуючий
         * saveProductImage().
         *
         * Ніякого OpenAI.
         * Ніякого importProduct().
         */

        const localPath =
          await saveProductImage(
            image.source_url,
            fileName
          );


        /**
         * ----------------------------------------------------
         * IMAGE TOO SMALL
         * ----------------------------------------------------
         */

        if (
          localPath === null
        ) {

          console.log(
            "⏭️ Image skipped because it is smaller than 400×400."
          );

          skipped++;

          continue;
        }


        /**
         * ----------------------------------------------------
         * UPDATE LOCAL PATH IF NEEDED
         * ----------------------------------------------------
         */

        if (
          image.local_path !==
          localPath
        ) {

          await db.execute(
            `
              UPDATE product_images
              SET
                local_path = ?
              WHERE id = ?
            `,
            [
              localPath,
              image.id,
            ]
          );


          console.log(
            `🔄 local_path updated: ${localPath}`
          );

        } else {

          console.log(
            `📍 local_path: ${localPath}`
          );

        }


        downloaded++;


        console.log(
          "✅ Image downloaded successfully"
        );


      } catch (error) {

        failed++;


        console.error(
          "❌ Image download failed:"
        );

        console.error(
          error
        );

      }


      console.log();

    }


    /**
     * --------------------------------------------------------
     * SUMMARY
     * --------------------------------------------------------
     */

    console.log();
    console.log(
      "================================="
    );

    console.log(
      "📊 IMAGE UPDATE SUMMARY"
    );

    console.log(
      "================================="
    );

    console.log(
      `Product ID: ${productId}`
    );

    console.log(
      `Product: ${product.name}`
    );

    console.log(
      `Images in database: ${imageRows.length}`
    );

    console.log(
      `Downloaded: ${downloaded}`
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

    console.log();


    /**
     * --------------------------------------------------------
     * RESULT
     * --------------------------------------------------------
     */

    if (
      failed > 0
    ) {

      console.log(
        "⚠️ Image update completed with errors."
      );

      process.exitCode = 1;

    } else {

      console.log(
        "✅ Image update completed successfully."
      );

    }


  } catch (error) {

    console.error();
    console.error(
      "❌ UPDATE PRODUCT IMAGES FAILED"
    );

    console.error(
      error
    );

    process.exitCode = 1;

  } finally {

    /**
     * --------------------------------------------------------
     * CLOSE DATABASE
     * --------------------------------------------------------
     */

    await db.end();

  }

}


/**
 * ============================================================
 * RUN
 * ============================================================
 */

main();