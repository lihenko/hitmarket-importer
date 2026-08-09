export interface SupplierProduct {

  source: string;

  sourceOfferId: string;

  name: string;

  price: number;

  oldPrice?: number | null;

  available?: boolean;

  quantity?: number;


  vendor?: string | null;

  description?: string | null;


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

  slug: string;

  price: number;

  oldPrice: number | null;

  available: boolean;

  vendor: string | null;

  description: string | null;


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


  const available =
    product.quantity !== undefined
      ? product.quantity > 0
      : product.available ?? true;


  return {

    source:
      product.source,


    sourceOfferId:
      product.sourceOfferId,


    name:
      product.name,


    slug:
      product.name
        .toLowerCase()
        .replace(/\s+/g, "-"),


    price:
      Math.ceil(product.price * 1.2),


    oldPrice:
      product.oldPrice
        ? Math.ceil(product.oldPrice * 1.2)
        : null,


    available,


    vendor:
      product.vendor ?? null,


    description:
      product.description ?? null,


    category:
      product.category ?? null,


    images:
      product.images ?? [],


    params:
      product.params?.map(item => ({
        name: item.name,
        value: item.value,
        unit: item.unit ?? null,
      })) ?? [],

  };

}