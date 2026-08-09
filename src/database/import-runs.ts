import { db } from "./connection";


export async function startImportRun(source: string) {
  const [result] = await db.query(
    `
    INSERT INTO import_runs
    (
      source,
      status
    )
    VALUES (?, 'running')
    `,
    [source]
  );

  const insertResult = result as {
    insertId: number;
  };

  return insertResult.insertId;
}


export async function finishImportRun(
  id: number,
  data: {
    totalOffers?: number;
    newProducts?: number;
    updatedProducts?: number;
    priceUpdates?: number;
    stockUpdates?: number;
    unavailableProducts?: number;
    availableProducts?: number;
    contentUpdates?: number;
    imageUpdates?: number;
    skippedProducts?: number;
    errors?: number;
    status?: "completed" | "failed";
    errorLog?: string | null;
  }
) {
  const [result] = await db.query(
    `
    UPDATE import_runs
    SET
      finished_at = NOW(),
      total_offers = ?,
      new_products = ?,
      updated_products = ?,
      price_updates = ?,
      stock_updates = ?,
      unavailable_products = ?,
      available_products = ?,
      content_updates = ?,
      image_updates = ?,
      skipped_products = ?,
      errors = ?,
      status = ?,
      error_log = ?
    WHERE id = ?
    `,
    [
      data.totalOffers ?? 0,
      data.newProducts ?? 0,
      data.updatedProducts ?? 0,
      data.priceUpdates ?? 0,
      data.stockUpdates ?? 0,
      data.unavailableProducts ?? 0,
      data.availableProducts ?? 0,
      data.contentUpdates ?? 0,
      data.imageUpdates ?? 0,
      data.skippedProducts ?? 0,
      data.errors ?? 0,
      data.status ?? "completed",
      data.errorLog ?? null,
      id,
    ]
  );

  return result;
}