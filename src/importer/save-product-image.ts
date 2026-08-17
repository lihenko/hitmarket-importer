import {
  mkdir,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import sharp from "sharp";


/**
 * ============================================================
 * POWERBANK PROJECT
 * ============================================================
 *
 * Структура:
 *
 * 2026/
 * ├── hitmarket-importer/
 * └── powerbank-landing/
 *
 * Зображення:
 *
 * powerbank-landing/public/products
 *
 * Шлях визначаємо відносно importer.
 */


/**
 * Поточний файл:
 *
 * hitmarket-importer/src/importer/save-product-image.ts
 *
 * Потрібно піднятися:
 *
 * save-product-image.ts
 *        ↓
 * importer
 *        ↓
 * src
 *        ↓
 * hitmarket-importer
 *
 * Потім:
 *
 * ../..
 *
 * і перейти в powerbank-landing.
 */
const POWERBANK_PROJECT_DIR =
  path.resolve(
    process.cwd(),
    "..",
    "powerbank-landing"
  );


/**
 * Директорія для зображень товарів.
 */
const PRODUCTS_DIR =
  path.join(
    POWERBANK_PROJECT_DIR,
    "public",
    "products"
  );


/**
 * Мінімальний розмір зображення.
 */
const MIN_IMAGE_WIDTH = 400;
const MIN_IMAGE_HEIGHT = 400;


/**
 * ============================================================
 * SAVE PRODUCT IMAGE
 * ============================================================
 *
 * Завантажує зображення постачальника.
 *
 * Якщо зображення менше 400×400 —
 * воно НЕ зберігається.
 *
 * Якщо зображення 400×400 або більше:
 *
 * WEBP:
 *   → зберігаємо оригінальний buffer
 *
 * Інший формат:
 *   → конвертуємо у WebP
 *
 * @returns
 *
 * /products/example.webp
 *
 * або
 *
 * null
 *
 * якщо зображення занадто маленьке.
 */
export async function saveProductImage(
  imageUrl: string,
  fileName: string
): Promise<string | null> {

  /**
   * ----------------------------------------------------------
   * Директорія
   * ----------------------------------------------------------
   */

  await mkdir(
    PRODUCTS_DIR,
    {
      recursive: true,
    }
  );


  /**
   * ----------------------------------------------------------
   * DOWNLOAD
   * ----------------------------------------------------------
   */

  console.log(
    `🖼️ Downloading image: ${imageUrl}`
  );


  const response =
    await fetch(imageUrl);


  if (!response.ok) {

    throw new Error(
      `Failed to download image: ${imageUrl} ` +
      `(${response.status} ${response.statusText})`
    );

  }


  /**
   * ----------------------------------------------------------
   * BUFFER
   * ----------------------------------------------------------
   */

  const arrayBuffer =
    await response.arrayBuffer();

  const inputBuffer =
    Buffer.from(arrayBuffer);


  /**
   * ----------------------------------------------------------
   * IMAGE METADATA
   * ----------------------------------------------------------
   *
   * Визначаємо:
   *
   * - width
   * - height
   * - format
   */

  const metadata =
    await sharp(inputBuffer)
      .metadata();


  const width =
    metadata.width ?? 0;

  const height =
    metadata.height ?? 0;


  console.log(
    `📐 Image size: ${width}×${height}`
  );


  /**
   * ----------------------------------------------------------
   * MINIMUM SIZE CHECK
   * ----------------------------------------------------------
   *
   * Пропускаємо зображення,
   * якщо хоча б одна сторона менша за 400.
   *
   * Наприклад:
   *
   * 399×500  → skip
   * 500×399  → skip
   * 300×300  → skip
   *
   * 400×400  → OK
   * 1200×630 → OK
   * 800×600  → OK
   */

  if (
    width < MIN_IMAGE_WIDTH ||
    height < MIN_IMAGE_HEIGHT
  ) {

    console.log(
      `⏭️ Skipping small image: ` +
      `${width}×${height} ` +
      `(minimum ${MIN_IMAGE_WIDTH}×${MIN_IMAGE_HEIGHT})`
    );


    return null;
  }


  /**
   * ----------------------------------------------------------
   * SAFE FILE NAME
   * ----------------------------------------------------------
   */

  const safeFileName =
    fileName
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]+/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^-|-$/g,
        ""
      );


  const finalFileName =
    `${safeFileName}.webp`;


  const outputPath =
    path.join(
      PRODUCTS_DIR,
      finalFileName
    );


  /**
   * ----------------------------------------------------------
   * WEBP
   * ----------------------------------------------------------
   *
   * Якщо постачальник вже дає WebP —
   * не перекодовуємо.
   */

  if (
    metadata.format === "webp"
  ) {

    await writeFile(
      outputPath,
      inputBuffer
    );


    console.log(
      `✅ Saved WebP: ${outputPath}`
    );


    return `/products/${finalFileName}`;
  }


  /**
   * ----------------------------------------------------------
   * CONVERT TO WEBP
   * ----------------------------------------------------------
   */

  await sharp(inputBuffer)
    .webp({
      quality: 85,
    })
    .toFile(outputPath);


  console.log(
    `✅ Converted to WebP: ${outputPath}`
  );


  return `/products/${finalFileName}`;
}