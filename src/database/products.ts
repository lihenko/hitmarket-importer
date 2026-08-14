import { db } from "./connection";


export interface Product {
  id: number;

  // Source identification
  source: string;
  source_offer_id: string;
  vendor_code: string | null;

  // Basic product data
  name: string;
  slug: string;

  // Price / availability
  price: number;
  old_price: number | null;
  available: boolean;

  // Category
  category_id: number | null;

  // Supplier information
  vendor: string | null;
  country_of_origin: string | null;

  // Content
  description: string | null;

  // Generated landing content
  config: Record<string, unknown> | null;

  // SEO
  seo_title: string | null;
  seo_description: string | null;

  // Processing status
  content_status:
    | "pending"
    | "generated"
    | "error"
    | "skipped";

  content_error: string | null;
  content_generated_at: Date | null;

  created_at: Date;
  updated_at: Date;
}


/**
 * ============================================================
 * GET PRODUCTS COUNT
 * ============================================================
 */
export async function getProductsCount() {

  const [rows] = await db.query(
    `
    SELECT COUNT(*) as count
    FROM products
    `
  );

  return rows;
}


/**
 * ============================================================
 * GET PRODUCT BY SOURCE OFFER
 * ============================================================
 */
export async function getProductBySourceOffer(
  source: string,
  sourceOfferId: string
) {

  const [rows] = await db.query(
    `
    SELECT *
    FROM products
    WHERE source = ?
    AND source_offer_id = ?
    LIMIT 1
    `,
    [
      source,
      sourceOfferId,
    ]
  );

  const products =
    rows as Product[];

  return products[0] ?? null;
}


/**
 * ============================================================
 * CREATE PRODUCT
 * ============================================================
 */
export async function createProduct(product: {
  source: string;

  sourceOfferId: string;

  vendorCode?: string | null;

  name: string;

  slug: string;

  price: number;

  oldPrice?: number | null;

  available?: boolean;

  /**
   * ID категорії з таблиці categories.
   */
  categoryId?: number | null;

  vendor?: string | null;

  countryOfOrigin?: string | null;

  description?: string | null;

  seoTitle?: string | null;

  seoDescription?: string | null;

  config?: Record<string, unknown> | null;
}) {

  const [result] = await db.query(
    `
    INSERT INTO products
    (
      source,
      source_offer_id,
      vendor_code,

      name,
      slug,

      price,
      old_price,
      available,

      category_id,

      vendor,
      country_of_origin,

      description,

      seo_title,
      seo_description,

      config
    )
    VALUES
    (
      ?, ?, ?,

      ?, ?,

      ?, ?, ?,

      ?,

      ?, ?,

      ?,

      ?, ?,

      ?
    )
    `,
    [
      product.source,

      product.sourceOfferId,

      product.vendorCode ?? null,

      product.name,

      product.slug,

      product.price,

      product.oldPrice ?? null,

      product.available ? 1 : 0,

      product.categoryId ?? null,

      product.vendor ?? null,

      product.countryOfOrigin ?? null,

      product.description ?? null,

      product.seoTitle ?? null,

      product.seoDescription ?? null,

      product.config
        ? JSON.stringify(product.config)
        : null,
    ]
  );

  return result;
}


/**
 * ============================================================
 * UPDATE PRODUCT
 * ============================================================
 *
 * Для існуючого товару можна оновлювати:
 *
 * - назву
 * - slug
 * - ціну
 * - стару ціну
 * - наявність
 * - категорію
 * - постачальника
 * - країну
 * - опис
 * - SEO
 * - config
 * - статус генерації
 *
 * Зображення та параметри тут НЕ обробляються.
 */
