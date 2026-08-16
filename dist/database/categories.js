"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryBySourceId = getCategoryBySourceId;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.getOrCreateCategory = getOrCreateCategory;
const connection_1 = require("./connection");
const translate_category_1 = require("../ai/translate-category");
/**
 * ============================================================
 * GET CATEGORY BY SOURCE ID
 * ============================================================
 *
 * Шукаємо категорію по:
 *
 * source
 * +
 * source_category_id
 *
 * Це дозволяє однозначно визначити категорію постачальника.
 */
async function getCategoryBySourceId(source, sourceCategoryId) {
    const [rows] = await connection_1.db.query(`
    SELECT
      id,
      source,
      source_category_id,
      name,
      parent_id,
      created_at,
      updated_at
    FROM categories
    WHERE source = ?
      AND source_category_id = ?
    LIMIT 1
    `, [
        source,
        sourceCategoryId,
    ]);
    const categories = rows;
    return categories[0] ?? null;
}
/**
 * ============================================================
 * CREATE CATEGORY
 * ============================================================
 *
 * Створює категорію.
 *
 * ВАЖЛИВО:
 *
 * name сюди вже повинен приходити українською.
 *
 * Переклад виконується в getOrCreateCategory()
 * перед викликом цієї функції.
 */
async function createCategory(data) {
    const [result] = await connection_1.db.query(`
    INSERT INTO categories
    (
      source,
      source_category_id,
      name,
      parent_id
    )
    VALUES (?, ?, ?, ?)
    `, [
        data.source,
        data.sourceCategoryId,
        data.name,
        data.parentId ?? null,
    ]);
    const insertResult = result;
    return insertResult.insertId;
}
/**
 * ============================================================
 * UPDATE CATEGORY
 * ============================================================
 *
 * Оновлює існуючу категорію.
 *
 * Ця функція НЕ викликає AI.
 */
async function updateCategory(id, data) {
    const fields = [];
    const values = [];
    /**
     * Назва категорії.
     *
     * Сюди повинна передаватися
     * тільки українська назва.
     */
    if (data.name !== undefined) {
        fields.push("name = ?");
        values.push(data.name);
    }
    /**
     * Батьківська категорія.
     */
    if (data.parentId !== undefined) {
        fields.push("parent_id = ?");
        values.push(data.parentId);
    }
    /**
     * Немає що оновлювати.
     */
    if (fields.length === 0) {
        return null;
    }
    const [result] = await connection_1.db.query(`
    UPDATE categories
    SET ${fields.join(", ")}
    WHERE id = ?
    `, [
        ...values,
        id,
    ]);
    return result;
}
/**
 * ============================================================
 * GET OR CREATE CATEGORY
 * ============================================================
 *
 * Основна функція для імпортера.
 *
 *
 * ЛОГІКА:
 *
 * 1. Шукаємо категорію по source + sourceCategoryId.
 *
 * 2. Якщо категорія вже існує:
 *
 *    - НЕ запускаємо AI;
 *    - НЕ змінюємо її назву;
 *    - повертаємо існуючий ID.
 *
 * 3. Якщо категорії немає:
 *
 *    - беремо оригінальну назву з фіда;
 *    - передаємо її в AI;
 *    - отримуємо українську назву;
 *    - створюємо категорію;
 *    - повертаємо її ID.
 *
 *
 * Таким чином одна категорія не перекладається
 * через OpenAI повторно для кожного товару.
 */
async function getOrCreateCategory(data) {
    /**
     * ----------------------------------------------------------
     * 1. ШУКАЄМО ІСНУЮЧУ КАТЕГОРІЮ
     * ----------------------------------------------------------
     */
    const existing = await getCategoryBySourceId(data.source, data.sourceCategoryId);
    /**
     * ----------------------------------------------------------
     * 2. КАТЕГОРІЯ ВЖЕ Є
     * ----------------------------------------------------------
     *
     * AI тут НЕ запускаємо.
     *
     * Також не перезаписуємо name значенням
     * з фіда, оскільки воно може бути російським.
     */
    if (existing) {
        return existing.id;
    }
    /**
     * ----------------------------------------------------------
     * 3. НОВА КАТЕГОРІЯ
     * ----------------------------------------------------------
     */
    if (!data.name.trim()) {
        throw new Error(`Cannot create category ${data.sourceCategoryId}: empty category name`);
    }
    /**
     * ----------------------------------------------------------
     * 4. ПЕРЕКЛАД КАТЕГОРІЇ
     * ----------------------------------------------------------
     *
     * Наприклад:
     *
     * "Электротовары"
     *
     * →
     *
     * "Електротовари"
     */
    console.log(`📂 New category: "${data.name}"`);
    const translatedName = await (0, translate_category_1.translateCategoryName)(data.name);
    /**
     * Перевіряємо, що AI реально щось повернув.
     */
    if (!translatedName.trim()) {
        throw new Error(`AI returned empty translated category for "${data.name}"`);
    }
    console.log(`🇺🇦 Category: "${data.name}" → "${translatedName}"`);
    /**
     * ----------------------------------------------------------
     * 5. СТВОРЮЄМО КАТЕГОРІЮ
     * ----------------------------------------------------------
     */
    const categoryId = await createCategory({
        source: data.source,
        sourceCategoryId: data.sourceCategoryId,
        name: translatedName.trim(),
        parentId: data.parentId ?? null,
    });
    /**
     * ----------------------------------------------------------
     * 6. ПОВЕРТАЄМО ID
     * ----------------------------------------------------------
     */
    return categoryId;
}
//# sourceMappingURL=categories.js.map