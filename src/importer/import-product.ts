import {
  getOrCreateCategory,
} from "../database/categories";

import {
  createProduct,
  getProductBySourceOffer,
  updateProduct,
} from "../database/products";

import {
  getOrCreateProductImage,
} from "../database/product-images";

import {
  syncProductParams,
} from "../database/product-params";

import {
  normalizeProduct,
  SupplierProduct,
} from "./normalize-product";

import {
  generateProductConfig,
} from "./generate-config";

import {
  saveProductImage,
} from "./save-product-image";

import {
  rewriteProduct,
} from "../ai/rewrite-product";

import {
  translateCategoryName,
} from "../ai/translate-category";


/**
 * ============================================================
 * GENERATE SLUG
 * ============================================================
 *
 * Створює slug з української назви товару.
 *
 * Наприклад:
 *
 * "Повербанк Lenyes PX163 10000 мАг"
 *
 * =>
 *
 * "poverbank-lenyes-px163-10000-mah"
 */
function generateSlug(
  name: string
): string {

  const transliteration: Record<string, string> = {

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

    .map(
      char =>
        transliteration[char] ?? char
    )

    .join("")

    .replace(
      /[^a-z0-9\s-]/g,
      ""
    )

    .replace(
      /\s+/g,
      "-"
    )

    .replace(
      /-+/g,
      "-"
    )

    .replace(
      /^-+|-+$/g,
      ""

    )

    || "product";
}


/**
 * ============================================================
 * IMPORT PRODUCT
 * ============================================================
 */
export async function importProduct(
  supplierProduct: SupplierProduct
) {

  /**
   * ============================================================
   * 1. НОРМАЛІЗАЦІЯ
   * ============================================================
   */

  const product =
    normalizeProduct(
      supplierProduct
    );


  /**
   * ============================================================
   * 2. ШУКАЄМО ТОВАР У БД
   * ============================================================
   */

  const existing =
    await getProductBySourceOffer(
      product.source,
      product.sourceOfferId
    );


  /**
   * ============================================================
   * 3. ІСНУЮЧИЙ ТОВАР
   * ============================================================
   *
   * Для існуючого товару:
   *
   * НЕ запускаємо AI.
   *
   * НЕ змінюємо:
   *
   * - назву
   * - опис
   * - SEO
   * - slug
   * - config
   * - картинки
   * - характеристики
   *
   * Оновлюємо:
   *
   * - price
   * - oldPrice
   * - available
   *
   * Додатково:
   *
   * якщо category_id = NULL,
   * визначаємо та записуємо категорію.
   */

  if (existing) {

    const changes: {
      price?: number;
      oldPrice?: number | null;
      available?: boolean;
      categoryId?: number | null;
    } = {};


    /**
     * ----------------------------------------------------------
     * ЦІНА
     * ----------------------------------------------------------
     */

    if (
      existing.price !==
      product.price
    ) {

      changes.price =
        product.price;

    }


    /**
     * ----------------------------------------------------------
     * СТАРА ЦІНА
     * ----------------------------------------------------------
     */

    if (
      existing.old_price !==
      product.oldPrice
    ) {

      changes.oldPrice =
        product.oldPrice;

    }


    /**
     * ----------------------------------------------------------
     * НАЯВНІСТЬ
     * ----------------------------------------------------------
     */

    if (
      existing.available !==
      product.available
    ) {

      changes.available =
        product.available;

    }


    /**
     * ----------------------------------------------------------
     * КАТЕГОРІЯ
     * ----------------------------------------------------------
     *
     * Якщо категорія у товару вже є —
     * нічого не робимо.
     *
     * Якщо category_id NULL —
     * перекладаємо категорію та записуємо її.
     */

    if (
      existing.category_id === null &&
      product.category
    ) {

      console.log(
        `📂 Translating category: ${product.category.name}`
      );


      const categoryNameUa =
        await translateCategoryName(
          product.category.name
        );


      console.log(
        `📂 Category UA: ${categoryNameUa}`
      );


      const categoryId =
        await getOrCreateCategory({

          source:
            product.source,

          sourceCategoryId:
            product.category.id,

          name:
            categoryNameUa,

        });


      changes.categoryId =
        categoryId;


      console.log(
        `📂 Category ID: ${categoryId}`
      );

    }


    /**
     * ----------------------------------------------------------
     * ОНОВЛЕННЯ
     * ----------------------------------------------------------
     */

    if (
      Object.keys(changes).length > 0
    ) {

      await updateProduct(
        existing.id,
        changes
      );

    }


    return {

      productId:
        existing.id,

      categoryId:
        changes.categoryId ??
        existing.category_id,

      price:
        product.price,

      status:
        Object.keys(changes).length > 0
          ? "updated"
          : "unchanged",

    };

  }


  /**
   * ============================================================
   * 4. НОВИЙ ТОВАР, АЛЕ НЕДОСТУПНИЙ
   * ============================================================
   *
   * Якщо товар unavailable при першому імпорті —
   * взагалі нічого не створюємо.
   */

  if (
    product.available === false
  ) {

    return {

      productId:
        null,

      categoryId:
        null,

      price:
        product.price,

      status:
        "skipped",

    };

  }


  /**
   * ============================================================
   * 5. AI REWRITE
   * ============================================================
   *
   * AI генерує:
   *
   * - nameUa
   * - descriptionUa
   * - seoTitle
   * - seoDescription
   * - paramsUa
   */

  console.log(
    `🤖 Generating content: ${product.sourceOfferId}`
  );


  const rewritten =
    await rewriteProduct(
      product
    );


  /**
   * ============================================================
   * 6. SLUG
   * ============================================================
   *
   * Slug генеруємо ПІСЛЯ AI.
   *
   * Джерело:
   *
   * rewritten.nameUa
   */

  const slug =
    generateSlug(
      rewritten.nameUa
    );


  console.log(
    `🔗 Slug: ${slug}`
  );


  /**
   * ============================================================
   * 7. CONFIG
   * ============================================================
   *
   * Для config використовуємо
   * українські AI-дані.
   */

  const productWithAiContent = {

    ...product,

    name:
      rewritten.nameUa,

    description:
      rewritten.descriptionUa,

  };


  const config =
    generateProductConfig(
      productWithAiContent
    );


  /**
   * ============================================================
   * 8. КАТЕГОРІЯ
   * ============================================================
   *
   * Категорія з фіда може бути російською.
   *
   * Перекладаємо її перед записом у БД.
   *
   * Наприклад:
   *
   * "Электроинструменты"
   *
   * =>
   *
   * "Електроінструменти"
   */

  let categoryId:
    number | null = null;


  if (
    product.category
  ) {

    console.log(
      `📂 Translating category: ${product.category.name}`
    );


    const categoryNameUa =
      await translateCategoryName(
        product.category.name
      );


    console.log(
      `📂 Category UA: ${categoryNameUa}`
    );


    categoryId =
      await getOrCreateCategory({

        source:
          product.source,

        sourceCategoryId:
          product.category.id,

        name:
          categoryNameUa,

      });


    console.log(
      `📂 Category ID: ${categoryId}`
    );

  }


  /**
   * ============================================================
   * 9. СТВОРЮЄМО ТОВАР
   * ============================================================
   *
   * Нова структура БД:
   *
   * products.name
   *     = українська AI назва
   *
   * products.description
   *     = український AI опис
   *
   * products.category_id
   *     = ID категорії
   *
   * name_ua / description_ua
   * більше НЕ використовуються.
   */

  const result =
    await createProduct({

      source:
        product.source,

      sourceOfferId:
        product.sourceOfferId,

      name:
        rewritten.nameUa,

      slug,

      price:
        product.price,

      oldPrice:
        product.oldPrice,

      available:
        product.available,

      categoryId,

      vendor:
        product.vendor,

      description:
        rewritten.descriptionUa,

      seoTitle:
        rewritten.seoTitle,

      seoDescription:
        rewritten.seoDescription,

      config,

    });


  /**
   * ============================================================
   * 10. PRODUCT ID
   * ============================================================
   */

  const insert =
    result as {
      insertId: number;
    };


  const productId =
    insert.insertId;


  /**
   * ============================================================
   * 11. ЗОБРАЖЕННЯ
   * ============================================================
   *
   * Тільки для нового товару.
   */

  for (
    const [
      index,
      imageUrl,
    ]
    of product.images.entries()
  ) {

    try {

      /**
       * Файл називаємо за slug.
       */

      const fileName =
        `${slug}-${index}`;


      /**
       * Завантаження / конвертація.
       */

      const localPath =
        await saveProductImage(
          imageUrl,
          fileName
        );


      /**
       * Запис у БД.
       */

      await getOrCreateProductImage({

        productId,

        sourceUrl:
          imageUrl,

        localPath,

        sortOrder:
          index + 1,

      });


      console.log(
        `🖼️ Image ${index + 1} saved: ${localPath}`
      );


    } catch (error) {

      console.error(
        `❌ Failed to process image ${index + 1} ` +
        `for product ${product.sourceOfferId}:`,
        error
      );

    }

  }


  /**
   * ============================================================
   * 12. УКРАЇНСЬКІ ХАРАКТЕРИСТИКИ
   * ============================================================
   *
   * НЕ використовуємо:
   *
   * product.params
   *
   * тому що це оригінальні параметри постачальника.
   *
   * Використовуємо:
   *
   * rewritten.paramsUa
   *
   * де AI вже переклав:
   *
   * - name
   * - value
   * - unit
   */

  await syncProductParams(
    productId,
    rewritten.paramsUa
  );


  /**
   * ============================================================
   * 13. РЕЗУЛЬТАТ
   * ============================================================
   */

  console.log(
    `✅ Product created: ${product.sourceOfferId}`
  );


  return {

    productId,

    categoryId,

    price:
      product.price,

    status:
      "created",

  };

}