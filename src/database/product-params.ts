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
 * Знайти характеристику товару
 * за українською назвою.
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

  const params =
    rows as ProductParam[];

  return params[0] ?? null;
}


/**
 * Створити характеристику
 */
export async function createProductParam(
  data: {
    productId: number;

    name: string;

    value?: string | null;

    unit?: string | null;
  }
) {

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

  const insertResult =
    result as {
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
    name?: string;

    value?: string | null;

    unit?: string | null;
  }
) {

  const fields: string[] = [];
  const values: unknown[] = [];


  if (data.name !== undefined) {

    fields.push(
      "name = ?"
    );

    values.push(
      data.name
    );
  }


  if (data.value !== undefined) {

    fields.push(
      "value = ?"
    );

    values.push(
      data.value
    );
  }


  if (data.unit !== undefined) {

    fields.push(
      "unit = ?"
    );

    values.push(
      data.unit
    );
  }


  if (fields.length === 0) {

    return null;
  }


  const [result] =
    await db.query(
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
 * Створити або оновити характеристику.
 *
 * ВАЖЛИВО:
 * name вже повинен бути українським.
 */
export async function getOrCreateProductParam(
  data: {
    productId: number;

    name: string;

    value?: string | null;

    unit?: string | null;
  }
) {

  const name =
    data.name.trim();

  if (!name) {

    throw new Error(
      "Product parameter name cannot be empty"
    );
  }


  const existing =
    await getProductParam(
      data.productId,
      name
    );


  if (existing) {

    await updateProductParam(
      existing.id,
      {
        value:
          data.value,

        unit:
          data.unit,
      }
    );


    return existing.id;
  }


  return await createProductParam({
    productId:
      data.productId,

    name,

    value:
      data.value,

    unit:
      data.unit,
  });
}


/**
 * Масове збереження українських
 * характеристик товару.
 *
 * Ця функція НЕ перекладає параметри.
 *
 * Вона очікує, що AI вже повернув:
 *
 * name  → українською
 * value → українською, якщо це текстове значення
 * unit  → українською
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

    if (!param.name?.trim()) {

      continue;
    }


    const id =
      await getOrCreateProductParam({

        productId,

        name:
          param.name.trim(),

        value:
          param.value?.trim() ||
          null,

        unit:
          param.unit?.trim() ||
          null,
      });


    ids.push(id);
  }


  return ids;
}