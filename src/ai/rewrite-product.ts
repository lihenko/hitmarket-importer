import OpenAI from "openai";

import {
  NormalizedProduct,
} from "../importer/normalize-product";


const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });


export interface RewrittenProduct {

  nameUa: string;

  descriptionUa: string;

  seoTitle: string;

  seoDescription: string;

}


/**
 * Перекладає та переписує контент товару
 * українською мовою.
 *
 * Викликається тільки для НОВИХ товарів.
 */
export async function rewriteProduct(
  product: NormalizedProduct
): Promise<RewrittenProduct> {

  /**
   * Для AI використовуємо українські дані,
   * якщо вони є.
   *
   * Якщо українського контенту немає —
   * використовуємо оригінальний.
   */
  const sourceName =
    product.nameUa?.trim() ||
    product.name;


  const sourceDescription =
    product.descriptionUa?.trim() ||
    product.description?.trim() ||
    "";


  /**
   * Передаємо характеристики окремо.
   *
   * AI може використовувати їх
   * для нормального опису,
   * але не має права змінювати
   * їх значення.
   */
  const specifications =
    product.params
      .map(param => {

        const unit =
          param.unit
            ? ` ${param.unit}`
            : "";

        return `${param.name}: ${param.value}${unit}`;

      })
      .join("\n");


  const response =
    await openai.responses.create({

      model:
        "gpt-5-mini",

      input: [

        {
          role: "system",

          content: `
Ти професійний український копірайтер
для інтернет-магазину.

Твоє завдання — створити унікальний
україномовний контент для товару.

ВАЖЛИВІ ПРАВИЛА:

1. Пиши виключно українською мовою.

2. Не перекладай текст дослівно.
   Зроби природний комерційний рерайт.

3. Не вигадуй характеристики товару.

4. Не вигадуй:
   - комплектацію;
   - матеріали;
   - потужність;
   - розміри;
   - гарантію;
   - виробника;
   - країну виробництва;
   - функції,
   якщо цього немає у вихідних даних.

5. Усі числа, моделі, назви та технічні
   характеристики повинні залишатися
   достовірними.

6. Не використовуй фрази:
   "найкращий товар",
   "номер один",
   "гарантовано найвища якість"
   та інші необґрунтовані рекламні твердження.

7. Назва товару повинна бути короткою,
   зрозумілою та придатною для каталогу.

8. Опис повинен бути корисним покупцю,
   природним і читабельним.

9. Не згадуй постачальника,
   XML, фід, переклад або AI.

10. Не додавай Markdown-заголовки
    або службові пояснення.

11. SEO title повинен бути природним
    та містити назву товару.

12. SEO description повинна коротко
    описувати товар і мотивувати перейти
    на сторінку.

13. Не додавай ціну.
    Ціна формується магазином окремо.

14. Не змінюй модель товару.

15. Якщо у вихідному українському описі
    є корисна інформація — обов'язково
    збережи її після рерайту.
          `.trim(),
        },

        {
          role: "user",

          content: `
Назва товару:
${sourceName}

Опис товару:
${sourceDescription || "Опис відсутній."}

Характеристики:
${specifications || "Характеристики відсутні."}
          `.trim(),
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

            },

            required: [
              "nameUa",
              "descriptionUa",
              "seoTitle",
              "seoDescription",
            ],

            additionalProperties:
              false,

          },

        },

      },

    });


  /**
   * Отримуємо структурований результат.
   */
  const result =
    response.output_text;


  if (!result) {

    throw new Error(
      "OpenAI returned an empty response"
    );

  }


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
   * Мінімальна перевірка результату.
   */
  if (
    !rewritten.nameUa?.trim()
  ) {

    throw new Error(
      "OpenAI returned empty nameUa"
    );

  }


  if (
    !rewritten.descriptionUa?.trim()
  ) {

    throw new Error(
      "OpenAI returned empty descriptionUa"
    );

  }


  if (
    !rewritten.seoTitle?.trim()
  ) {

    throw new Error(
      "OpenAI returned empty seoTitle"
    );

  }


  if (
    !rewritten.seoDescription?.trim()
  ) {

    throw new Error(
      "OpenAI returned empty seoDescription"
    );

  }


  return {

    nameUa:
      rewritten.nameUa.trim(),

    descriptionUa:
      rewritten.descriptionUa.trim(),

    seoTitle:
      rewritten.seoTitle.trim(),

    seoDescription:
      rewritten.seoDescription.trim(),

  };

}