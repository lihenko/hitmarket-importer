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


export async function importProduct(
  supplierProduct: SupplierProduct
) {

  /**
   * 1. Нормалізація даних
   */
  const product =
    normalizeProduct(
      supplierProduct
    );


  /**
   * 2. Шукаємо товар
   *
   * Робимо це ДО генерації config,
   * категорій та інших операцій.
   */
  const existing =
    await getProductBySourceOffer(
      product.source,
      product.sourceOfferId
    );


  /**
   * 3. Якщо товар НОВИЙ і спочатку
   *    unavailable — повністю пропускаємо.
   *
   * В БД він взагалі не потрапить.
   */
  if (!existing && product.available === false) {

    return {
      productId: null,
      categoryId: null,
      price: product.price,
      status: "skipped",
    };

  }


  /**
   * 4. Генерація структури лендинга
   *
   * Робимо тільки для товарів,
   * які реально будемо створювати/оновлювати.
   */
  const config =
    generateProductConfig(
      product
    );


  /**
   * 5. Категорія
   */
  let categoryId: number | null = null;

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
   * 6. Новий товар
   */
  let productId: number;

  if (!existing) {

    /**
     * НОВИЙ ТОВАР
     */
    const result =
      await createProduct({

        source:
          product.source,

        sourceOfferId:
          product.sourceOfferId,

        name:
          product.name,

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

        seoTitle:
          config.seo.title,

        seoDescription:
          config.seo.description,

        config,

      });


    const insert =
      result as {
        insertId: number;
      };


    productId =
      insert.insertId;


  } else {

    /**
     * ІСНУЮЧИЙ ТОВАР
     *
     * Оновлюємо тільки:
     * - ціну
     * - стару ціну
     * - наявність
     */

    productId =
      existing.id;


    await updateProduct(

      productId,

      {

        price:
          product.price,

        oldPrice:
          product.oldPrice,

        available:
          product.available,

      }

    );

  }


  /**
   * 7. Картинки
   *
   * Додаємо тільки для нового товару.
   */
  if (!existing) {

    for (
      const [index, imageUrl]
      of product.images.entries()
    ) {

      await getOrCreateProductImage({

        productId,

        sourceUrl:
          imageUrl,

        localPath:
          `/products/${product.slug}-${index}.webp`,

        sortOrder:
          index + 1,

      });

    }

  }


  /**
   * 8. Характеристики
   *
   * Додаємо тільки для нового товару.
   */
  if (!existing) {

    await syncProductParams(

      productId,

      product.params

    );

  }


  /**
   * 9. Результат
   */
  return {

    productId,

    categoryId,

    price:
      product.price,

    status:
      existing
        ? "updated"
        : "created",

  };

}