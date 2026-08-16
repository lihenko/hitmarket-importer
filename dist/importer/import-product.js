"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importProduct = importProduct;
const categories_1 = require("../database/categories");
const products_1 = require("../database/products");
const product_images_1 = require("../database/product-images");
const product_params_1 = require("../database/product-params");
const normalize_product_1 = require("./normalize-product");
const generate_config_1 = require("./generate-config");
const save_product_image_1 = require("./save-product-image");
const rewrite_product_1 = require("../ai/rewrite-product");
const translate_category_1 = require("../ai/translate-category");
/**
 * ============================================================
 * GENERATE SLUG
 * ============================================================
 */
function generateSlug(name) {
    const transliteration = {
        а: "a",
        б: "b",
        в: "v",
        г: "h",
        ґ: "g",
        д: "d",
        е: "e",
        є: "ye",
        ж: "zh",
        з: "z",
        и: "y",
        і: "i",
        ї: "yi",
        й: "y",
        к: "k",
        л: "l",
        м: "m",
        н: "n",
        о: "o",
        п: "p",
        р: "r",
        с: "s",
        т: "t",
        у: "u",
        ф: "f",
        х: "kh",
        ц: "ts",
        ч: "ch",
        ш: "sh",
        щ: "shch",
        ь: "",
        ю: "yu",
        я: "ya",
    };
    return name
        .toLowerCase()
        .split("")
        .map(char => transliteration[char] ?? char)
        .join("")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        || "product";
}
/**
 * ============================================================
 * IMPORT PRODUCT
 * ============================================================
 */
