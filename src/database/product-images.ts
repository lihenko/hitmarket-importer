import { db } from "./connection";


export interface ProductImage {
  id: number;

  product_id: number;

  source_url: string;
  local_path: string | null;

  source_hash: string | null;

  sort_order: number;

  created_at: Date;
  updated_at: Date;
}


/**
 * Отримати всі картинки товару
 */
export async function getProductImages(
  productId: number
) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM product_images
    WHERE product_id = ?
    ORDER BY sort_order ASC
    `,
    [
      productId,
    ]
  );

  return rows as ProductImage[];
}


/**
 * Знайти картинку по URL джерела
 */
export async function getImageBySourceUrl(
  productId: number,
  sourceUrl: string
) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM product_images
    WHERE product_id = ?
    AND source_url = ?
    LIMIT 1
    `,
    [
      productId,
      sourceUrl,
    ]
  );

  const images = rows as ProductImage[];

  return images[0] ?? null;
}


/**
 * Додати нову картинку
 */
export async function createProductImage(data: {
  productId: number;

  sourceUrl: string;

  localPath?: string | null;

  sourceHash?: string | null;

  sortOrder?: number;
}) {

  const [result] = await db.query(
    `
    INSERT INTO product_images
    (
      product_id,
      source_url,
      local_path,
      source_hash,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      data.productId,
      data.sourceUrl,
      data.localPath ?? null,
      data.sourceHash ?? null,
      data.sortOrder ?? 0,
    ]
  );


  const insertResult = result as {
    insertId: number;
  };


  return insertResult.insertId;
}


/**
 * Оновити картинку
 */
export async function updateProductImage(
  id: number,
  data: {
    localPath?: string | null;

    sourceHash?: string | null;

    sortOrder?: number;
  }
) {

  const fields: string[] = [];
  const values: unknown[] = [];


  if (data.localPath !== undefined) {
    fields.push("local_path = ?");
    values.push(data.localPath);
  }


  if (data.sourceHash !== undefined) {
    fields.push("source_hash = ?");
    values.push(data.sourceHash);
  }


  if (data.sortOrder !== undefined) {
    fields.push("sort_order = ?");
    values.push(data.sortOrder);
  }


  if (fields.length === 0) {
    return null;
  }


  const [result] = await db.query(
    `
    UPDATE product_images
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


/**
 * Основна функція для імпортера:
 * знайти картинку або створити
 */
export async function getOrCreateProductImage(data: {
  productId: number;

  sourceUrl: string;

  localPath?: string | null;

  sourceHash?: string | null;

  sortOrder?: number;
}) {

  const existing = await getImageBySourceUrl(
    data.productId,
    data.sourceUrl
  );


  if (existing) {

    await updateProductImage(
      existing.id,
      {
        localPath: data.localPath,
        sourceHash: data.sourceHash,
        sortOrder: data.sortOrder,
      }
    );


    return existing.id;
  }


  return await createProductImage(data);
}