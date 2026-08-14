import OpenAI from "openai";

import {
  NormalizedProduct,
} from "../importer/normalize-product";


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


export interface RewrittenProductParam {
  name: string;
  value: string;
  unit: string | null;
}


export interface RewrittenProduct {
  nameUa: string;
  descriptionUa: string;
  seoTitle: string;
  seoDescription: string;
  paramsUa: RewrittenProductParam[];
}


/**
 * ============================================================
 * SEO LIMITS
 * ============================================================
 */

const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;


/**
 * ============================================================
 * TRIM SEO
 * ============================================================
 *
 * AI повинен одразу генерувати текст у межах ліміту.
 *
 * Це додаткова страховка.
 *
 * Ніяких повторних запитів до OpenAI.
 */

function trimSeoText(
  value: string,
  maxLength: number
): string {

  const text =
    value
      .trim()
      .replace(/\s+/g, " ");


  if (
    text.length <= maxLength
  ) {
    return text;
  }


  /**
   * Спочатку обрізаємо.
   */

  let result =
    text.slice(
      0,
      maxLength
    );


  /**
   * Не залишаємо обрізане слово,
   * якщо можемо цього уникнути.
   */

  const lastSpace =
    result.lastIndexOf(" ");


  if (
    lastSpace > 0
  ) {

    result =
      result.slice(
        0,
        lastSpace
      );

  }


  return result.trim();
}


/**
 * ============================================================
 * NUMBERS
 * ============================================================
 */

function extractNumbers(
  value: string
): string[] {

  return value.match(
    /[-+]?\d+(?:[.,]\d+)?/g
  ) ?? [];
}


/**
 * ============================================================
 * TECHNICAL TOKENS
 * ============================================================
 */

function extractTechnicalTokens(
  value: string
): string[] {

  return (
    value.match(
      /\b[A-Za-zА-Яа-яІіЇїЄєҐґ0-9]*[A-Za-z][A-Za-zА-Яа-яІіЇїЄєҐґ0-9_-]*\b/g
    ) ?? []
  ).filter(
    token =>
      /\d/.test(token) ||
      /[A-Z]/.test(token)
  );
}


/**
 * ============================================================
 * PARAM VALIDATION
 * ============================================================
 *
 * Тут НЕ перевіряємо SEO.
 *
 * SEO не повинно запускати повторний запит.
 */

function validateParams(
  sourceParams: NormalizedProduct["params"],
  rewrittenParams: RewrittenProductParam[]
): string | null {

  /**
   * Кількість параметрів повинна залишитися
   * такою самою.
   */

  if (
    rewrittenParams.length !==
    sourceParams.length
  ) {

    return (
      `Кількість параметрів змінилася. ` +
      `Було: ${sourceParams.length}. ` +
      `Отримано: ${rewrittenParams.length}.`
    );
  }


  for (
    let i = 0;
    i < sourceParams.length;
    i++
  ) {

    const source =
      sourceParams[i];

    const rewritten =
      rewrittenParams[i];


    if (
      !source ||
      !rewritten
    ) {

      return (
        `Помилка параметра №${i + 1}.`
      );
    }


    /**
     * --------------------------------------------------------
     * NAME
     * --------------------------------------------------------
     */

    if (
      !rewritten.name?.trim()
    ) {

      return (
        `AI повернув порожню назву ` +
        `параметра №${i + 1}.`
      );
    }


    /**
     * --------------------------------------------------------
     * VALUE
     * --------------------------------------------------------
     */

    if (
      rewritten.value === undefined ||
      rewritten.value === null
    ) {

      return (
        `AI повернув порожнє значення ` +
        `параметра "${source.name}".`
      );
    }


    /**
     * --------------------------------------------------------
     * NUMBERS
     * --------------------------------------------------------
     *
     * Числові значення не можна змінювати.
     */

    const sourceNumbers =
      extractNumbers(
        source.value
      );

    const rewrittenNumbers =
      extractNumbers(
        rewritten.value
      );


    if (
      JSON.stringify(sourceNumbers) !==
      JSON.stringify(rewrittenNumbers)
    ) {

      return (
        `AI змінив числове значення ` +
        `параметра "${source.name}". ` +
        `Було: "${source.value}". ` +
        `Отримано: "${rewritten.value}".`
      );
    }


    /**
     * --------------------------------------------------------
     * TECHNICAL TOKENS
     * --------------------------------------------------------
     */

    const sourceTokens =
      extractTechnicalTokens(
        source.value
      );


    const rewrittenValue =
      rewritten.value;


    for (
      const token of sourceTokens
    ) {

      if (
        !rewrittenValue.includes(token)
      ) {

        return (
          `AI змінив технічне значення ` +
          `параметра "${source.name}". ` +
          `Не знайдено токен "${token}" ` +
          `у "${rewrittenValue}".`
        );
      }
    }


    /**
     * --------------------------------------------------------
     * UNIT
     * --------------------------------------------------------
     */

    const sourceUnit =
      source.unit?.trim() || null;

    const rewrittenUnit =
      rewritten.unit?.trim() || null;


    /**
     * Якщо одиниці не було —
     * AI не має права її вигадувати.
     */

    if (
      sourceUnit === null &&
      rewrittenUnit !== null
    ) {

      return (
        `AI додав одиницю вимірювання ` +
        `для параметра "${source.name}", ` +
        `хоча її не було у вихідних даних.`
      );
    }
  }


  return null;
}


