import { saveProductImage } from "./importer/save-product-image";

async function main() {
  const path = await saveProductImage(
    "https://images.prom.ua/7609809794_shvejnaya-mini-mashinka-handy.jpg",
    "test-product-0"
  );

  console.log("Saved:", path);
}

main().catch(console.error);