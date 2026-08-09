import { db } from "./connection";


export interface Category {
  id: number;
  source: string;
  source_category_id: string;
  name: string;
  parent_id: number | null;
  created_at: Date;
  updated_at: Date;
}


/**
 * Пошук категорії по джерелу та ID постачальника
 */
export async function getCategoryBySourceId(
  source: string,
  sourceCategoryId: string
) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM categories
    WHERE source = ?
    AND source_category_id = ?
    LIMIT 1
    `,
    [
      source,
      sourceCategoryId,
    ]
  );

  const categories = rows as Category[];

  return categories[0] ?? null;
}


/**
 * Створення нової категорії
 */
export async function createCategory(data: {
  source: string;
  sourceCategoryId: string;
  name: string;
  parentId?: number | null;
}) {
  const [result] = await db.query(
    `
    INSERT INTO categories
    (
      source,
      source_category_id,
      name,
      parent_id
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      data.source,
      data.sourceCategoryId,
      data.name,
      data.parentId ?? null,
    ]
  );


  const insertResult = result as {
    insertId: number;
  };


  return insertResult.insertId;
}


/**
 * Оновлення категорії
 */
export async function updateCategory(
  id: number,
  data: {
    name?: string;
    parentId?: number | null;
  }
) {
  const fields: string[] = [];
  const values: unknown[] = [];


  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }


  if (data.parentId !== undefined) {
    fields.push("parent_id = ?");
    values.push(data.parentId);
  }


  if (fields.length === 0) {
    return null;
  }


  const [result] = await db.query(
    `
    UPDATE categories
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
 * Отримати або створити категорію
 * Основна функція для імпортера
 */
export async function getOrCreateCategory(data: {
  source: string;
  sourceCategoryId: string;
  name: string;
  parentId?: number | null;
}) {

  const existing = await getCategoryBySourceId(
    data.source,
    data.sourceCategoryId
  );


  if (existing) {

    if (
      existing.name !== data.name ||
      existing.parent_id !== (data.parentId ?? null)
    ) {
      await updateCategory(
        existing.id,
        {
          name: data.name,
          parentId: data.parentId ?? null,
        }
      );
    }


    return existing.id;
  }


  return await createCategory(data);
}