/**
 * ============================================================
 * REWRITE PRODUCT
 * ============================================================
 */

export async function rewriteProduct(
  product: NormalizedProduct
): Promise<RewrittenProduct> {

  /**
   * ----------------------------------------------------------
   * SOURCE NAME
   * ----------------------------------------------------------
   */

  const sourceName =
    product.nameUa?.trim() ||
    product.name;


  /**
   * ----------------------------------------------------------
   * SOURCE DESCRIPTION
   * ----------------------------------------------------------
   */

  const sourceDescription =
    product.descriptionUa?.trim() ||
    product.description?.trim() ||
    "";


  /**
   * ----------------------------------------------------------
   * SOURCE PARAMETERS
   * ----------------------------------------------------------
   */

  const specifications =
    product.params
      .map(
        (
          param,
          index
        ) => {

          const unit =
            param.unit
              ? ` ${param.unit}`
              : "";


          return (
            `${index + 1}. ` +
            `${param.name}: ` +
            `${param.value}${unit}`
          );
        }
      )
      .join("\n");


  /**
   * ==========================================================
   * SYSTEM PROMPT
   * ==========================================================
   */

  const systemPrompt = `
Ти професійний український копірайтер
для інтернет-магазину.

Створи україномовний контент для товару.

============================================================
МОВА
============================================================

Весь результат повинен бути ВИКЛЮЧНО українською мовою.

Не використовуй російські слова.

Якщо вихідний текст російською —
переклади його природною українською
та зроби якісний комерційний рерайт.

============================================================
ФАКТИ
============================================================

Не вигадуй жодної інформації.

Не змінюй:

- числові характеристики;
- моделі;
- артикули;
- коди;
- бренди;
- технічні позначення.

Не вигадуй:

- комплектацію;
- матеріали;
- потужність;
- розміри;
- гарантію;
- виробника;
- країну виробництва;
- функції.

Не додавай ціну.

Не згадуй постачальника, XML, фід або AI.

============================================================
NAMEUA
============================================================

Створи коротку природну українську назву товару.

============================================================
DESCRIPTIONUA
============================================================

Створи природний український опис товару.

Збережи всю важливу фактичну інформацію
з вихідного опису.

Не вигадуй характеристик.

============================================================
SEO TITLE
============================================================

КРИТИЧНО:

SEO title повинен мати НЕ БІЛЬШЕ 60 символів.

Максимум: 60 символів.

Це жорстке обмеження.

Створи SEO title одразу таким,
щоб він помістився у 60 символів.

Не перевищуй 60 символів навіть на 1 символ.

SEO title повинен:

- бути українською;
- містити назву товару або ключову частину назви;
- бути природним;
- бути придатним для пошукової видачі.

============================================================
SEO DESCRIPTION
============================================================

КРИТИЧНО:

SEO description повинен мати НЕ БІЛЬШЕ 160 символів.

Максимум: 160 символів.

Це жорстке обмеження.

Створи SEO description одразу таким,
щоб він помістився у 160 символів.

Не перевищуй 160 символів навіть на 1 символ.

SEO description повинен:

- бути українською;
- коротко описувати товар;
- містити його призначення або ключову особливість;
- мотивувати перейти на сторінку товару.

============================================================
ПАРАМЕТРИ
============================================================

ПОВЕРНИ ВСІ параметри.

Не можна:

- видаляти параметри;
- додавати параметри;
- змінювати кількість;
- змінювати порядок.

Для кожного параметра поверни:

name
value
unit

============================================================
НАЗВА ПАРАМЕТРА
============================================================

name ПОВИНЕН бути українською.

Приклади:

"Цвет" -> "Колір"

"Вес" -> "Вага"

"Высота" -> "Висота"

"Ширина" -> "Ширина"

"Длина" -> "Довжина"

"Мощность" -> "Потужність"

"Потребляемая мощность" ->
"Споживана потужність"

"Объем" -> "Об'єм"

"Состояние" -> "Стан"

"Материал" -> "Матеріал"

============================================================
ЗНАЧЕННЯ ПАРАМЕТРА
============================================================

value також повинен бути українською.

Приклади:

"Черный" -> "Чорний"

"Белый" -> "Білий"

"Красный" -> "Червоний"

"Новое" -> "Нове"

"Электронное" -> "Електронне"

"Алюминий" -> "Алюміній"

"Сталь" -> "Сталь"

Але:

800 -> 800

0.5 -> 0.5

PX163 -> PX163

USB-C -> USB-C

Не змінюй числові значення,
моделі, артикули, бренди та технічні коди.

============================================================
UNIT
============================================================

unit повинен бути українською
або стандартним міжнародним позначенням.

Не змінюй стандартні одиниці:

мм
см
м
км
г
кг
мг
л
мл
Вт
В
А
Гц
МГц
ГБ
МБ

Приклади:

"штука" -> "шт."

"штуки" -> "шт."

"килограмм" -> "кг"

"литр" -> "л"

Якщо unit відсутній —
поверни null.

Не перенось unit у value.

ПРАВИЛЬНО:

value: "800"
unit: "Вт"

НЕПРАВИЛЬНО:

value: "800 Вт"
unit: "Вт"

Не конвертуй одиниці.

1000 мм -> НЕ перетворювати на 1 м.

============================================================
РОСІЙСЬКА МОВА
============================================================

У фінальному JSON не повинно бути російської
мови в:

nameUa
descriptionUa
seoTitle
seoDescription
paramsUa.name
paramsUa.value
paramsUa.unit

============================================================
ФОРМАТ
============================================================

Поверни ТІЛЬКИ JSON.

Не додавай Markdown.

Не додавай пояснення.

Не додавай текст поза JSON.
`.trim();


  /**
   * ==========================================================
   * USER PROMPT
   * ==========================================================
   */

  const userPrompt = `
Назва товару:

${sourceName}


Опис товару:

${
  sourceDescription ||
  "Опис відсутній."
}


Характеристики:

${
  specifications ||
  "Характеристики відсутні."
}


ПЕРЕВІР ПЕРЕД ВІДПОВІДДЮ:

1. SEO title <= 60 символів.
2. SEO description <= 160 символів.
3. Усі параметри присутні.
4. Кількість параметрів не змінилася.
5. Порядок параметрів не змінився.
6. Числа не змінені.
7. Моделі та коди не змінені.
8. Назви параметрів українською.
9. Значення параметрів українською.
10. Одиниці українською або стандартними позначеннями.
11. Весь текст українською.
`.trim();


  /**
   * ==========================================================
   * OPENAI
   * ==========================================================
   *
   * ТІЛЬКИ ОДИН ЗАПИТ.
   *
   * Ніяких attempt 2/3.
   */

  console.log(
    "🤖 Generating product content..."
  );


  const response =
    await openai.responses.create({

      model:
        "gpt-5-nano",

      input: [

        {
          role:
            "system",

          content:
            systemPrompt,
        },

        {
          role:
            "user",

          content:
            userPrompt,
        },

      ],

      text: {

        format: {

          type:
            "json_schema",

          name:
            "rewritten_product",

          strict:
            true,

          schema: {

            type:
              "object",

            properties: {

              nameUa: {
                type:
                  "string",
              },

              descriptionUa: {
                type:
                  "string",
              },

              seoTitle: {
                type:
                  "string",
              },

              seoDescription: {
                type:
                  "string",
              },

              paramsUa: {

                type:
                  "array",

                items: {

                  type:
                    "object",

                  properties: {

                    name: {
                      type:
                        "string",
                    },

                    value: {
                      type:
                        "string",
                    },

                    unit: {

                      anyOf: [

                        {
                          type:
                            "string",
                        },

                        {
                          type:
                            "null",
                        },

                      ],

                    },

                  },

                  required: [
                    "name",
                    "value",
                    "unit",
                  ],

                  additionalProperties:
                    false,
                },
              },

            },

            required: [
              "nameUa",
              "descriptionUa",
              "seoTitle",
              "seoDescription",
              "paramsUa",
            ],

            additionalProperties:
              false,
          },
        },
      },
    });


  /**
   * ==========================================================
   * RESPONSE
   * ==========================================================
   */

  const result =
    response.output_text;


  if (
    !result?.trim()
  ) {

    throw new Error(
      "OpenAI returned an empty response."
    );
  }


  /**
   * ==========================================================
   * PARSE JSON
   * ==========================================================
   */

  let rewritten:
    RewrittenProduct;


  try {

    rewritten =
      JSON.parse(
        result
      ) as RewrittenProduct;

  } catch (error) {

    throw new Error(
      "Failed to parse OpenAI response: " +
      String(error)
    );
  }


  /**
   * ==========================================================
   * REQUIRED FIELDS
   * ==========================================================
   */

  if (
    !rewritten.nameUa?.trim()
  ) {

    throw new Error(
      "OpenAI returned empty nameUa."
    );
  }


  if (
    !rewritten.descriptionUa?.trim()
  ) {

    throw new Error(
      "OpenAI returned empty descriptionUa."
    );
  }


  if (
    !rewritten.seoTitle?.trim()
  ) {

    throw new Error(
      "OpenAI returned empty seoTitle."
    );
  }


  if (
    !rewritten.seoDescription?.trim()
  ) {

    throw new Error(
      "OpenAI returned empty seoDescription."
    );
  }


  if (
    !Array.isArray(
      rewritten.paramsUa
    )
  ) {

    throw new Error(
      "OpenAI returned invalid paramsUa."
    );
  }


  /**
   * ==========================================================
   * NORMALIZE
   * ==========================================================
   */

  rewritten = {

    nameUa:
      rewritten.nameUa.trim(),

    descriptionUa:
      rewritten.descriptionUa.trim(),

    /**
     * Додаткова локальна страховка.
     *
     * Ніякого повторного API-запиту.
     */

    seoTitle:
      trimSeoText(
        rewritten.seoTitle,
        SEO_TITLE_MAX
      ),

    seoDescription:
      trimSeoText(
        rewritten.seoDescription,
        SEO_DESCRIPTION_MAX
      ),

    paramsUa:
      rewritten.paramsUa.map(
        param => ({

          name:
            param.name?.trim() ?? "",

          value:
            param.value?.trim() ?? "",

          unit:
            param.unit?.trim() || null,

        })
      ),

  };


  /**
   * ==========================================================
   * VALIDATE PARAMS
   * ==========================================================
   *
   * Якщо параметри неправильні —
   * кидаємо помилку.
   *
   * НЕ робимо повторний запит.
   */

  const paramsError =
    validateParams(
      product.params,
      rewritten.paramsUa
    );


  if (
    paramsError
  ) {

    throw new Error(
      paramsError
    );
  }


  /**
   * ==========================================================
   * FINAL SEO CHECK
   * ==========================================================
   *
   * Після локального обрізання SEO
   * гарантовано не перевищує ліміти.
   */

  if (
    rewritten.seoTitle.length >
    SEO_TITLE_MAX
  ) {

    throw new Error(
      "SEO title exceeds 60 characters."
    );
  }


  if (
    rewritten.seoDescription.length >
    SEO_DESCRIPTION_MAX
  ) {

    throw new Error(
      "SEO description exceeds 160 characters."
    );
  }


  /**
   * ==========================================================
   * SUCCESS
   * ==========================================================
   */

  console.log(
    "✅ Product content generated successfully."
  );

  console.log(
    `SEO title: ${rewritten.seoTitle.length} chars`
  );

  console.log(
    `SEO description: ${rewritten.seoDescription.length} chars`
  );

  console.log(
    `Params: ${rewritten.paramsUa.length}`
  );


  return rewritten;
}