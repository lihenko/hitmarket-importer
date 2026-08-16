import {
  NormalizedProduct,
} from "./normalize-product";

import {
  RewrittenProduct,
} from "../ai/rewrite-product";


/**
 * ============================================================
 * GENERATE PRODUCT CONFIG
 * ============================================================
 *
 * ВАЖЛИВО:
 *
 * Цей файл НЕ викликає OpenAI.
 *
 * OpenAI вже відпрацював у:
 *
 * rewriteProduct()
 *
 * Тут ми тільки беремо готовий AI-контент
 * і формуємо config для збереження в БД.
 *
 * ЖОДНОЇ повторної генерації.
 */


/**
 * ============================================================
 * TYPES
 * ============================================================
 */

export interface ProductConfig {

  hero: {

    badgeText: string;

    title: string;

    description: string;

  };


  features: {

    eyebrow: string;

    title: string;

    items: {

      icon: string;

      title: string;

      text: string;

      large: boolean;

    }[];

  };


  compact: {

    eyebrow?: string;

    title: string;

    description: string;

    bullets?: string[];

  };


  ports: {

    eyebrow?: string;

    title: string;

    description: string;

    bullets?: string[];

  };


  package: {

    eyebrow?: string;

    title: string;

    description: string;

    items: string[];

  };


  specifications: {

    title: string;

    items: {

      name: string;

      value: string;

    }[];

  };


  faq: {

    question: string;

    answer: string;

  }[];


  reviews: {

    name: string;

    city: string;

    rating: number;

    date: string;

    text: string;

  }[];

}


/**
 * ============================================================
 * GENERATE CONFIG
 * ============================================================
 */

export function generateProductConfig(
  product: NormalizedProduct,
  rewritten: RewrittenProduct
): ProductConfig {

  /**
   * ----------------------------------------------------------
   * PRODUCT
   * ----------------------------------------------------------
   *
   * product використовується для даних,
   * які не генеруються AI.
   *
   * rewritten використовується для всього
   * AI-контенту.
   */


  return {

    /**
     * ========================================================
     * HERO
     * ========================================================
     */

    hero: {

      badgeText:
        rewritten.badgeText,

      title:
        rewritten.nameUa,

      description:
        rewritten.heroDescription,

    },


    /**
     * ========================================================
     * FEATURES
     * ========================================================
     */

    features: {

      eyebrow:
        rewritten.features.eyebrow,

      title:
        rewritten.features.title,

      items:
        rewritten.features.items.map(
          item => ({

            icon:
              item.icon,

            title:
              item.title,

            text:
              item.text,

            large:
              item.large,

          })
        ),

    },


    /**
     * ========================================================
     * COMPACT
     * ========================================================
     */

    compact: {

      eyebrow:
        rewritten.compact.eyebrow,

      title:
        rewritten.compact.title,

      description:
        rewritten.compact.description,

      bullets:
        rewritten.compact.bullets,

    },


    /**
     * ========================================================
     * PORTS
     * ========================================================
     *
     * Назва "ports" залишена тому,
     * що це назва секції у конфігурації магазину.
     *
     * Це НЕ означає, що товар має порти.
     */

    ports: {

      eyebrow:
        rewritten.ports.eyebrow,

      title:
        rewritten.ports.title,

      description:
        rewritten.ports.description,

      bullets:
        rewritten.ports.bullets,

    },


    /**
     * ========================================================
     * PACKAGE
     * ========================================================
     */

    package: {

      eyebrow:
        rewritten.package.eyebrow,

      title:
        rewritten.package.title,

      description:
        rewritten.package.description,

      items:
        rewritten.package.items,

    },


    /**
     * ========================================================
     * SPECIFICATIONS
     * ========================================================
     */

    specifications: {

      title:
        rewritten.specifications.title,

      items:
        rewritten.specifications.items.map(
          item => ({

            name:
              item.name,

            value:
              item.value,

          })
        ),

    },


    /**
     * ========================================================
     * FAQ
     * ========================================================
     */

    faq:
      rewritten.faq.map(
        item => ({

          question:
            item.question,

          answer:
            item.answer,

        })
      ),


    /**
     * ========================================================
     * REVIEWS
     * ========================================================
     */

    reviews:
      rewritten.reviews.map(
        review => ({

          name:
            review.name,

          city:
            review.city,

          rating:
            review.rating,

          date:
            review.date,

          text:
            review.text,

        })
      ),

  };

}