async function importProduct(supplierProduct) {
    /**
     * ============================================================
     * 1. NORMALIZE
     * ============================================================
     */
    const product = (0, normalize_product_1.normalizeProduct)(supplierProduct);
    /**
     * ============================================================
     * 2. CHECK EXISTING PRODUCT
     * ============================================================
     */
    const existing = await (0, products_1.getProductBySourceOffer)(product.source, product.sourceOfferId);
    /**
     * ============================================================
     * 3. EXISTING PRODUCT
     * ============================================================
     *
     * AI НЕ запускаємо.
     *
     * Для існуючого товару оновлюємо тільки:
     *
     * - price
     * - oldPrice
     * - available
     *
     * Якщо category_id = NULL —
     * визначаємо категорію.
     */
    if (existing) {
        const changes = {};
        /**
         * ----------------------------------------------------------
         * PRICE
         * ----------------------------------------------------------
         */
        if (existing.price !==
            product.price) {
            changes.price =
                product.price;
        }
        /**
         * ----------------------------------------------------------
         * OLD PRICE
         * ----------------------------------------------------------
         */
        if (existing.old_price !==
            product.oldPrice) {
            changes.oldPrice =
                product.oldPrice;
        }
        /**
         * ----------------------------------------------------------
         * AVAILABLE
         * ----------------------------------------------------------
         */
        if (existing.available !==
            product.available) {
            changes.available =
                product.available;
        }
        /**
         * ----------------------------------------------------------
         * CATEGORY
         * ----------------------------------------------------------
         */
        if (existing.category_id === null &&
            product.category) {
            console.log(`📂 Translating category: ${product.category.name}`);
            const categoryNameUa = await (0, translate_category_1.translateCategoryName)(product.category.name);
            console.log(`📂 Category UA: ${categoryNameUa}`);
            const categoryId = await (0, categories_1.getOrCreateCategory)({
                source: product.source,
                sourceCategoryId: product.category.id,
                name: categoryNameUa,
            });
            changes.categoryId =
                categoryId;
            console.log(`📂 Category ID: ${categoryId}`);
        }
        /**
         * ----------------------------------------------------------
         * UPDATE
         * ----------------------------------------------------------
         */
        if (Object.keys(changes).length > 0) {
            await (0, products_1.updateProduct)(existing.id, changes);
        }
        return {
            productId: existing.id,
            categoryId: changes.categoryId ??
                existing.category_id,
            price: product.price,
            status: Object.keys(changes).length > 0
                ? "updated"
                : "unchanged",
        };
    }
    /**
     * ============================================================
     * 4. NEW PRODUCT BUT UNAVAILABLE
     * ============================================================
     *
     * Новий unavailable товар взагалі не створюємо.
     *
     * AI також НЕ запускаємо.
     */
    if (product.available === false) {
        return {
            productId: null,
            categoryId: null,
            price: product.price,
            status: "skipped",
        };
    }
    /**
     * ============================================================
     * 5. AI GENERATION
     * ============================================================
     *
     * Один OpenAI request.
     *
     * rewriteProduct() генерує:
     *
     * - nameUa
     * - descriptionUa
     * - seoTitle
     * - seoDescription
     * - paramsUa
     * - badgeText
     * - heroDescription
     * - features
     * - compact
     * - ports
     * - package
     * - specifications
     * - faq
     * - reviews
     */
    console.log(`🤖 Generating complete product content: ${product.sourceOfferId}`);
    const rewritten = await (0, rewrite_product_1.rewriteProduct)(product);
    /**
     * ============================================================
     * 6. SLUG
     * ============================================================
     */
    const slug = generateSlug(rewritten.nameUa);
    console.log(`🔗 Slug: ${slug}`);
    /**
     * ============================================================
     * 7. GENERATE CONFIG
     * ============================================================
     *
     * ВАЖЛИВО:
     *
     * generateProductConfig() НЕ викликає OpenAI.
     *
     * Він отримує:
     *
     * 1. оригінальний normalized product;
     * 2. вже готовий результат rewriteProduct().
     */
    console.log(`⚙️ Generating product config...`);
    const config = (0, generate_config_1.generateProductConfig)(product, rewritten);
    console.log(`✅ Product config generated`);
    /**
     * ============================================================
     * 8. CATEGORY
     * ============================================================
     */
    let categoryId = null;
    if (product.category) {
        console.log(`📂 Translating category: ${product.category.name}`);
        const categoryNameUa = await (0, translate_category_1.translateCategoryName)(product.category.name);
        console.log(`📂 Category UA: ${categoryNameUa}`);
        categoryId =
            await (0, categories_1.getOrCreateCategory)({
                source: product.source,
                sourceCategoryId: product.category.id,
                name: categoryNameUa,
            });
        console.log(`📂 Category ID: ${categoryId}`);
    }
    /**
     * ============================================================
     * 9. CREATE PRODUCT
     * ============================================================
     */
    const result = await (0, products_1.createProduct)({
        source: product.source,
        sourceOfferId: product.sourceOfferId,
        name: rewritten.nameUa,
        slug,
        price: product.price,
        oldPrice: product.oldPrice,
        available: product.available,
        categoryId,
        vendor: product.vendor,
        description: rewritten.descriptionUa,
        seoTitle: rewritten.seoTitle,
        seoDescription: rewritten.seoDescription,
        config,
    });
    /**
     * ============================================================
     * 10. PRODUCT ID
     * ============================================================
     */
    const insert = result;
    const productId = insert.insertId;
    if (!productId) {
        throw new Error(`Failed to get product ID for ${product.sourceOfferId}.`);
    }
    /**
     * ============================================================
     * 11. IMAGES
     * ============================================================
     *
     * Тільки для нового товару.
     */
    for (const [index, imageUrl,] of product.images.entries()) {
        try {
            const fileName = `${slug}-${index}`;
            const localPath = await (0, save_product_image_1.saveProductImage)(imageUrl, fileName);
            await (0, product_images_1.getOrCreateProductImage)({
                productId,
                sourceUrl: imageUrl,
                localPath,
                sortOrder: index + 1,
            });
            console.log(`🖼️ Image ${index + 1} saved: ${localPath}`);
        }
        catch (error) {
            console.error(`❌ Failed to process image ${index + 1} ` +
                `for product ${product.sourceOfferId}:`, error);
        }
    }
    /**
     * ============================================================
     * 12. PRODUCT PARAMETERS
     * ============================================================
     *
     * У БД записуємо AI-перекладені параметри.
     *
     * product.params
     *     = оригінальні параметри постачальника
     *
     * rewritten.paramsUa
     *     = фінальні українські параметри
     */
    await (0, product_params_1.syncProductParams)(productId, rewritten.paramsUa);
    /**
     * ============================================================
     * 13. SUCCESS
     * ============================================================
     */
    console.log(`✅ Product created: ${product.sourceOfferId}`);
    console.log(`🆔 Product ID: ${productId}`);
    console.log(`📋 Params: ${rewritten.paramsUa.length}`);
    console.log(`⚙️ Config: generated`);
    return {
        productId,
        categoryId,
        price: product.price,
        status: "created",
    };
}
//# sourceMappingURL=import-product.js.map