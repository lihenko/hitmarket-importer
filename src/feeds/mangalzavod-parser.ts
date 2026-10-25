import { readFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

import type {
  SupplierProduct,
} from "./yml-parser";


interface YmlOffer {
  "@_id": string;
  "@_available": string;

  url?: string;

  oldprice?:
    | string
    | number;

  price?:
    | string
    | number;

  currencyId?: string;

  categoryId?:
    | string
    | number;

  picture?:
    | string
    | string[];

  name?: string;

  vendor?: string;

  vendorCode?: string;

  country_of_origin?: string;

  description?: string;

  param?:
    | {
        "@_name": string;
        "@_unit"?: string;
        "#text"?:
          | string
          | number;
      }
    | Array<{
        "@_name": string;
        "@_unit"?: string;
        "#text"?:
          | string
          | number;
      }>;
}


interface YmlCategory {
  "@_id": string;

  "@_parentId"?:
    | string;

  "#text"?:
    | string;
}


interface YmlCatalog {
  yml_catalog?: {
    shop?: {
      categories?: {
        category?:
          | YmlCategory
          | YmlCategory[];
      };

      offers?: {
        offer?:
          | YmlOffer
          | YmlOffer[];
      };
    };
  };
}


/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function toArray<T>(
  value:
    | T
    | T[]
    | undefined
): T[] {

  if (value === undefined) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];

}


function textToString(
  value:
    | string
    | number
    | undefined
    | null
): string | null {

  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const result =
    String(value).trim();

  return result === ""
    ? null
    : result;

}


function toNumber(
  value:
    | string
    | number
    | undefined
    | null
): number | null {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    String(value)
      .replace(/\s/g, "")
      .replace(",", ".");

  const number =
    Number(normalized);

  return Number.isFinite(number)
    ? number
    : null;

}


function parseAvailable(
  value: string | undefined
): boolean {

  return value === "true";

}


/**
 * ============================================================
 * MANGALZAVOD PARSER
 * ============================================================
 */

export async function parseMangalzavodFile(
  filePath: string
): Promise<SupplierProduct[]> {

  const xml =
    await readFile(
      filePath,
      "utf8"
    );


  const parser =
    new XMLParser({

      ignoreAttributes:
        false,

      attributeNamePrefix:
        "@_",

      textNodeName:
        "#text",

      trimValues:
        true,

      parseTagValue:
        false,

      processEntities:
        true,

    });


  const data =
    parser.parse(xml) as YmlCatalog;


  const shop =
    data.yml_catalog?.shop;


  if (!shop) {

    throw new Error(
      "Mangalzavod YML: <shop> not found"
    );

  }


  /**
   * ==========================================================
   * CATEGORIES
   * ==========================================================
   */

  const categoryMap =
    new Map<string, string>();


  const categories =
    toArray(
      shop.categories?.category
    );


  for (
    const category
    of categories
  ) {

    const id =
      String(
        category["@_id"]
      );


    const name =
      textToString(
        category["#text"]
      );


    if (!name) {
      continue;
    }


    categoryMap.set(
      id,
      name
    );

  }


  /**
   * ==========================================================
   * OFFERS
   * ==========================================================
   */

  const offers =
    toArray(
      shop.offers?.offer
    );


  const products:
    SupplierProduct[] = [];


  for (
    const offer
    of offers
  ) {

    const sourceOfferId =
      String(
        offer["@_id"]
      );


    /**
     * --------------------------------------------------------
     * AVAILABLE
     * --------------------------------------------------------
     */

    const available =
      parseAvailable(
        offer["@_available"]
      );


    /**
     * --------------------------------------------------------
     * NAME
     *
     * У Mangalzavod назва вже українська.
     * --------------------------------------------------------
     */

    const name =
      textToString(
        offer.name
      );


    if (!name) {

      console.warn(
        `⚠️ Skipping ${sourceOfferId}: name is missing`
      );

      continue;

    }


    /**
     * --------------------------------------------------------
     * PRICE
     * --------------------------------------------------------
     */

    const price =
      toNumber(
        offer.price
      );


    if (price === null) {

      console.warn(
        `⚠️ Skipping ${sourceOfferId}: price is missing`
      );

      continue;

    }


    /**
     * --------------------------------------------------------
     * OLD PRICE
     * --------------------------------------------------------
     */

    const oldPrice =
      toNumber(
        offer.oldprice
      );


    /**
     * --------------------------------------------------------
     * CATEGORY
     * --------------------------------------------------------
     */

    const categoryId =
      offer.categoryId !== undefined
        ? String(
            offer.categoryId
          )
        : undefined;


    const categoryName =
      categoryId
        ? categoryMap.get(
            categoryId
          )
        : undefined;


    /**
     * --------------------------------------------------------
     * IMAGES
     * --------------------------------------------------------
     */

    const images =
      toArray(
        offer.picture
      )
        .map(String)
        .map(
          value =>
            value.trim()
        )
        .filter(Boolean);


    /**
     * --------------------------------------------------------
     * PARAMS
     * --------------------------------------------------------
     */

    const params =
      toArray(
        offer.param
      )
        .map(param => {

          const name =
            String(
              param["@_name"]
            ).trim();


          const value =
            textToString(
              param["#text"]
            ) ?? "";


          const unit =
            textToString(
              param["@_unit"]
            );


          return {
            name,
            value,
            unit,
          };

        })
        .filter(
          param =>
            param.name !== ""
        );


    /**
     * --------------------------------------------------------
     * DESCRIPTION
     * --------------------------------------------------------
     */

    const description =
      textToString(
        offer.description
      );


    /**
     * ========================================================
     * PRODUCT
     * ========================================================
     *
     * Mangalzavod вже віддає українські:
     *
     * name
     * description
     *
     * Тому дублюємо їх у:
     *
     * nameUa
     * descriptionUa
     *
     * Це дозволяє використати існуючий normalizeProduct()
     * та importProduct().
     */

    products.push({

      available,

      source:
        "mangalzavod",

      sourceOfferId,

      name,

      nameUa:
        name,

      price,

      oldPrice,

      vendor:
        textToString(
          offer.vendor
        ),

      vendorCode:
        textToString(
          offer.vendorCode
        ),

      countryOfOrigin:
        textToString(
          offer.country_of_origin
        ),

      description,

      descriptionUa:
        description,

      category:
        categoryId
          ? {

              id:
                categoryId,

              name:
                categoryName ??
                categoryId,

            }
          : undefined,

      images,

      params,

    });

  }


  return products;

}