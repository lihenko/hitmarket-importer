"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const yml_parser_1 = require("./feeds/yml-parser");
const import_product_1 = require("./importer/import-product");
const connection_1 = require("./database/connection");
async function main() {
    try {
        console.log("=================================");
        console.log("🚀 TEST IMPORT");
        console.log("=================================");
        console.log();
        /**
         * --------------------------------------------------------
         * Шлях до реального фіда
         * --------------------------------------------------------
         */
        const feedPath = "src/feeds/products_feed.xml";
        /**
         * --------------------------------------------------------
         * Перевіряємо, що файл існує
         * --------------------------------------------------------
         */
        await (0, promises_1.readFile)(feedPath, "utf8");
        /**
         * --------------------------------------------------------
         * Парсимо фід
         * --------------------------------------------------------
         */
        console.log(`📦 Reading feed: ${feedPath}`);
        const products = await (0, yml_parser_1.parseYmlFile)(feedPath);
        console.log(`📦 Products in feed: ${products.length}`);
        console.log();
        /**
         * --------------------------------------------------------
         * Беремо тільки перші 10 товарів
         * --------------------------------------------------------
         */
        const testProducts = products.slice(0, 30);
        console.log(`🧪 Testing first ${testProducts.length} products`);
        console.log();
        /**
         * --------------------------------------------------------
         * Лічильники
         * --------------------------------------------------------
         */
        let created = 0;
        let updated = 0;
        let unchanged = 0;
        let skipped = 0;
        let failed = 0;
        /**
         * --------------------------------------------------------
         * Імпорт товарів
         * --------------------------------------------------------
         */
        for (const [index, product,] of testProducts.entries()) {
            console.log("=================================");
            console.log(`📦 Product ${index + 1}/${testProducts.length}`);
            console.log(`ID: ${product.sourceOfferId}`);
            console.log(`Name: ${product.name}`);
            console.log(`Name UA: ${product.nameUa ?? "-"}`);
            console.log(`Available: ${product.available}`);
            console.log("=================================");
            try {
                const result = await (0, import_product_1.importProduct)(product);
                console.log(`✅ Result: ${result.status}`);
                switch (result.status) {
                    case "created":
                        created++;
                        break;
                    case "updated":
                        updated++;
                        break;
                    case "unchanged":
                        unchanged++;
                        break;
                    case "skipped":
                        skipped++;
                        break;
                }
            }
            catch (error) {
                failed++;
                console.error("❌ Product import failed:");
                console.error(error);
            }
            console.log();
        }
        /**
         * --------------------------------------------------------
         * Підсумок
         * --------------------------------------------------------
         */
        console.log();
        console.log("=================================");
        console.log("📊 TEST IMPORT SUMMARY");
        console.log("=================================");
        console.log(`Total tested: ${testProducts.length}`);
        console.log(`Created: ${created}`);
        console.log(`Updated: ${updated}`);
        console.log(`Unchanged: ${unchanged}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Failed: ${failed}`);
        console.log("=================================");
    }
    catch (error) {
        console.error("❌ Test import failed:");
        console.error(error);
        process.exitCode = 1;
    }
    finally {
        /**
         * --------------------------------------------------------
         * Закриваємо MySQL
         * --------------------------------------------------------
         */
        await connection_1.db.end();
    }
}
main();
//# sourceMappingURL=test-import.js.map