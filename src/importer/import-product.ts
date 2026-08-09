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
   * 2. Генерація структури лендинга
   */
  const config =
    generateProductConfig(
      product
    );



  /**
   * 3. Категорія
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
   * 4. Шукаємо товар
   */
  const existing =
    await getProductBySourceOffer(
      product.source,
      product.sourceOfferId
    );


  let productId: number;



  /**
   * НОВИЙ ТОВАР
   */
  if (!existing) {


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
   * 5. Картинки
   *
   * Додаємо тільки для нового товару
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
   * 6. Характеристики
   *
   * Додаємо тільки для нового товару
   */
  if (!existing) {


    await syncProductParams(

      productId,

      product.params

    );

  }



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