export async function updateProduct(
  id: number,
  product: {

    name?: string;

    slug?: string;

    price?: number;

    oldPrice?: number | null;

    available?: boolean;

    /**
     * ID категорії з таблиці categories.
     */
    categoryId?: number | null;

    vendor?: string | null;

    countryOfOrigin?: string | null;

    description?: string | null;

    seoTitle?: string | null;

    seoDescription?: string | null;

    config?: Record<string, unknown> | null;

    contentStatus?:
      | "pending"
      | "generated"
      | "error"
      | "skipped";

    contentError?: string | null;

    contentGeneratedAt?: Date | null;
  }
) {

  const fields: string[] = [];

  const values: unknown[] = [];


  /**
   * ----------------------------------------------------------
   * NAME
   * ----------------------------------------------------------
   */
  if (
    product.name !== undefined
  ) {

    fields.push(
      "name = ?"
    );

    values.push(
      product.name
    );
  }


  /**
   * ----------------------------------------------------------
   * SLUG
   * ----------------------------------------------------------
   */
  if (
    product.slug !== undefined
  ) {

    fields.push(
      "slug = ?"
    );

    values.push(
      product.slug
    );
  }


  /**
   * ----------------------------------------------------------
   * PRICE
   * ----------------------------------------------------------
   */
  if (
    product.price !== undefined
  ) {

    fields.push(
      "price = ?"
    );

    values.push(
      product.price
    );
  }


  /**
   * ----------------------------------------------------------
   * OLD PRICE
   * ----------------------------------------------------------
   */
  if (
    product.oldPrice !== undefined
  ) {

    fields.push(
      "old_price = ?"
    );

    values.push(
      product.oldPrice
    );
  }


  /**
   * ----------------------------------------------------------
   * AVAILABLE
   * ----------------------------------------------------------
   */
  if (
    product.available !== undefined
  ) {

    fields.push(
      "available = ?"
    );

    values.push(
      product.available
        ? 1
        : 0
    );
  }


  /**
   * ----------------------------------------------------------
   * CATEGORY
   * ----------------------------------------------------------
   */
  if (
    product.categoryId !== undefined
  ) {

    fields.push(
      "category_id = ?"
    );

    values.push(
      product.categoryId
    );
  }


  /**
   * ----------------------------------------------------------
   * VENDOR
   * ----------------------------------------------------------
   */
  if (
    product.vendor !== undefined
  ) {

    fields.push(
      "vendor = ?"
    );

    values.push(
      product.vendor
    );
  }


  /**
   * ----------------------------------------------------------
   * COUNTRY
   * ----------------------------------------------------------
   */
  if (
    product.countryOfOrigin !== undefined
  ) {

    fields.push(
      "country_of_origin = ?"
    );

    values.push(
      product.countryOfOrigin
    );
  }


  /**
   * ----------------------------------------------------------
   * DESCRIPTION
   * ----------------------------------------------------------
   */
  if (
    product.description !== undefined
  ) {

    fields.push(
      "description = ?"
    );

    values.push(
      product.description
    );
  }


  /**
   * ----------------------------------------------------------
   * SEO TITLE
   * ----------------------------------------------------------
   */
  if (
    product.seoTitle !== undefined
  ) {

    fields.push(
      "seo_title = ?"
    );

    values.push(
      product.seoTitle
    );
  }


  /**
   * ----------------------------------------------------------
   * SEO DESCRIPTION
   * ----------------------------------------------------------
   */
  if (
    product.seoDescription !== undefined
  ) {

    fields.push(
      "seo_description = ?"
    );

    values.push(
      product.seoDescription
    );
  }


  /**
   * ----------------------------------------------------------
   * CONFIG
   * ----------------------------------------------------------
   */
  if (
    product.config !== undefined
  ) {

    fields.push(
      "config = ?"
    );

    values.push(
      product.config
        ? JSON.stringify(
            product.config
          )
        : null
    );
  }


  /**
   * ----------------------------------------------------------
   * CONTENT STATUS
   * ----------------------------------------------------------
   */
  if (
    product.contentStatus !== undefined
  ) {

    fields.push(
      "content_status = ?"
    );

    values.push(
      product.contentStatus
    );
  }


  /**
   * ----------------------------------------------------------
   * CONTENT ERROR
   * ----------------------------------------------------------
   */
  if (
    product.contentError !== undefined
  ) {

    fields.push(
      "content_error = ?"
    );

    values.push(
      product.contentError
    );
  }


  /**
   * ----------------------------------------------------------
   * CONTENT GENERATED AT
   * ----------------------------------------------------------
   */
  if (
    product.contentGeneratedAt !== undefined
  ) {

    fields.push(
      "content_generated_at = ?"
    );

    values.push(
      product.contentGeneratedAt
    );
  }


  /**
   * Нічого оновлювати.
   */
  if (
    fields.length === 0
  ) {

    return null;
  }


  const [result] = await db.query(
    `
    UPDATE products
    SET ${fields.join(", ")}
    WHERE id = ?
    `,
    [
      ...values,

      id,
    ]
  );


  return result;
}