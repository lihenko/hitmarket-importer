"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseYmlFile = parseYmlFile;
const promises_1 = require("node:fs/promises");
const fast_xml_parser_1 = require("fast-xml-parser");
function toArray(value) {
    if (value === undefined) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}
function textToString(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const result = String(value).trim();
    return result === "" ? null : result;
}
function toNumber(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const normalized = String(value)
        .replace(/\s/g, "")
        .replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
}
function parseAvailable(value) {
    return value === "true";
}
async function parseYmlFile(filePath) {
    const xml = await (0, promises_1.readFile)(filePath, "utf8");
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        textNodeName: "#text",
        trimValues: true,
        parseTagValue: false,
        processEntities: true,
    });
    const data = parser.parse(xml);
    const shop = data.yml_catalog?.shop;
    if (!shop) {
        throw new Error("YML: <shop> not found");
    }
    /*
     * --------------------------------------------------
     * Categories
     * --------------------------------------------------
     */
    const categoryMap = new Map();
    const categoriesRaw = shop.categories?.category;
    const categories = toArray(categoriesRaw);
    for (const category of categories) {
        const id = String(category["@_id"]);
        const name = textToString(category["#text"]);
        if (!name) {
            continue;
        }
        categoryMap.set(id, name);
    }
    /*
     * --------------------------------------------------
     * Offers
     * --------------------------------------------------
     */
    const offersRaw = shop.offers?.offer;
    const offers = toArray(offersRaw);
    const products = [];
    for (const offer of offers) {
        const sourceOfferId = String(offer["@_id"]);
        /*
         * available="true"
         * available="false"
         */
        const available = parseAvailable(offer["@_available"]);
        /*
         * Name
         */
        const name = textToString(offer.name);
        if (!name) {
            console.warn(`⚠️ Skipping ${sourceOfferId}: name is missing`);
            continue;
        }
        /*
         * Price
         */
        const price = toNumber(offer.price);
        if (price === null) {
            console.warn(`⚠️ Skipping ${sourceOfferId}: price is missing`);
            continue;
        }
        /*
         * Old price
         */
        const oldPrice = toNumber(offer.oldprice);
        /*
         * Category
         */
        const categoryId = offer.categoryId !== undefined
            ? String(offer.categoryId)
            : undefined;
        const categoryName = categoryId
            ? categoryMap.get(categoryId)
            : undefined;
        /*
         * Images
         */
        const images = toArray(offer.picture)
            .map(String)
            .map(value => value.trim())
            .filter(Boolean);
        /*
         * Params
         */
        const params = toArray(offer.param)
            .map(param => {
            const name = String(param["@_name"]).trim();
            const value = textToString(param["#text"]) ?? "";
            const unit = textToString(param["@_unit"]);
            return {
                name,
                value,
                unit,
            };
        })
            .filter(param => param.name !== "");
        /*
         * Product
         */
        products.push({
            available,
            source: "aveon",
            sourceOfferId,
            name,
            nameUa: textToString(offer.name_ua),
            price,
            oldPrice,
            vendor: textToString(offer.vendor),
            vendorCode: textToString(offer.vendorCode),
            countryOfOrigin: textToString(offer.country_of_origin),
            description: textToString(offer.description),
            descriptionUa: textToString(offer.description_ua),
            category: categoryId
                ? {
                    id: categoryId,
                    name: categoryName ??
                        categoryId,
                }
                : undefined,
            images,
            params,
        });
    }
    return products;
}
//# sourceMappingURL=yml-parser.js.map