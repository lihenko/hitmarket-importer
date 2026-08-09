import { db } from "./connection";

export interface Product {
  id: number;

  // Source identification
  source: string;
  source_offer_id: string;
  vendor_code: string | null;

  // Basic product data
  name: string;
  name_ua: string | null;
  slug: string;

  // Price / availability
  price: number;
  old_price: number | null;
  available: boolean;

  // Supplier information
  category_id: number | null;
  vendor: string | null;
  country_of_origin: string | null;

  // Original supplier content
  description: string | null;
  description_ua: string | null;

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


export async function getProductsCount() {
  const [rows] = await db.query(
    "SELECT COUNT(*) as count FROM products"
  );

  return rows;
}


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
    [source, sourceOfferId]
  );

  const products = rows as Product[];

  return products[0] ?? null;
}


export async function createProduct(product: {
  source: string;
  sourceOfferId: string;
  vendorCode?: string | null;

  name: string;
  nameUa?: string | null;
  slug: string;

  price: number;
  oldPrice?: number | null;

  available?: boolean;

  vendor?: string | null;
  countryOfOrigin?: string | null;

  description?: string | null;
  descriptionUa?: string | null;

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
      name_ua,
      slug,

      price,
      old_price,
      available,

      vendor,
      country_of_origin,

      description,
      description_ua,

      seo_title,
      seo_description,

      config
    )
    VALUES
    (?, ?, ?,
     ?, ?, ?,
     ?, ?, ?,
     ?, ?,
     ?, ?,
     ?, ?,
     ?)
    `,
    [
      product.source,
      product.sourceOfferId,
      product.vendorCode ?? null,

      product.name,
      product.nameUa ?? null,
      product.slug,

      product.price,
      product.oldPrice ?? null,
      product.available ? 1 : 0,

      product.vendor ?? null,
      product.countryOfOrigin ?? null,

      product.description ?? null,
      product.descriptionUa ?? null,

      product.seoTitle ?? null,
      product.seoDescription ?? null,

      product.config
        ? JSON.stringify(product.config)
        : null,
    ]
  );

  return result;
}

export async function updateProduct(
  id: number,
  product: {
    name?: string;
    nameUa?: string | null;
    slug?: string;

    price?: number;
    oldPrice?: number | null;
    available?: boolean;

    vendor?: string | null;
    countryOfOrigin?: string | null;

    description?: string | null;
    descriptionUa?: string | null;

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

  if (product.name !== undefined) {
    fields.push("name = ?");
    values.push(product.name);
  }

  if (product.nameUa !== undefined) {
    fields.push("name_ua = ?");
    values.push(product.nameUa);
  }

  if (product.slug !== undefined) {
    fields.push("slug = ?");
    values.push(product.slug);
  }

  if (product.price !== undefined) {
    fields.push("price = ?");
    values.push(product.price);
  }

  if (product.oldPrice !== undefined) {
    fields.push("old_price = ?");
    values.push(product.oldPrice);
  }

  if (product.available !== undefined) {
    fields.push("available = ?");
    values.push(product.available ? 1 : 0);
  }

  if (product.vendor !== undefined) {
    fields.push("vendor = ?");
    values.push(product.vendor);
  }

  if (product.countryOfOrigin !== undefined) {
    fields.push("country_of_origin = ?");
    values.push(product.countryOfOrigin);
  }

  if (product.description !== undefined) {
    fields.push("description = ?");
    values.push(product.description);
  }

  if (product.descriptionUa !== undefined) {
    fields.push("description_ua = ?");
    values.push(product.descriptionUa);
  }

  if (product.seoTitle !== undefined) {
    fields.push("seo_title = ?");
    values.push(product.seoTitle);
  }

  if (product.seoDescription !== undefined) {
    fields.push("seo_description = ?");
    values.push(product.seoDescription);
  }

  if (product.config !== undefined) {
    fields.push("config = ?");
    values.push(
      product.config
        ? JSON.stringify(product.config)
        : null
    );
  }

  if (product.contentStatus !== undefined) {
    fields.push("content_status = ?");
    values.push(product.contentStatus);
  }

  if (product.contentError !== undefined) {
    fields.push("content_error = ?");
    values.push(product.contentError);
  }

  if (product.contentGeneratedAt !== undefined) {
    fields.push("content_generated_at = ?");
    values.push(product.contentGeneratedAt);
  }


  if (fields.length === 0) {
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