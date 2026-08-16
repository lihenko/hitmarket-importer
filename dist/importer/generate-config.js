"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProductConfig = generateProductConfig;
/**
 * ============================================================
 * GENERATE CONFIG
 * ============================================================
 */
function generateProductConfig(product, rewritten) {
    /**
     * ----------------------------------------------------------
     * PRODUCT
     * ----------------------------------------------------------
     *
     * product використовується для даних,
     * які не генеруються AI.
     *
     * rewritten використовується для всього
     * AI-контенту.
     */
    return {
        /**
         * ========================================================
         * HERO
         * ========================================================
         */
        hero: {
            badgeText: rewritten.badgeText,
            title: rewritten.nameUa,
            description: rewritten.heroDescription,
        },
        /**
         * ========================================================
         * FEATURES
         * ========================================================
         */
        features: {
            eyebrow: rewritten.features.eyebrow,
            title: rewritten.features.title,
            items: rewritten.features.items.map(item => ({
                icon: item.icon,
                title: item.title,
                text: item.text,
                large: item.large,
            })),
        },
        /**
         * ========================================================
         * COMPACT
         * ========================================================
         */
        compact: {
            eyebrow: rewritten.compact.eyebrow,
            title: rewritten.compact.title,
            description: rewritten.compact.description,
            bullets: rewritten.compact.bullets,
        },
        /**
         * ========================================================
         * PORTS
         * ========================================================
         *
         * Назва "ports" залишена тому,
         * що це назва секції у конфігурації магазину.
         *
         * Це НЕ означає, що товар має порти.
         */
        ports: {
            eyebrow: rewritten.ports.eyebrow,
            title: rewritten.ports.title,
            description: rewritten.ports.description,
            bullets: rewritten.ports.bullets,
        },
        /**
         * ========================================================
         * PACKAGE
         * ========================================================
         */
        package: {
            eyebrow: rewritten.package.eyebrow,
            title: rewritten.package.title,
            description: rewritten.package.description,
            items: rewritten.package.items,
        },
        /**
         * ========================================================
         * SPECIFICATIONS
         * ========================================================
         */
        specifications: {
            title: rewritten.specifications.title,
            items: rewritten.specifications.items.map(item => ({
                name: item.name,
                value: item.value,
            })),
        },
        /**
         * ========================================================
         * FAQ
         * ========================================================
         */
        faq: rewritten.faq.map(item => ({
            question: item.question,
            answer: item.answer,
        })),
        /**
         * ========================================================
         * REVIEWS
         * ========================================================
         */
        reviews: rewritten.reviews.map(review => ({
            name: review.name,
            city: review.city,
            rating: review.rating,
            date: review.date,
            text: review.text,
        })),
    };
}
//# sourceMappingURL=generate-config.js.map