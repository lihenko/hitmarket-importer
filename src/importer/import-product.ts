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
   * 2. ШУКАЄМО ТОВАР У БАЗІ
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
   * Для існуючого товару НЕ робимо:
   *
   * - OpenAI
   * - рерайт
   * - зміну назви
   * - зміну опису
   * - зміну SEO
   * - зміну config
   * - завантаження картинок
   * - синхронізацію характеристик
   * - зміну категорії
   *
   * Перевіряємо тільки:
   *
   * - price
   * - oldPrice
   * - available
   */

  if (existing) {

    const changes: {
      price?: number;
      oldPrice?: number | null;
      available?: boolean;
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
     * ОНОВЛЮЄМО ТІЛЬКИ ЯКЩО Є ЗМІНИ
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


    /**
     * Нічого більше з товаром
     * не робимо.
     */

    return {

      productId:
        existing.id,

      categoryId:
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
   * Якщо товар при першому імпорті
   * має available=false —
   *
   * НЕ створюємо його в БД.
   *
   * НЕ запускаємо OpenAI.
   *
   * НЕ завантажуємо картинки.
   *
   * НЕ створюємо характеристики.
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
   * 5. OPENAI
   * ============================================================
   *
   * На цьому етапі ми вже точно знаємо:
   *
   * - товар новий
   * - товар доступний
   *
   * Тому запускаємо AI.
   *
   * rewriteProduct() використовує:
   *
   * nameUa
   * descriptionUa
   *
   * як основне джерело.
   *
   * Якщо українських даних немає —
   * використовуються name / description.
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
   * 6. ГЕНЕРАЦІЯ CONFIG
   * ============================================================
   *
   * generateProductConfig()
   * поки що працює від NormalizedProduct.
   *
   * Тому створюємо копію product,
   * де підставляємо AI-контент.
   *
   * Оригінальний product
   * при цьому не змінюємо.
   */

  const productWithAiContent = {

    ...product,

    name:
      rewritten.nameUa,

    nameUa:
      rewritten.nameUa,

    description:
      rewritten.descriptionUa,

    descriptionUa:
      rewritten.descriptionUa,

  };


  const config =
    generateProductConfig(
      productWithAiContent
    );


  /**
   * ============================================================
   * 7. КАТЕГОРІЯ
   * ============================================================
   */

  let categoryId:
    number | null = null;


  if (product.category) {

    categoryId =
      await getOrCreateCategory({

        source:
          product.source,

        sourceCategoryId:
          product.category.id,

        name:
          product.category.name,

      });

  }


  /**
   * ============================================================
   * 8. СТВОРЕННЯ ТОВАРУ
   * ============================================================
   *
   * В БД записуємо:
   *
   * name
   * name_ua
   * description
   * description_ua
   * SEO
   * config
   *
   * український контент — результат AI.
   */

  const result =
    await createProduct({

      source:
        product.source,

      sourceOfferId:
        product.sourceOfferId,

      name:
        product.name,

      nameUa:
        rewritten.nameUa,

      slug:
        product.slug,

      price:
        product.price,

      oldPrice:
        product.oldPrice,

      available:
        product.available,

      vendor:
        product.vendor,

      description:
        product.description,

      descriptionUa:
        rewritten.descriptionUa,

      seoTitle:
        rewritten.seoTitle,

      seoDescription:
        rewritten.seoDescription,

      config,

    });


  const insert =
    result as {
      insertId: number;
    };


  const productId =
    insert.insertId;


  /**
   * ============================================================
   * 9. ЗОБРАЖЕННЯ
   * ============================================================
   *
   * Тільки для нового товару.
   *
   * saveProductImage():
   *
   * WebP → зберігаємо без перекодування
   *
   * JPG / PNG / інший формат
   * → конвертуємо в WebP
   *
   * Результат:
   *
   * /powerbank-landing/public/products/
   */

  for (
    const [
      index,
      imageUrl,
    ]
    of product.images.entries()
  ) {

    try {

      const fileName =
        `${product.slug}-${index}`;


      const localPath =
        await saveProductImage(
          imageUrl,
          fileName
        );


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
   * 10. ХАРАКТЕРИСТИКИ
   * ============================================================
   *
   * Тільки для нового товару.
   */

  await syncProductParams(
    productId,
    product.params
  );


  /**
   * ============================================================
   * 11. РЕЗУЛЬТАТ
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