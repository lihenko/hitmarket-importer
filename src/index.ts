import { db } from "./database/connection";
import { getProductBySourceOffer } from "./database/products";

async function main() {
  try {
    const product = await getProductBySourceOffer(
      "test",
      "123"
    );

    console.log("Product:");
    console.log(product);

  } catch (error) {
    console.error(error);

  } finally {
    await db.end();
  }
}

main();