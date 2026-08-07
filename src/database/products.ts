import { db } from "./connection";

export interface Product {
  id: number;
  source: string;
  source_offer_id: string;
  vendor_code: string | null;
  name: string;
  slug: string;
  price: number;
  available: boolean;
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