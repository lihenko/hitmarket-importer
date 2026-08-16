"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewriteProduct = rewriteProduct;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
/**
 * ============================================================
 * SEO LIMITS
 * ============================================================
 */
const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;
/**
 * ============================================================
 * ALLOWED LUCIDE ICONS
 * ============================================================
 *
 * AI повертає ТІЛЬКИ назву.
 *
 * Наприклад:
 *
 * "Zap"
 * "Droplets"
 * "Ruler"
 *
 * У БД зберігається саме string.
 */
const LUCIDE_ICONS = [
    "Zap",
    "Droplets",
    "Ruler",
    "Clock",
    "ShieldCheck",
    "Sparkles",
    "Wind",
    "Battery",
    "Package",
    "Settings",
    "Gauge",
    "Thermometer",
    "Lightbulb",
    "Layers",
    "CircleCheck",
    "Truck",
    "Home",
    "Car",
    "Heart",
    "Star",
    "Wrench",
    "Scissors",
    "Wifi",
    "Bluetooth",
    "Monitor",
    "Smartphone",
    "Lock",
    "Volume2",
    "Weight",
    "Box",
];
/**
 * ============================================================
 * TRIM SEO
 * ============================================================
 */
function trimSeoText(value, maxLength) {
    const text = value
        .trim()
        .replace(/\s+/g, " ");
    if (text.length <= maxLength) {
        return text;
    }
    let result = text.slice(0, maxLength);
    const lastSpace = result.lastIndexOf(" ");
    if (lastSpace > 0) {
        result =
            result.slice(0, lastSpace);
    }
    return result.trim();
}
/**
 * ============================================================
 * NUMBERS
 * ============================================================
 */
function extractNumbers(value) {
    return value.match(/[-+]?\d+(?:[.,]\d+)?/g) ?? [];
}
/**
 * ============================================================
 * TECHNICAL TOKENS
 * ============================================================
 */
function extractTechnicalTokens(value) {
    return (value.match(/\b[A-Za-zА-Яа-яІіЇїЄєҐґ0-9]*[A-Za-z][A-Za-zА-Яа-яІіЇїЄєҐґ0-9_-]*\b/g) ?? []).filter(token => /\d/.test(token) ||
        /[A-Z]/.test(token));
}
/**
 * ============================================================
 * PARAM VALIDATION
 * ============================================================
 */
function validateParams(sourceParams, rewrittenParams) {
    if (rewrittenParams.length !==
        sourceParams.length) {
        return (`Кількість параметрів змінилася. ` +
            `Було: ${sourceParams.length}. ` +
            `Отримано: ${rewrittenParams.length}.`);
    }
    for (let i = 0; i < sourceParams.length; i++) {
        const source = sourceParams[i];
        const rewritten = rewrittenParams[i];
        if (!source ||
            !rewritten) {
            return (`Помилка параметра №${i + 1}.`);
        }
        if (!rewritten.name?.trim()) {
            return (`AI повернув порожню назву ` +
                `параметра №${i + 1}.`);
        }
        if (rewritten.value === undefined ||
            rewritten.value === null) {
            return (`AI повернув порожнє значення ` +
                `параметра "${source.name}".`);
        }
        const sourceNumbers = extractNumbers(source.value);
        const rewrittenNumbers = extractNumbers(rewritten.value);
        if (JSON.stringify(sourceNumbers) !==
            JSON.stringify(rewrittenNumbers)) {
            return (`AI змінив числове значення ` +
                `параметра "${source.name}". ` +
                `Було: "${source.value}". ` +
                `Отримано: "${rewritten.value}".`);
        }
        const sourceTokens = extractTechnicalTokens(source.value);
        for (const token of sourceTokens) {
            if (!rewritten.value.includes(token)) {
                return (`AI змінив технічне значення ` +
                    `параметра "${source.name}". ` +
                    `Не знайдено токен "${token}" ` +
                    `у "${rewritten.value}".`);
            }
        }
        const sourceUnit = source.unit?.trim() || null;
        const rewrittenUnit = rewritten.unit?.trim() || null;
        if (sourceUnit === null &&
            rewrittenUnit !== null) {
            return (`AI додав одиницю вимірювання ` +
                `для параметра "${source.name}".`);
        }
    }
    return null;
}
/**
 * ============================================================
 * PARAM SCHEMA
 * ============================================================
 */
