import { readFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

export interface SupplierProduct {
  available: boolean;

  source: string;
  sourceOfferId: string;

  name: string;
  nameUa?: string | null;

  price: number;
  oldPrice?: number | null;

  vendor?: string | null;
  vendorCode?: string | null;
  countryOfOrigin?: string | null;

  description?: string | null;
  descriptionUa?: string | null;

  category?: {
    id: string;
    name: string;
  };

  images: string[];

  params: Array<{
    name: string;
    value: string;
    unit?: string | null;
  }>;
}

interface YmlOffer {
  "@_id": string;
  "@_available": string;

  url?: string;
  oldprice?: string | number;
  price?: string | number;
  currencyId?: string;
  categoryId?: string | number;

  picture?: string | string[];

  name?: string;
  name_ua?: string;

  vendor?: string;
  vendorCode?: string;
  country_of_origin?: string;

  description?: string;
  description_ua?: string;

  param?:
    | {
        "@_name": string;
        "@_unit"?: string;
        "#text"?: string | number;
      }
    | Array<{
        "@_name": string;
        "@_unit"?: string;
        "#text"?: string | number;
      }>;
}

interface YmlCategory {
  "@_id": string;
  "@_parentId"?: string;
  "#text"?: string;
}

interface YmlCatalog {
  yml_catalog?: {
    shop?: {
      categories?: {
        category?: YmlCategory | YmlCategory[];
      };

      offers?: {
        offer?: YmlOffer | YmlOffer[];
      };
    };
  };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function textToString(
  value: string | number | undefined | null
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const result = String(value).trim();

  return result === "" ? null : result;
}

function toNumber(
  value: string | number | undefined | null
): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value)
    .replace(/\s/g, "")
    .replace(",", ".");

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function parseAvailable(
  value: string | undefined
): boolean {
  return value === "true";
}

export async function parseYmlFile(
  filePath: string
): Promise<SupplierProduct[]> {

  const xml = await readFile(
    filePath,
    "utf8"
  );

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",

    trimValues: true,

    parseTagValue: false,

    processEntities: true,
  });

  const data =
    parser.parse(xml) as YmlCatalog;

  const shop =
    data.yml_catalog?.shop;

  if (!shop) {
    throw new Error(
      "YML: <shop> not found"
    );
  }

  /*
   * --------------------------------------------------
   * Categories
   * --------------------------------------------------
   */

  const categoryMap =
    new Map<string, string>();

  const categoriesRaw =
    shop.categories?.category;

  const categories =
    toArray(categoriesRaw);

  for (const category of categories) {

    const id =
      String(category["@_id"]);

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

  /*
   * --------------------------------------------------
   * Offers
   * --------------------------------------------------
   */

  const offersRaw =
    shop.offers?.offer;

  const offers =
    toArray(offersRaw);

  const products:
    SupplierProduct[] = [];

  for (const offer of offers) {

    const sourceOfferId =
      String(offer["@_id"]);

    /*
     * available="true"
     * available="false"
     */

    const available =
      parseAvailable(
        offer["@_available"]
      );

    /*
     * Name
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

    /*
     * Price
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

    /*
     * Old price
     */

    const oldPrice =
      toNumber(
        offer.oldprice
      );

    /*
     * Category
     */

    const categoryId =
      offer.categoryId !== undefined
        ? String(offer.categoryId)
        : undefined;

    const categoryName =
      categoryId
        ? categoryMap.get(
            categoryId
          )
        : undefined;

    /*
     * Images
     */

    const images =
      toArray(
        offer.picture
      )
        .map(String)
        .map(
          value => value.trim()
        )
        .filter(Boolean);

    /*
     * Params
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

    /*
     * Product
     */

    products.push({

      available,

      source:
        "aveon",

      sourceOfferId,

      name,

      nameUa:
        textToString(
          offer.name_ua
        ),

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

      description:
        textToString(
          offer.description
        ),

      descriptionUa:
        textToString(
          offer.description_ua
        ),

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