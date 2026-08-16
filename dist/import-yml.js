"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const connection_1 = require("./database/connection");
const yml_parser_1 = require("./feeds/yml-parser");
const import_product_1 = require("./importer/import-product");
async function main() {
    const filePath = node_path_1.default.resolve("src/feeds/products_feed.xml");
    console.log("🚀 YML import started");
    console.log(`Feed: ${filePath}`);
    const products = await (0, yml_parser_1.parseYmlFile)(filePath);
    console.log(`Products in feed: ${products.length}`);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    for (const [index, product] of products.entries()) {
        try {
            const result = await (0, import_product_1.importProduct)(product);
            if (result.status ===
                "created") {
                created++;
            }
            else if (result.status ===
                "updated") {
                updated++;
            }
            else if (result.status ===
                "skipped") {
                skipped++;
            }
            console.log(`[${index + 1}/${products.length}]`, product.name, "→", result.status);
        }
        catch (error) {
            errors++;
            console.error(`❌ ${product.sourceOfferId}`, product.name, error);
        }
    }
    console.log("");
    console.log("✅ YML import finished");
    console.log({
        total: products.length,
        created,
        updated,
        skipped,
        errors,
    });
    await connection_1.db.end();
}
main().catch(error => {
    console.error("❌ Import failed:", error);
    process.exit(1);
});
//# sourceMappingURL=import-yml.js.map