function createParamsSchema(paramsCount) {
    const properties = {};
    const required = [];
    for (let i = 0; i < paramsCount; i++) {
        const key = `p${i + 1}`;
        properties[key] = {
            type: "object",
            properties: {
                name: {
                    type: "string",
                },
                value: {
                    type: "string",
                },
                unit: {
                    anyOf: [
                        {
                            type: "string",
                        },
                        {
                            type: "null",
                        },
                    ],
                },
            },
            required: [
                "name",
                "value",
                "unit",
            ],
            additionalProperties: false,
        };
        required.push(key);
    }
    return {
        type: "object",
        properties,
        required,
        additionalProperties: false,
    };
}
/**
 * ============================================================
 * GENERATED CONFIG SCHEMA
 * ============================================================
 */
function createConfigSchema(paramsCount) {
    return {
        type: "object",
        properties: {
            nameUa: {
                type: "string",
            },
            descriptionUa: {
                type: "string",
            },
            seoTitle: {
                type: "string",
            },
            seoDescription: {
                type: "string",
            },
            /**
             * --------------------------------------------------------
             * PARAMS
             * --------------------------------------------------------
             */
            paramsUa: createParamsSchema(paramsCount),
            /**
             * --------------------------------------------------------
             * HERO
             * --------------------------------------------------------
             */
            badgeText: {
                type: "string",
            },
            heroDescription: {
                type: "string",
            },
            /**
             * --------------------------------------------------------
             * FEATURES
             * --------------------------------------------------------
             */
            features: {
                type: "object",
                properties: {
                    eyebrow: {
                        type: "string",
                    },
                    title: {
                        type: "string",
                    },
                    items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                icon: {
                                    type: "string",
                                    enum: [...LUCIDE_ICONS],
                                },
                                title: {
                                    type: "string",
                                },
                                text: {
                                    type: "string",
                                },
                                large: {
                                    type: "boolean",
                                },
                            },
                            required: [
                                "icon",
                                "title",
                                "text",
                                "large",
                            ],
                            additionalProperties: false,
                        },
                    },
                },
                required: [
                    "eyebrow",
                    "title",
                    "items",
                ],
                additionalProperties: false,
            },
            /**
             * --------------------------------------------------------
             * COMPACT
             * --------------------------------------------------------
             */
            compact: {
                type: "object",
                properties: {
                    eyebrow: {
                        type: "string",
                    },
                    title: {
                        type: "string",
                    },
                    description: {
                        type: "string",
                    },
                    bullets: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                    },
                },
                required: [
                    "eyebrow",
                    "title",
                    "description",
                    "bullets",
                ],
                additionalProperties: false,
            },
            /**
             * --------------------------------------------------------
             * PORTS
             * --------------------------------------------------------
             */
            ports: {
                type: "object",
                properties: {
                    eyebrow: {
                        type: "string",
                    },
                    title: {
                        type: "string",
                    },
                    description: {
                        type: "string",
                    },
                    bullets: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                    },
                },
                required: [
                    "eyebrow",
                    "title",
                    "description",
                    "bullets",
                ],
                additionalProperties: false,
            },
            /**
             * --------------------------------------------------------
             * PACKAGE
             * --------------------------------------------------------
             */
            package: {
                type: "object",
                properties: {
                    eyebrow: {
                        type: "string",
                    },
                    title: {
                        type: "string",
                    },
                    description: {
                        type: "string",
                    },
                    items: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                    },
                },
                required: [
                    "eyebrow",
                    "title",
                    "description",
                    "items",
                ],
                additionalProperties: false,
            },
            /**
             * --------------------------------------------------------
             * SPECIFICATIONS
             * --------------------------------------------------------
             */
            specifications: {
                type: "object",
                properties: {
                    title: {
                        type: "string",
                    },
                    items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: {
                                    type: "string",
                                },
                                value: {
                                    type: "string",
                                },
                            },
                            required: [
                                "name",
                                "value",
                            ],
                            additionalProperties: false,
                        },
                    },
                },
                required: [
                    "title",
                    "items",
                ],
                additionalProperties: false,
            },
            /**
             * --------------------------------------------------------
             * FAQ
             * --------------------------------------------------------
             */
            faq: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        question: {
                            type: "string",
                        },
                        answer: {
                            type: "string",
                        },
                    },
                    required: [
                        "question",
                        "answer",
                    ],
                    additionalProperties: false,
                },
            },
            /**
             * --------------------------------------------------------
             * REVIEWS
             * --------------------------------------------------------
             */
            reviews: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                        },
                        city: {
                            type: "string",
                        },
                        rating: {
                            type: "number",
                        },
                        date: {
                            type: "string",
                        },
                        text: {
                            type: "string",
                        },
                    },
                    required: [
                        "name",
                        "city",
                        "rating",
                        "date",
                        "text",
                    ],
                    additionalProperties: false,
                },
            },
        },
        required: [
            "nameUa",
            "descriptionUa",
            "seoTitle",
            "seoDescription",
            "paramsUa",
            "badgeText",
            "heroDescription",
            "features",
            "compact",
            "ports",
            "package",
            "specifications",
            "faq",
            "reviews",
        ],
        additionalProperties: false,
    };
}
/**
 * ============================================================
 * REWRITE PRODUCT
 * ============================================================
 *
 * ВАЖЛИВО:
 *
 * ОДИН OpenAI request.
 *
 * Тут генерується ВСІЙ AI-контент товару.
 */
