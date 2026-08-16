"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveProductImage = saveProductImage;
const promises_1 = require("node:fs/promises");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const sharp_1 = __importDefault(require("sharp"));
/**
 * Коренева директорія проекту powerbank-landing.
 *
 * Очікується структура:
 *
 * /home/vlad/
 * ├── hitmarket-importer/
 * └── powerbank-landing/
 */
const POWERBANK_PROJECT_DIR = node_path_1.default.join(node_os_1.default.homedir(), "powerbank-landing");
/**
 * Директорія для зображень товарів.
 */
const PRODUCTS_DIR = node_path_1.default.join(POWERBANK_PROJECT_DIR, "public", "products");
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
async function saveProductImage(imageUrl, fileName) {
    /**
     * Створюємо директорію,
     * якщо її ще немає.
     */
    await (0, promises_1.mkdir)(PRODUCTS_DIR, {
        recursive: true,
    });
    /**
     * Завантажуємо зображення.
     */
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${imageUrl} ` +
            `(${response.status} ${response.statusText})`);
    }
    /**
     * Отримуємо binary data.
     */
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    /**
     * Визначаємо реальний формат
     * зображення.
     */
    const metadata = await (0, sharp_1.default)(inputBuffer)
        .metadata();
    /**
     * Очищаємо ім'я файлу.
     */
    const safeFileName = fileName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    const finalFileName = `${safeFileName}.webp`;
    const outputPath = node_path_1.default.join(PRODUCTS_DIR, finalFileName);
    /**
     * WEBP
     *
     * Нічого не перекодовуємо.
     * Просто записуємо оригінальний файл.
     */
    if (metadata.format === "webp") {
        await (0, promises_1.writeFile)(outputPath, inputBuffer);
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
    await (0, sharp_1.default)(inputBuffer)
        .webp({
        quality: 85,
    })
        .toFile(outputPath);
    return `/products/${finalFileName}`;
}
//# sourceMappingURL=save-product-image.js.map