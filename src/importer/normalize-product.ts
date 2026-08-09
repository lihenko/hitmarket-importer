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

  name: string;

  nameUa: string | null;

  slug: string;

  price: number;

  oldPrice: number | null;

  available: boolean;

  vendor: string | null;

  description: string | null;

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


export function normalizeProduct(
  product: SupplierProduct
): NormalizedProduct {

  /**
   * Визначаємо наявність.
   *
   * Якщо quantity переданий —
   * використовуємо його.
   *
   * Якщо quantity немає —
   * використовуємо available.
   *
   * Якщо немає ні quantity,
   * ні available — вважаємо товар доступним.
   */
  const available =
    product.quantity !== undefined
      ? product.quantity > 0
      : product.available ?? true;


  /**
   * Повертаємо нормалізований товар.
   */
  return {

    source:
      product.source,


    sourceOfferId:
      product.sourceOfferId,


    /**
     * Оригінальна назва постачальника.
     */
    name:
      product.name,


    /**
     * Українська назва з фіда.
     *
     * Використовуватимемо її як джерело
     * для AI-рерайту.
     */
    nameUa:
      product.nameUa ?? null,


    /**
     * Slug створюємо з оригінальної назви.
     *
     * Поки що не використовуємо AI
     * для slug.
     */
    slug:
      product.name
        .toLowerCase()
        .replace(/\s+/g, "-"),


    /**
     * Наша ціна:
     * ціна постачальника + 20%.
     */
    price:
      Math.ceil(
        product.price * 1.2
      ),


    /**
     * Стара ціна:
     * також +20%.
     */
    oldPrice:
      product.oldPrice
        ? Math.ceil(
            product.oldPrice * 1.2
          )
        : null,


    /**
     * Наявність.
     */
    available,


    /**
     * Постачальник.
     */
    vendor:
      product.vendor ?? null,


    /**
     * Оригінальний опис.
     */
    description:
      product.description ?? null,


    /**
     * Український опис з фіда.
     *
     * Саме його будемо передавати
     * в OpenAI для рерайту,
     * якщо він доступний.
     */
    descriptionUa:
      product.descriptionUa ?? null,


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
    params:
      product.params?.map(
        item => ({

          name:
            item.name,

          value:
            item.value,

          unit:
            item.unit ?? null,

        })
      ) ?? [],

  };

}