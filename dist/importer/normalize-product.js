"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProduct = normalizeProduct;
/**
 * Нормалізує значення наявності товару.
 *
 * Пріоритет:
 *
 * 1. quantity
 * 2. available
 * 3. true, якщо обидва значення відсутні
 */
function normalizeAvailable(product) {
    if (product.quantity !== undefined) {
        return product.quantity > 0;
    }
    return product.available ?? true;
}
/**
 * Нормалізація товару.
 *
 * Тут НЕ створюємо slug.
 *
 * Slug буде створений пізніше,
 * після AI-рерайту, на основі
 * фінальної української назви.
 */
function normalizeProduct(product) {
    /**
     * ----------------------------------------------------------
     * Наявність
     * ----------------------------------------------------------
     */
    const available = normalizeAvailable(product);
    /**
     * ----------------------------------------------------------
     * Українська назва
     * ----------------------------------------------------------
     */
    const nameUa = product.nameUa?.trim() ||
        null;
    /**
     * ----------------------------------------------------------
     * Ціна
     *
     * Ціна постачальника +20%.
     * Округлення в більшу сторону.
     * ----------------------------------------------------------
     */
    const price = product.price;
    /**
     * ----------------------------------------------------------
     * Стара ціна
     *
     * Якщо oldPrice відсутня —
     * записуємо null.
     * ----------------------------------------------------------
     */
    const oldPrice = product.oldPrice !== undefined &&
        product.oldPrice !== null
        ? product.oldPrice
        : null;
    /**
     * ----------------------------------------------------------
     * Оригінальний опис
     * ----------------------------------------------------------
     */
    const description = product.description?.trim() ||
        null;
    /**
     * ----------------------------------------------------------
     * Український опис
     * ----------------------------------------------------------
     */
    const descriptionUa = product.descriptionUa?.trim() ||
        null;
    /**
     * ----------------------------------------------------------
     * Характеристики
     * ----------------------------------------------------------
     */
    const params = product.params?.map(item => ({
        name: item.name,
        value: item.value,
        unit: item.unit?.trim() ||
            null,
    })) ?? [];
    /**
     * ----------------------------------------------------------
     * Результат нормалізації
     * ----------------------------------------------------------
     */
    return {
        source: product.source,
        sourceOfferId: product.sourceOfferId,
        /**
         * Оригінальна назва.
         */
        name: product.name,
        /**
         * Українська назва з фіда.
         */
        nameUa,
        /**
         * Нормалізована ціна.
         */
        price,
        /**
         * Нормалізована стара ціна.
         */
        oldPrice,
        /**
         * Нормалізована наявність.
         */
        available,
        /**
         * Постачальник.
         */
        vendor: product.vendor?.trim() ||
            null,
        /**
         * Оригінальний опис.
         */
        description,
        /**
         * Український опис з фіда.
         */
        descriptionUa,
        /**
         * Категорія.
         */
        category: product.category ?? null,
        /**
         * Зображення.
         */
        images: product.images ?? [],
        /**
         * Характеристики.
         */
        params,
    };
}
//# sourceMappingURL=normalize-product.js.map