import { NormalizedProduct } from "./normalize-product";


export function generateProductConfig(
  product: NormalizedProduct
) {


  return {

    hero: {

      badgeText:
        "⭐ Новинка в каталозі",


      title:
        product.name,


      description:
        product.description ??
        "Якісний товар для щоденного використання.",

    },


    features: {

      eyebrow:
        "Основні переваги",


      title:
        "Чому варто обрати цей товар",


      items:
        product.params
          .slice(0, 4)
          .map(param => ({

            title:
              `${param.name} ${param.unit ?? ""}`,

            text:
              param.value,

            large:
              true,

          }))

    },


    specifications: {

      title:
        "Характеристики",


      items:
        product.params.map(param => ({

          name:
            param.name,


          value:
            `${param.value}${param.unit ? " " + param.unit : ""}`

        }))

    },


    package: {

      title:
        "Комплектація",


      items: [
        product.name,
        "Фірмова упаковка",
      ]

    },


    seo: {

      title:
        `${product.name} купити`,


      description:
        `Купити ${product.name}. Швидка доставка та гарантія якості.`

    }

  };

}