async function rewriteProduct(product) {
    const sourceName = product.nameUa?.trim() ||
        product.name;
    const sourceDescription = product.descriptionUa?.trim() ||
        product.description?.trim() ||
        "";
    const sourceParams = product.params.map((param, index) => ({
        id: index + 1,
        name: param.name,
        value: param.value,
        unit: param.unit ?? null,
    }));
    const sourceParamsJson = JSON.stringify(sourceParams, null, 2);
    const paramsCount = product.params.length;
    console.log(`📋 Source params: ${paramsCount}`);
    /**
     * ==========================================================
     * SYSTEM PROMPT
     * ==========================================================
     */
    const systemPrompt = `
Ти створюєш контент для українського інтернет-магазину.

Твоя відповідь повинна бути ВИКЛЮЧНО українською мовою.

============================================================
ГОЛОВНЕ ПРАВИЛО
============================================================

НЕ ВИГАДУЙ ФАКТІВ ПРО ТОВАР.

Єдині джерела фактичної інформації:

1. назва товару;
2. опис товару;
3. SOURCE PARAMETERS.

Не використовуй власні знання про товар для створення
технічних характеристик.

Якщо інформації немає — НЕ вигадуй її.

============================================================
МОВА
============================================================

Увесь результат українською.

Перекладай російські слова природною українською.

Наприклад:

Цвет -> Колір
Черный -> Чорний
Белый -> Білий
Высота -> Висота
Ширина -> Ширина
Мощность -> Потужність
Объем -> Об'єм
Комплектация -> Комплектація

У фінальному результаті не повинно бути російських
назв характеристик або російських текстів.

============================================================
НАЗВА
============================================================

nameUa:

Створи природну українську назву товару.

Не додавай характеристики, яких немає у вихідних даних.

============================================================
ОПИС
============================================================

descriptionUa:

Зроби якісний український комерційний рерайт.

Збережи фактичну інформацію.

Не вигадуй характеристики.

============================================================
HERO DESCRIPTION
============================================================

heroDescription:

ЦЕ НЕ ПОВНИЙ ОПИС ТОВАРУ.

Створи короткий комерційний опис для першого екрану.

Приблизно 2-4 речення.

Він повинен пояснювати:

- що це за товар;
- для чого він;
- головну користь;
- ключову особливість.

НЕ включай сюди:

- повний список характеристик;
- технічні характеристики;
- комплектацію;
- довгі списки;
- характеристики з params;
- повторення всього description.

============================================================
BADGE
============================================================

badgeText:

Створи короткий badge залежно від реального товару.

НЕ використовуй постійно "Новинка".

Badge повинен відповідати товару.

Приклади:

"⭐ Практичне рішення"
"🔥 Популярний вибір"
"✨ Зручний у використанні"
"🏠 Для дому"
"🚗 Для авто"
"💡 Розумне рішення"
"🎯 Для щоденного використання"

НЕ стверджуй "Бестселер", "Хіт продажу" або подібне,
якщо це не підтверджено даними.

============================================================
FEATURES
============================================================

Створи 3-4 основні переваги товару.

Кожна перевага:

title
text
icon
large

text повинен бути коротким.

НЕ вигадуй переваги.

Використовуй тільки інформацію з опису.

icon повинен бути ОДНИМ із дозволених Lucide icons.

============================================================
COMPACT
============================================================

Це універсальна інформаційна секція.

НЕ називай її "Power Bank".

Назву секції підбирай під товар.

Наприклад:

"Особливості використання"
"Зручність у повсякденному використанні"
"Для дому та подорожей"
"Як використовувати"

Обери тему відповідно до опису.

description — короткий текст.

bullets — 2-4 конкретні переваги або сценарії використання.

Не вигадуй.

============================================================
PORTS
============================================================

Ця секція також УНІВЕРСАЛЬНА.

Слово "ports" — лише технічна назва компонента.

НЕ пиши про порти, якщо товар їх не має.

Для кожного товару придумай доречну тему:

"Практичне використання"
"Що ви отримуєте"
"Особливості конструкції"
"Де стане у пригоді"
"Переваги використання"

Обери тільки тему, яка відповідає реальному опису.

Не вигадуй.

============================================================
PACKAGE
============================================================

Комплектацію потрібно ВИТЯГНУТИ з опису.

Не вигадуй комплектацію.

Якщо в описі є:

"Комплектація:
- щітка
- насадка
- стаканчик"

саме ці елементи потрібно повернути.

НЕ додавай автоматично:

"Фірмова упаковка"

якщо цього немає у вихідних даних.

============================================================
SPECIFICATIONS
============================================================

Це дуже важливо.

Створи технічні характеристики.

Джерела:

1. SOURCE PARAMETERS;
2. конкретні технічні характеристики, які явно вказані
   в описі товару.

НЕ використовуй власні знання.

НЕ вигадуй характеристики.

Приклад:

В описі є:

"Потужність: 800 Вт"

можна створити:

{
  "name": "Потужність",
  "value": "800 Вт"
}

В описі немає потужності —
НЕ створюй її.

Не дублюй однакові характеристики.

============================================================
FAQ
============================================================

Створи 4-6 питань і відповідей.

Питання повинні бути реальними питаннями покупця.

Відповіді повинні базуватися ТІЛЬКИ
на інформації про товар.

Не вигадуй:

- гарантію;
- доставку;
- матеріали;
- термін служби;
- характеристики;
- комплектацію.

Якщо інформації немає — не використовуй таке питання.

============================================================
REVIEWS
============================================================

Створи 3-5 ДЕМОНСТРАЦІЙНИХ відгуків для дизайну сторінки.

Відгуки повинні базуватися тільки на реальних
властивостях товару з опису.

Не вигадуй конкретних технічних характеристик.

rating — число від 4 до 5.

Відгуки НЕ повинні містити неправдивих тверджень
про характеристики, яких немає у вихідних даних.

============================================================
SOURCE PARAMETERS
============================================================

SOURCE PARAMETERS є джерелом параметрів.

Не можна:

- додавати параметри;
- видаляти параметри;
- об'єднувати параметри;
- змінювати порядок;
- змінювати числа;
- змінювати моделі;
- змінювати коди.

p1 -> перший параметр
p2 -> другий параметр
і так далі.

Назву параметра переклади українською.

Значення переклади українською, якщо це текст.

Числа НЕ змінюй.

Технічні коди НЕ змінюй.

Одиницю вимірювання НЕ вигадуй.

============================================================
SEO
============================================================

seoTitle <= 60 символів.

seoDescription <= 160 символів.

============================================================
ФОРМАТ
============================================================

Поверни тільки JSON.

Без Markdown.

Без пояснень.

Без тексту поза JSON.
`.trim();
    /**
     * ==========================================================
     * USER PROMPT
     * ==========================================================
     */
    const userPrompt = `
НАЗВА:

${sourceName}


ОПИС:

${sourceDescription ||
        "Опис відсутній."}


SOURCE PARAMETERS:

${sourceParamsJson}


Кількість SOURCE PARAMETERS:

${paramsCount}


КРИТИЧНО:

Не вигадуй інформацію.

Особливо уважно перевір:

1. specifications;
2. package;
3. features;
4. faq;
5. heroDescription.

Технічні характеристики та комплектацію
можна брати з опису лише тоді,
коли вони там прямо зазначені.

SOURCE PARAMETERS потрібно зберегти
в тій самій кількості та порядку.
`.trim();
    /**
     * ==========================================================
     * OPENAI
     * ==========================================================
     *
     * РІВНО ОДИН ЗАПИТ.
     */
    console.log("🤖 Generating complete product config...");
    const response = await openai.responses.create({
        model: "gpt-5-nano",
        input: [
            {
                role: "system",
                content: systemPrompt,
            },
            {
                role: "user",
                content: userPrompt,
            },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "complete_product_config",
                strict: true,
                schema: createConfigSchema(paramsCount),
            },
        },
    });
    /**
     * ==========================================================
     * RESPONSE
     * ==========================================================
     */
    const result = response.output_text;
    if (!result?.trim()) {
        throw new Error("OpenAI returned an empty response.");
    }
    let rawResponse;
    try {
        rawResponse =
            JSON.parse(result);
    }
    catch (error) {
        throw new Error("Failed to parse OpenAI response: " +
            String(error));
    }
    /**
     * ==========================================================
     * BASIC FIELDS
     * ==========================================================
     */
    const nameUa = rawResponse.nameUa;
    const descriptionUa = rawResponse.descriptionUa;
    const seoTitle = rawResponse.seoTitle;
    const seoDescription = rawResponse.seoDescription;
    const rawParams = rawResponse.paramsUa;
    if (typeof nameUa !== "string" ||
        !nameUa.trim()) {
        throw new Error("OpenAI returned empty nameUa.");
    }
    if (typeof descriptionUa !== "string" ||
        !descriptionUa.trim()) {
        throw new Error("OpenAI returned empty descriptionUa.");
    }
    if (typeof seoTitle !== "string" ||
        !seoTitle.trim()) {
        throw new Error("OpenAI returned empty seoTitle.");
    }
    if (typeof seoDescription !== "string" ||
        !seoDescription.trim()) {
        throw new Error("OpenAI returned empty seoDescription.");
    }
    /**
     * ==========================================================
     * PARAMS
     * ==========================================================
     */
    if (!rawParams ||
        typeof rawParams !== "object" ||
        Array.isArray(rawParams)) {
        throw new Error("OpenAI returned invalid paramsUa.");
    }
    const rawParamsObject = rawParams;
    const paramsUa = [];
    for (let i = 0; i < paramsCount; i++) {
        const key = `p${i + 1}`;
        const rawParam = rawParamsObject[key];
        if (!rawParam ||
            typeof rawParam !== "object" ||
            Array.isArray(rawParam)) {
            throw new Error(`OpenAI returned invalid parameter ${key}.`);
        }
        const param = rawParam;
        const name = param.name;
        const value = param.value;
        const unit = param.unit;
        if (typeof name !== "string") {
            throw new Error(`Invalid name for ${key}.`);
        }
        if (typeof value !== "string") {
            throw new Error(`Invalid value for ${key}.`);
        }
        if (unit !== null &&
            typeof unit !== "string") {
            throw new Error(`Invalid unit for ${key}.`);
        }
        paramsUa.push({
            name: name.trim(),
            value: value.trim(),
            unit: typeof unit === "string"
                ? unit.trim() || null
                : null,
        });
    }
    /**
     * ==========================================================
     * PARAM VALIDATION
     * ==========================================================
     */
    const paramsError = validateParams(product.params, paramsUa);
    if (paramsError) {
        throw new Error(paramsError);
    }
    /**
     * ==========================================================
     * OTHER GENERATED FIELDS
     * ==========================================================
     */
    const badgeText = rawResponse.badgeText;
    const heroDescription = rawResponse.heroDescription;
    const features = rawResponse.features;
    const compact = rawResponse.compact;
    const ports = rawResponse.ports;
    const packageConfig = rawResponse.package;
    const specifications = rawResponse.specifications;
    const faq = rawResponse.faq;
    const reviews = rawResponse.reviews;
    if (typeof badgeText !== "string" ||
        !badgeText.trim()) {
        throw new Error("OpenAI returned empty badgeText.");
    }
    if (typeof heroDescription !== "string" ||
        !heroDescription.trim()) {
        throw new Error("OpenAI returned empty heroDescription.");
    }
    if (!features ||
        typeof features !== "object" ||
        Array.isArray(features)) {
        throw new Error("OpenAI returned invalid features.");
    }
    if (!compact ||
        typeof compact !== "object" ||
        Array.isArray(compact)) {
        throw new Error("OpenAI returned invalid compact.");
    }
    if (!ports ||
        typeof ports !== "object" ||
        Array.isArray(ports)) {
        throw new Error("OpenAI returned invalid ports.");
    }
    if (!packageConfig ||
        typeof packageConfig !== "object" ||
        Array.isArray(packageConfig)) {
        throw new Error("OpenAI returned invalid package.");
    }
    if (!specifications ||
        typeof specifications !== "object" ||
        Array.isArray(specifications)) {
        throw new Error("OpenAI returned invalid specifications.");
    }
    if (!Array.isArray(faq)) {
        throw new Error("OpenAI returned invalid faq.");
    }
    if (!Array.isArray(reviews)) {
        throw new Error("OpenAI returned invalid reviews.");
    }
    /**
     * ==========================================================
     * SEO NORMALIZATION
     * ==========================================================
     */
    const finalSeoTitle = trimSeoText(seoTitle, SEO_TITLE_MAX);
    const finalSeoDescription = trimSeoText(seoDescription, SEO_DESCRIPTION_MAX);
    if (finalSeoTitle.length >
        SEO_TITLE_MAX) {
        throw new Error("SEO title exceeds 60 characters.");
    }
    if (finalSeoDescription.length >
        SEO_DESCRIPTION_MAX) {
        throw new Error("SEO description exceeds 160 characters.");
    }
    /**
     * ==========================================================
     * RESULT
     * ==========================================================
     */
    const rewritten = {
        nameUa: nameUa.trim(),
        descriptionUa: descriptionUa.trim(),
        seoTitle: finalSeoTitle,
        seoDescription: finalSeoDescription,
        paramsUa,
        badgeText: badgeText.trim(),
        heroDescription: heroDescription.trim(),
        features: features,
        compact: compact,
        ports: ports,
        package: packageConfig,
        specifications: specifications,
        faq: faq,
        reviews: reviews,
    };
    /**
     * ==========================================================
     * SUCCESS
     * ==========================================================
     */
    console.log("✅ Complete product content generated.");
    console.log(`SEO title: ${finalSeoTitle.length} chars`);
    console.log(`SEO description: ${finalSeoDescription.length} chars`);
    console.log(`Params: ${paramsUa.length}`);
    console.log(`Features: ${rewritten.features.items.length}`);
    console.log(`Specifications: ${rewritten.specifications.items.length}`);
    console.log(`FAQ: ${rewritten.faq.length}`);
    console.log(`Reviews: ${rewritten.reviews.length}`);
    return rewritten;
}
//# sourceMappingURL=rewrite-product.js.map