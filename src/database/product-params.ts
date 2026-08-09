import { db } from "./connection";


export interface ProductParam {
  id: number;

  product_id: number;

  name: string;
  value: string | null;
  unit: string | null;

  created_at: Date;
}


/**
 * Отримати всі характеристики товару
 */
export async function getProductParams(
  productId: number
) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM product_params
    WHERE product_id = ?
    ORDER BY id ASC
    `,
    [
      productId,
    ]
  );

  return rows as ProductParam[];
}


/**
 * Знайти характеристику
 */
export async function getProductParam(
  productId: number,
  name: string
) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM product_params
    WHERE product_id = ?
    AND name = ?
    LIMIT 1
    `,
    [
      productId,
      name,
    ]
  );


  const params = rows as ProductParam[];

  return params[0] ?? null;
}


/**
 * Створити характеристику
 */
export async function createProductParam(data: {
  productId: number;

  name: string;

  value?: string | null;

  unit?: string | null;
}) {

  const [result] = await db.query(
    `
    INSERT INTO product_params
    (
      product_id,
      name,
      value,
      unit
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      data.productId,
      data.name,
      data.value ?? null,
      data.unit ?? null,
    ]
  );


  const insertResult = result as {
    insertId: number;
  };


  return insertResult.insertId;
}


/**
 * Оновити характеристику
 */
export async function updateProductParam(
  id: number,
  data: {
    value?: string | null;

    unit?: string | null;
  }
) {

  const fields: string[] = [];
  const values: unknown[] = [];


  if (data.value !== undefined) {
    fields.push("value = ?");
    values.push(data.value);
  }


  if (data.unit !== undefined) {
    fields.push("unit = ?");
    values.push(data.unit);
  }


  if (fields.length === 0) {
    return null;
  }


  const [result] = await db.query(
    `
    UPDATE product_params
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
 * Основна функція імпортера:
 * знайти або створити характеристику
 */
export async function getOrCreateProductParam(data: {
  productId: number;

  name: string;

  value?: string | null;

  unit?: string | null;
}) {

  const existing = await getProductParam(
    data.productId,
    data.name
  );


  if (existing) {

    await updateProductParam(
      existing.id,
      {
        value: data.value,
        unit: data.unit,
      }
    );


    return existing.id;
  }


  return await createProductParam(data);
}


/**
 * Масове збереження характеристик
 * з фіда
 */
export async function syncProductParams(
  productId: number,
  params: Array<{
    name: string;
    value?: string | null;
    unit?: string | null;
  }>
) {

  const ids: number[] = [];


  for (const param of params) {

    const id = await getOrCreateProductParam({
      productId,
      name: param.name,
      value: param.value,
      unit: param.unit,
    });


    ids.push(id);
  }


  return ids;
}