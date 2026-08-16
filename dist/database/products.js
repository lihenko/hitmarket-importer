"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductsCount = getProductsCount;
exports.getProductBySourceOffer = getProductBySourceOffer;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
const connection_1 = require("./connection");
/**
 * ============================================================
 * GET PRODUCTS COUNT
 * ============================================================
 */
async function getProductsCount() {
    const [rows] = await connection_1.db.query(`
    SELECT COUNT(*) as count
    FROM products
    `);
    return rows;
}
/**
 * ============================================================
 * GET PRODUCT BY SOURCE OFFER
 * ============================================================
 */
async function getProductBySourceOffer(source, sourceOfferId) {
    const [rows] = await connection_1.db.query(`
    SELECT *
    FROM products
    WHERE source = ?
    AND source_offer_id = ?
    LIMIT 1
    `, [
        source,
        sourceOfferId,
    ]);
    const products = rows;
    return products[0] ?? null;
}
/**
 * ============================================================
 * CREATE PRODUCT
 * ============================================================
 */
async function createProduct(product) {
    const [result] = await connection_1.db.query(`
    INSERT INTO products
    (
      source,
      source_offer_id,
      vendor_code,

      name,
      slug,

      price,
      old_price,
      available,

      category_id,

      vendor,
      country_of_origin,

      description,

      seo_title,
      seo_description,

      config
    )
    VALUES
    (
      ?, ?, ?,

      ?, ?,

      ?, ?, ?,

      ?,

      ?, ?,

      ?,

      ?, ?,

      ?
    )
    `, [
        product.source,
        product.sourceOfferId,
        product.vendorCode ?? null,
        product.name,
        product.slug,
        product.price,
        product.oldPrice ?? null,
        product.available ? 1 : 0,
        product.categoryId ?? null,
        product.vendor ?? null,
        product.countryOfOrigin ?? null,
        product.description ?? null,
        product.seoTitle ?? null,
        product.seoDescription ?? null,
        product.config
            ? JSON.stringify(product.config)
            : null,
    ]);
    return result;
}
/**
 * ============================================================
 * UPDATE PRODUCT
 * ============================================================
 *
 * Для існуючого товару можна оновлювати:
 *
 * - назву
 * - slug
 * - ціну
 * - стару ціну
 * - наявність
 * - категорію
 * - постачальника
 * - країну
 * - опис
 * - SEO
 * - config
 * - статус генерації
 *
 * Зображення та параметри тут НЕ обробляються.
 */
async function updateProduct(id, product) {
    const fields = [];
    const values = [];
    /**
     * ----------------------------------------------------------
     * NAME
     * ----------------------------------------------------------
     */
    if (product.name !== undefined) {
        fields.push("name = ?");
        values.push(product.name);
    }
    /**
     * ----------------------------------------------------------
     * SLUG
     * ----------------------------------------------------------
     */
    if (product.slug !== undefined) {
        fields.push("slug = ?");
        values.push(product.slug);
    }
    /**
     * ----------------------------------------------------------
     * PRICE
     * ----------------------------------------------------------
     */
    if (product.price !== undefined) {
        fields.push("price = ?");
        values.push(product.price);
    }
    /**
     * ----------------------------------------------------------
     * OLD PRICE
     * ----------------------------------------------------------
     */
    if (product.oldPrice !== undefined) {
        fields.push("old_price = ?");
        values.push(product.oldPrice);
    }
    /**
     * ----------------------------------------------------------
     * AVAILABLE
     * ----------------------------------------------------------
     */
    if (product.available !== undefined) {
        fields.push("available = ?");
        values.push(product.available
            ? 1
            : 0);
    }
    /**
     * ----------------------------------------------------------
     * CATEGORY
     * ----------------------------------------------------------
     */
    if (product.categoryId !== undefined) {
        fields.push("category_id = ?");
        values.push(product.categoryId);
    }
    /**
     * ----------------------------------------------------------
     * VENDOR
     * ----------------------------------------------------------
   */
    if (product.vendor !== undefined) {
        fields.push("vendor = ?");
        values.push(product.vendor);
    }
    /**
     * ----------------------------------------------------------
     * COUNTRY
     * ----------------------------------------------------------
     */
    if (product.countryOfOrigin !== undefined) {
        fields.push("country_of_origin = ?");
        values.push(product.countryOfOrigin);
    }
    /**
     * ----------------------------------------------------------
     * DESCRIPTION
     * ----------------------------------------------------------
     */
    if (product.description !== undefined) {
        fields.push("description = ?");
        values.push(product.description);
    }
    /**
     * ----------------------------------------------------------
     * SEO TITLE
     * ----------------------------------------------------------
     */
    if (product.seoTitle !== undefined) {
        fields.push("seo_title = ?");
        values.push(product.seoTitle);
    }
    /**
     * ----------------------------------------------------------
     * SEO DESCRIPTION
     * ----------------------------------------------------------
     */
    if (product.seoDescription !== undefined) {
        fields.push("seo_description = ?");
        values.push(product.seoDescription);
    }
    /**
     * ----------------------------------------------------------
     * CONFIG
     * ----------------------------------------------------------
     */
    if (product.config !== undefined) {
        fields.push("config = ?");
        values.push(product.config
            ? JSON.stringify(product.config)
            : null);
    }
    /**
     * ----------------------------------------------------------
     * CONTENT STATUS
     * ----------------------------------------------------------
     */
    if (product.contentStatus !== undefined) {
        fields.push("content_status = ?");
        values.push(product.contentStatus);
    }
    /**
     * ----------------------------------------------------------
     * CONTENT ERROR
     * ----------------------------------------------------------
     */
    if (product.contentError !== undefined) {
        fields.push("content_error = ?");
        values.push(product.contentError);
    }
    /**
     * ----------------------------------------------------------
     * CONTENT GENERATED AT
     * ----------------------------------------------------------
     */
    if (product.contentGeneratedAt !== undefined) {
        fields.push("content_generated_at = ?");
        values.push(product.contentGeneratedAt);
    }
    /**
     * ----------------------------------------------------------
     * NOTHING TO UPDATE
     * ----------------------------------------------------------
     */
    if (fields.length === 0) {
        return null;
    }
    /**
     * ----------------------------------------------------------
     * UPDATE
     * ----------------------------------------------------------
     */
    const [result] = await connection_1.db.query(`
    UPDATE products
    SET ${fields.join(", ")}
    WHERE id = ?
    `, [
        ...values,
        id,
    ]);
    return result;
}
//# sourceMappingURL=products.js.map