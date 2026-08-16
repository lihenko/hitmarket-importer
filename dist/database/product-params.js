"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductParams = getProductParams;
exports.getProductParam = getProductParam;
exports.createProductParam = createProductParam;
exports.updateProductParam = updateProductParam;
exports.getOrCreateProductParam = getOrCreateProductParam;
exports.syncProductParams = syncProductParams;
const connection_1 = require("./connection");
/**
 * Отримати всі характеристики товару
 */
async function getProductParams(productId) {
    const [rows] = await connection_1.db.query(`
    SELECT *
    FROM product_params
    WHERE product_id = ?
    ORDER BY id ASC
    `, [
        productId,
    ]);
    return rows;
}
/**
 * Знайти характеристику товару
 * за українською назвою.
 */
async function getProductParam(productId, name) {
    const [rows] = await connection_1.db.query(`
    SELECT *
    FROM product_params
    WHERE product_id = ?
    AND name = ?
    LIMIT 1
    `, [
        productId,
        name,
    ]);
    const params = rows;
    return params[0] ?? null;
}
/**
 * Створити характеристику
 */
async function createProductParam(data) {
    const [result] = await connection_1.db.query(`
    INSERT INTO product_params
    (
      product_id,
      name,
      value,
      unit
    )
    VALUES (?, ?, ?, ?)
    `, [
        data.productId,
        data.name,
        data.value ?? null,
        data.unit ?? null,
    ]);
    const insertResult = result;
    return insertResult.insertId;
}
/**
 * Оновити характеристику
 */
async function updateProductParam(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== undefined) {
        fields.push("name = ?");
        values.push(data.name);
    }
    if (data.value !== undefined) {
        fields.push("value = ?");
        values.push(data.value);
    }
    if (data.unit !== undefined) {
        fields.push("unit = ?");
        values.push(data.unit);
    }
    if (fields.length === 0) {
        return null;
    }
    const [result] = await connection_1.db.query(`
      UPDATE product_params
      SET ${fields.join(", ")}
      WHERE id = ?
      `, [
        ...values,
        id,
    ]);
    return result;
}
/**
 * Створити або оновити характеристику.
 *
 * ВАЖЛИВО:
 * name вже повинен бути українським.
 */
async function getOrCreateProductParam(data) {
    const name = data.name.trim();
    if (!name) {
        throw new Error("Product parameter name cannot be empty");
    }
    const existing = await getProductParam(data.productId, name);
    if (existing) {
        await updateProductParam(existing.id, {
            value: data.value,
            unit: data.unit,
        });
        return existing.id;
    }
    return await createProductParam({
        productId: data.productId,
        name,
        value: data.value,
        unit: data.unit,
    });
}
/**
 * Масове збереження українських
 * характеристик товару.
 *
 * Ця функція НЕ перекладає параметри.
 *
 * Вона очікує, що AI вже повернув:
 *
 * name  → українською
 * value → українською, якщо це текстове значення
 * unit  → українською
 */
async function syncProductParams(productId, params) {
    const ids = [];
    for (const param of params) {
        if (!param.name?.trim()) {
            continue;
        }
        const id = await getOrCreateProductParam({
            productId,
            name: param.name.trim(),
            value: param.value?.trim() ||
                null,
            unit: param.unit?.trim() ||
                null,
        });
        ids.push(id);
    }
    return ids;
}
//# sourceMappingURL=product-params.js.map