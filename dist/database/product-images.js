"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductImages = getProductImages;
exports.getImageBySourceUrl = getImageBySourceUrl;
exports.createProductImage = createProductImage;
exports.updateProductImage = updateProductImage;
exports.getOrCreateProductImage = getOrCreateProductImage;
const connection_1 = require("./connection");
/**
 * Отримати всі картинки товару
 */
async function getProductImages(productId) {
    const [rows] = await connection_1.db.query(`
    SELECT *
    FROM product_images
    WHERE product_id = ?
    ORDER BY sort_order ASC
    `, [
        productId,
    ]);
    return rows;
}
/**
 * Знайти картинку по URL джерела
 */
async function getImageBySourceUrl(productId, sourceUrl) {
    const [rows] = await connection_1.db.query(`
    SELECT *
    FROM product_images
    WHERE product_id = ?
    AND source_url = ?
    LIMIT 1
    `, [
        productId,
        sourceUrl,
    ]);
    const images = rows;
    return images[0] ?? null;
}
/**
 * Додати нову картинку
 */
async function createProductImage(data) {
    const [result] = await connection_1.db.query(`
    INSERT INTO product_images
    (
      product_id,
      source_url,
      local_path,
      source_hash,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?)
    `, [
        data.productId,
        data.sourceUrl,
        data.localPath ?? null,
        data.sourceHash ?? null,
        data.sortOrder ?? 0,
    ]);
    const insertResult = result;
    return insertResult.insertId;
}
/**
 * Оновити картинку
 */
async function updateProductImage(id, data) {
    const fields = [];
    const values = [];
    if (data.localPath !== undefined) {
        fields.push("local_path = ?");
        values.push(data.localPath);
    }
    if (data.sourceHash !== undefined) {
        fields.push("source_hash = ?");
        values.push(data.sourceHash);
    }
    if (data.sortOrder !== undefined) {
        fields.push("sort_order = ?");
        values.push(data.sortOrder);
    }
    if (fields.length === 0) {
        return null;
    }
    const [result] = await connection_1.db.query(`
    UPDATE product_images
    SET ${fields.join(", ")}
    WHERE id = ?
    `, [
        ...values,
        id,
    ]);
    return result;
}
/**
 * Основна функція для імпортера:
 * знайти картинку або створити
 */
async function getOrCreateProductImage(data) {
    const existing = await getImageBySourceUrl(data.productId, data.sourceUrl);
    if (existing) {
        await updateProductImage(existing.id, {
            localPath: data.localPath,
            sourceHash: data.sourceHash,
            sortOrder: data.sortOrder,
        });
        return existing.id;
    }
    return await createProductImage(data);
}
//# sourceMappingURL=product-images.js.map