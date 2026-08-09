import {
  mkdir,
  writeFile,
} from "node:fs/promises";

import os from "node:os";
import path from "node:path";

import sharp from "sharp";


/**
 * Коренева директорія проекту powerbank-landing.
 *
 * Очікується структура:
 *
 * /home/vlad/
 * ├── hitmarket-importer/
 * └── powerbank-landing/
 */
const POWERBANK_PROJECT_DIR =
  path.join(
    os.homedir(),
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
 * Завантажує та зберігає зображення товару.
 *
 * Якщо зображення вже WebP:
 *   → просто зберігаємо оригінальний Buffer
 *
 * Якщо інший формат:
 *   → конвертуємо в WebP
 *
 * @param imageUrl URL зображення постачальника
 * @param fileName Ім'я файлу без розширення
 *
 * @returns Публічний шлях:
 *          /products/example.webp
 */
export async function saveProductImage(
  imageUrl: string,
  fileName: string
): Promise<string> {

  /**
   * Створюємо директорію,
   * якщо її ще немає.
   */
  await mkdir(
    PRODUCTS_DIR,
    {
      recursive: true,
    }
  );


  /**
   * Завантажуємо зображення.
   */
  const response =
    await fetch(imageUrl);


  if (!response.ok) {

    throw new Error(
      `Failed to download image: ${imageUrl} ` +
      `(${response.status} ${response.statusText})`
    );

  }


  /**
   * Отримуємо binary data.
   */
  const arrayBuffer =
    await response.arrayBuffer();

  const inputBuffer =
    Buffer.from(arrayBuffer);


  /**
   * Визначаємо реальний формат
   * зображення.
   */
  const metadata =
    await sharp(inputBuffer)
      .metadata();


  /**
   * Очищаємо ім'я файлу.
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
   * WEBP
   *
   * Нічого не перекодовуємо.
   * Просто записуємо оригінальний файл.
   */
  if (metadata.format === "webp") {

    await writeFile(
      outputPath,
      inputBuffer
    );

    return `/products/${finalFileName}`;
  }


  /**
   * Інші формати:
   *
   * JPG
   * PNG
   * GIF
   * AVIF
   * TIFF
   * тощо
   *
   * конвертуємо у WebP.
   */
  await sharp(inputBuffer)
    .webp({
      quality: 85,
    })
    .toFile(outputPath);


  return `/products/${finalFileName}`;
}
