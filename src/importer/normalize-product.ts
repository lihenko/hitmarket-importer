export interface SupplierProduct {

  source: string;

  sourceOfferId: string;

  name: string;

  nameUa?: string | null;

  price: number;

  oldPrice?: number | null;

  available?: boolean;

  quantity?: number;

  vendor?: string | null;

  description?: string | null;

  descriptionUa?: string | null;

  category?: {
    id: string;
    name: string;
  };

  images?: string[];

  params?: Array<{
    name: string;
    value: string;
    unit?: string | null;
  }>;

}


export interface NormalizedProduct {

  source: string;

  sourceOfferId: string;

  /**
   * Оригінальна назва товару
   * з фіда постачальника.
   */
  name: string;

  /**
   * Українська назва товару
   * з фіда постачальника.
   *
   * Використовується як основа
   * для AI-рерайту.
   */
  nameUa: string | null;

  price: number;

  oldPrice: number | null;

  available: boolean;

  vendor: string | null;

  /**
   * Оригінальний опис постачальника.
   */
  description: string | null;

  /**
   * Український опис з фіда.
   *
   * Використовується як основа
   * для AI-рерайту.
   */
  descriptionUa: string | null;

  category: {
    id: string;
    name: string;
  } | null;

  images: string[];

  params: Array<{
    name: string;
    value: string;
    unit: string | null;
  }>;

}


/**
 * Нормалізує значення наявності товару.
 *
 * Пріоритет:
 *
 * 1. quantity
 * 2. available
 * 3. true, якщо обидва значення відсутні
 */
function normalizeAvailable(
  product: SupplierProduct
): boolean {

  if (
    product.quantity !== undefined
  ) {

    return product.quantity > 0;

  }

  return product.available ?? true;
}


/**
 * Нормалізація товару.
 *
 * Тут НЕ створюємо slug.
 *
 * Slug буде створений пізніше,
 * після AI-рерайту, на основі
 * фінальної української назви.
 */
export function normalizeProduct(
  product: SupplierProduct
): NormalizedProduct {

  /**
   * ----------------------------------------------------------
   * Наявність
   * ----------------------------------------------------------
   */

  const available =
    normalizeAvailable(
      product
    );


  /**
   * ----------------------------------------------------------
   * Українська назва
   * ----------------------------------------------------------
   */

  const nameUa =
    product.nameUa?.trim() ||
    null;


  /**
   * ----------------------------------------------------------
   * Ціна
   *
   * Ціна постачальника +20%.
   * Округлення в більшу сторону.
   * ----------------------------------------------------------
   */

  const price =
    Math.ceil(
      product.price * 1.2
    );


  /**
   * ----------------------------------------------------------
   * Стара ціна
   *
   * Якщо oldPrice відсутня —
   * записуємо null.
   * ----------------------------------------------------------
   */

  const oldPrice =
    product.oldPrice !== undefined &&
    product.oldPrice !== null
      ? Math.ceil(
          product.oldPrice * 1.2
        )
      : null;


  /**
   * ----------------------------------------------------------
   * Оригінальний опис
   * ----------------------------------------------------------
   */

  const description =
    product.description?.trim() ||
    null;


  /**
   * ----------------------------------------------------------
   * Український опис
   * ----------------------------------------------------------
   */

  const descriptionUa =
    product.descriptionUa?.trim() ||
    null;


  /**
   * ----------------------------------------------------------
   * Характеристики
   * ----------------------------------------------------------
   */

  const params =
    product.params?.map(
      item => ({

        name:
          item.name,

        value:
          item.value,

        unit:
          item.unit?.trim() ||
          null,

      })
    ) ?? [];


  /**
   * ----------------------------------------------------------
   * Результат нормалізації
   * ----------------------------------------------------------
   */

  return {

    source:
      product.source,

    sourceOfferId:
      product.sourceOfferId,

    /**
     * Оригінальна назва.
     */
    name:
      product.name,

    /**
     * Українська назва з фіда.
     */
    nameUa,

    /**
     * Нормалізована ціна.
     */
    price,

    /**
     * Нормалізована стара ціна.
     */
    oldPrice,

    /**
     * Нормалізована наявність.
     */
    available,

    /**
     * Постачальник.
     */
    vendor:
      product.vendor?.trim() ||
      null,

    /**
     * Оригінальний опис.
     */
    description,

    /**
     * Український опис з фіда.
     */
    descriptionUa,

    /**
     * Категорія.
     */
    category:
      product.category ?? null,

    /**
     * Зображення.
     */
    images:
      product.images ?? [],

    /**
     * Характеристики.
     */
    params,

  };

}