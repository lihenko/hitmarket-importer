import { db } from "./connection";
import { translateCategoryName } from "../ai/translate-category";


export interface Category {
  id: number;

  source: string;

  source_category_id: string;

  /**
   * Фінальна назва категорії.
   *
   * У БД зберігається тільки українська назва.
   */
  name: string;

  parent_id: number | null;

  created_at: Date;

  updated_at: Date;
}


/**
 * ============================================================
 * GET CATEGORY BY SOURCE ID
 * ============================================================
 *
 * Шукаємо категорію по:
 *
 * source
 * +
 * source_category_id
 *
 * Це дозволяє однозначно визначити категорію постачальника.
 */
export async function getCategoryBySourceId(
  source: string,
  sourceCategoryId: string
): Promise<Category | null> {

  const [rows] = await db.query(
    `
    SELECT
      id,
      source,
      source_category_id,
      name,
      parent_id,
      created_at,
      updated_at
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


  const categories =
    rows as Category[];


  return categories[0] ?? null;
}


/**
 * ============================================================
 * CREATE CATEGORY
 * ============================================================
 *
 * Створює категорію.
 *
 * ВАЖЛИВО:
 *
 * name сюди вже повинен приходити українською.
 *
 * Переклад виконується в getOrCreateCategory()
 * перед викликом цієї функції.
 */
export async function createCategory(data: {
  source: string;

  sourceCategoryId: string;

  name: string;

  parentId?: number | null;
}): Promise<number> {

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


  const insertResult =
    result as {
      insertId: number;
    };


  return insertResult.insertId;
}


/**
 * ============================================================
 * UPDATE CATEGORY
 * ============================================================
 *
 * Оновлює існуючу категорію.
 *
 * Ця функція НЕ викликає AI.
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


  /**
   * Назва категорії.
   *
   * Сюди повинна передаватися
   * тільки українська назва.
   */
  if (data.name !== undefined) {

    fields.push(
      "name = ?"
    );

    values.push(
      data.name
    );
  }


  /**
   * Батьківська категорія.
   */
  if (data.parentId !== undefined) {

    fields.push(
      "parent_id = ?"
    );

    values.push(
      data.parentId
    );
  }


  /**
   * Немає що оновлювати.
   */
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
 * ============================================================
 * GET OR CREATE CATEGORY
 * ============================================================
 *
 * Основна функція для імпортера.
 *
 *
 * ЛОГІКА:
 *
 * 1. Шукаємо категорію по source + sourceCategoryId.
 *
 * 2. Якщо категорія вже існує:
 *
 *    - НЕ запускаємо AI;
 *    - НЕ змінюємо її назву;
 *    - повертаємо існуючий ID.
 *
 * 3. Якщо категорії немає:
 *
 *    - беремо оригінальну назву з фіда;
 *    - передаємо її в AI;
 *    - отримуємо українську назву;
 *    - створюємо категорію;
 *    - повертаємо її ID.
 *
 *
 * Таким чином одна категорія не перекладається
 * через OpenAI повторно для кожного товару.
 */
export async function getOrCreateCategory(data: {
  source: string;

  sourceCategoryId: string;

  /**
   * Оригінальна назва категорії з фіда.
   *
   * Вона може бути російською.
   */
  name: string;

  parentId?: number | null;
}): Promise<number> {


  /**
   * ----------------------------------------------------------
   * 1. ШУКАЄМО ІСНУЮЧУ КАТЕГОРІЮ
   * ----------------------------------------------------------
   */

  const existing =
    await getCategoryBySourceId(
      data.source,
      data.sourceCategoryId
    );


  /**
   * ----------------------------------------------------------
   * 2. КАТЕГОРІЯ ВЖЕ Є
   * ----------------------------------------------------------
   *
   * AI тут НЕ запускаємо.
   *
   * Також не перезаписуємо name значенням
   * з фіда, оскільки воно може бути російським.
   */
  if (existing) {

    return existing.id;
  }


  /**
   * ----------------------------------------------------------
   * 3. НОВА КАТЕГОРІЯ
   * ----------------------------------------------------------
   */

  if (!data.name.trim()) {

    throw new Error(
      `Cannot create category ${data.sourceCategoryId}: empty category name`
    );
  }


  /**
   * ----------------------------------------------------------
   * 4. ПЕРЕКЛАД КАТЕГОРІЇ
   * ----------------------------------------------------------
   *
   * Наприклад:
   *
   * "Электротовары"
   *
   * →
   *
   * "Електротовари"
   */
  console.log(
    `📂 New category: "${data.name}"`
  );


  const translatedName =
    await translateCategoryName(
      data.name
    );


  /**
   * Перевіряємо, що AI реально щось повернув.
   */
  if (!translatedName.trim()) {

    throw new Error(
      `AI returned empty translated category for "${data.name}"`
    );
  }


  console.log(
    `🇺🇦 Category: "${data.name}" → "${translatedName}"`
  );


  /**
   * ----------------------------------------------------------
   * 5. СТВОРЮЄМО КАТЕГОРІЮ
   * ----------------------------------------------------------
   */

  const categoryId =
    await createCategory({

      source:
        data.source,

      sourceCategoryId:
        data.sourceCategoryId,

      name:
        translatedName.trim(),

      parentId:
        data.parentId ?? null,

    });


  /**
   * ----------------------------------------------------------
   * 6. ПОВЕРТАЄМО ID
   * ----------------------------------------------------------
   */

  return categoryId;
}