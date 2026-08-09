import { db } from "./database/connection";
import { importProduct } from "./importer/import-product";


async function main() {

  const result =
    await importProduct({

        available: false,

      source: "test",

      sourceOfferId: "turka-001",

      name: "Електрична турка RAF R.125",

      price: 500,

      oldPrice: 900,

      vendor: "RAF",

      description:
        "Електрична турка для кави.",

      category: {
        id: "100",
        name: "Електроніка",
      },

      images: [
        "https://example.com/turka-main.jpg",
      ],

      params: [
        {
          name: "Потужність",
          value: "650",
          unit: "Вт",
        },
      ],

    });


  console.log(result);


  await db.end();

}


main();