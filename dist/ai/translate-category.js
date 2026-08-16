"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateCategoryName = translateCategoryName;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
/**
 * Перекладає назву категорії українською.
 *
 * На вхід може прийти:
 * - російська;
 * - англійська;
 * - українська;
 * - інша мова.
 *
 * На виході завжди повинна бути українська назва.
 */
async function translateCategoryName(categoryName) {
    const name = categoryName.trim();
    if (!name) {
        throw new Error("Category name is empty");
    }
    console.log(`🤖 Translating category: "${name}"`);
    const response = await openai.responses.create({
        model: "gpt-5-mini",
        input: [
            {
                role: "system",
                content: `
Ти перекладач категорій інтернет-магазину.

Твоє завдання — перекласти назву категорії українською мовою.

Правила:

1. Відповідь ТІЛЬКИ українською мовою.
2. Не додавай пояснень.
3. Не використовуй лапки.
4. Не додавай крапку в кінці.
5. Не змінюй зміст категорії.
6. Не вигадуй товарів або характеристик.
7. Використовуй природну українську термінологію для інтернет-магазину.
8. Якщо назва вже українською — поверни її без змін.
9. Не використовуй російські слова.
10. Результат повинен бути короткою назвою категорії.

Приклади:

"Электротовары" → "Електротовари"
"Бытовая техника" → "Побутова техніка"
"Садовый инструмент" → "Садовий інструмент"
"Освещение" → "Освітлення"
"Строительные материалы" → "Будівельні матеріали"
"Кухонная техника" → "Кухонна техніка"
"Электрические чайники" → "Електричні чайники"
          `.trim(),
            },
            {
                role: "user",
                content: name,
            },
        ],
    });
    const translated = response.output_text.trim();
    if (!translated) {
        throw new Error(`AI returned empty category name for "${name}"`);
    }
    console.log(`🇺🇦 Category translated: "${name}" → "${translated}"`);
    return translated;
}
//# sourceMappingURL=translate-category.js.map