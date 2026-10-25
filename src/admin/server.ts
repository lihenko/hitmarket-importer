import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { db } from "../database/connection";
import { createProduct, getProductBySourceOffer } from "../database/products";

import type { ProductConfig } from "../importer/generate-config";

const app = express();
const PORT = 3001;

// ---------------------------------------------------------
// CONFIG
// ---------------------------------------------------------

const PROJECT_DIR = path.resolve(process.cwd(), "..", "powerbank-landing");
const PRODUCTS_DIR = path.join(PROJECT_DIR, "public", "products");

// ---------------------------------------------------------
// MULTER
// ---------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    files: 20,
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Дозволені тільки зображення"));
      return;
    }

    cb(null, true);
  },
});

app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseNumber(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function parseNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return parseNumber(value);
}

function parseConfig(value: unknown): ProductConfig | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value) as ProductConfig;
  } catch {
    return null;
  }
}

function slugifyFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9а-яіїєґ]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function valueOrEmpty(value: unknown): string {
  return value === undefined || value === null
    ? ""
    : String(value);
}

// ---------------------------------------------------------
// SAVE UPLOADED IMAGE
// ---------------------------------------------------------

async function saveUploadedImage(
  file: Express.Multer.File,
  productSlug: string,
  index: number
): Promise<string> {
  const baseName =
    slugifyFileName(file.originalname) ||
    `${productSlug}-${index + 1}`;

  const uniqueName =
    `${productSlug}-${index + 1}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${baseName}.webp`;

  const outputPath = path.join(PRODUCTS_DIR, uniqueName);

  await sharp(file.buffer)
    .rotate()
    .webp({ quality: 85 })
    .toFile(outputPath);

  return `/products/${uniqueName}`;
}

// ---------------------------------------------------------
// GET CREATE PRODUCT PAGE
// ---------------------------------------------------------

app.get("/admin/products/new", async (_req, res) => {
  const [rows] = await db.query(`
    SELECT
      id,
      name,
      parent_id
    FROM categories
    ORDER BY name ASC
  `);

  const categories = rows as {
    id: number;
    name: string;
    parent_id: number | null;
  }[];

  res.send(`
<!doctype html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>Новий товар</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 40px;
      background: #f5f5f5;
      color: #222;
      font-family: Arial, sans-serif;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 30px;
    }

    h2 {
      margin-top: 0;
      margin-bottom: 20px;
    }

    h3 {
      margin-top: 30px;
    }

    .section {
      background: #fff;
      padding: 25px;
      margin-bottom: 25px;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .field {
      margin-bottom: 16px;
    }

    .field.full {
      grid-column: 1 / -1;
    }

    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
    }

    input,
    textarea,
    select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font: inherit;
    }

    textarea {
      min-height: 110px;
      resize: vertical;
    }

    input[type="checkbox"] {
      width: auto;
    }

    .row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 15px;
      margin-bottom: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fafafa;
    }

    .row.three {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .row.four {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .row .full {
      grid-column: 1 / -1;
    }

    button {
      border: 0;
      border-radius: 6px;
      padding: 10px 16px;
      cursor: pointer;
      font: inherit;
    }

    .add {
      background: #eee;
    }

    .remove {
      background: #f5d0d0;
      color: #900;
    }

    .submit {
      width: 100%;
      padding: 16px;
      background: #111;
      color: #fff;
      font-size: 18px;
      font-weight: 700;
    }

    .submit:hover {
      background: #333;
    }

    .checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .help {
      color: #777;
      font-size: 13px;
      margin-top: 5px;
    }

    @media (max-width: 800px) {
      body {
        padding: 20px;
      }

      .grid,
      .row,
      .row.three,
      .row.four {
        grid-template-columns: 1fr;
      }

      .field.full,
      .row .full {
        grid-column: auto;
      }
    }
  </style>
</head>

<body>

<div class="container">

  <h1>Створення нового товару</h1>

  <form
    method="POST"
    action="/admin/products"
    enctype="multipart/form-data"
    id="product-form"
  >

    <!-- ================================================= -->
    <!-- BASIC -->
    <!-- ================================================= -->

    <div class="section">

      <h2>Основна інформація</h2>

      <div class="grid">

        <div class="field full">
          <label>Назва</label>
          <input
            type="text"
            name="name"
            required
          >
        </div>

        <div class="field">
          <label>Slug</label>
          <input
            type="text"
            name="slug"
            required
          >
        </div>

        <div class="field">
          <label>Ціна</label>
          <input
            type="number"
            name="price"
            step="0.01"
            min="0"
            required
          >
        </div>

        <div class="field">
          <label>Стара ціна</label>
          <input
            type="number"
            name="old_price"
            step="0.01"
            min="0"
          >
        </div>

        <div class="field">
          <label>Категорія</label>

          <select name="category_id">
            <option value="">— Без категорії —</option>

            ${categories
              .map(
                (category) => `
                  <option value="${category.id}">
                    ${escapeHtml(category.name)}
                  </option>
                `
              )
              .join("")}

          </select>
        </div>

        <div class="field">
          <label>Виробник</label>
          <input type="text" name="vendor">
        </div>

        <div class="field">
          <label>Країна походження</label>
          <input type="text" name="country_of_origin">
        </div>

        <div class="field checkbox">
          <input
            type="checkbox"
            name="available"
            value="1"
            checked
          >

          <label style="margin:0">
            Товар доступний
          </label>
        </div>

        <div class="field full">
          <label>Опис</label>
          <textarea name="description"></textarea>
        </div>

        <div class="field">
          <label>SEO Title</label>
          <input type="text" name="seo_title">
        </div>

        <div class="field">
          <label>SEO Description</label>
          <textarea name="seo_description"></textarea>
        </div>

      </div>

    </div>


    <!-- ================================================= -->
    <!-- IMAGES -->
    <!-- ================================================= -->

    <div class="section">

      <h2>Зображення</h2>

      <div class="field">

        <label>
          Завантажити зображення
        </label>

        <input
          type="file"
          name="images"
          accept="image/*"
          multiple
        >

        <div class="help">
          Можна вибрати декілька зображень.
          Перше буде головним.
          Зображення автоматично конвертуються у WebP.
          Максимальний розмір одного файлу — 10 MB.
        </div>

      </div>

    </div>


    <!-- ================================================= -->
    <!-- PRODUCT PARAMS -->
    <!-- ================================================= -->

    <div class="section">

      <h2>Параметри товару</h2>

      <div id="params"></div>

      <button
        type="button"
        class="add"
        onclick="addParam()"
      >
        + Додати параметр
      </button>

    </div>


    <!-- ================================================= -->
    <!-- CONFIG -->
    <!-- ================================================= -->

    <div class="section">

      <h2>Config</h2>

      <!-- HERO -->

      <h3>Hero</h3>

      <div class="grid">

        <div class="field">
          <label>Badge</label>
          <input id="hero_badge">
        </div>

        <div class="field">
          <label>Title</label>
          <input id="hero_title">
        </div>

        <div class="field full">
          <label>Description</label>
          <textarea id="hero_description"></textarea>
        </div>

      </div>


      <!-- FEATURES -->

      <h3>Features</h3>

      <div class="grid">

        <div class="field">
          <label>Eyebrow</label>
          <input id="features_eyebrow">
        </div>

        <div class="field">
          <label>Title</label>
          <input id="features_title">
        </div>

      </div>

      <div id="features_items"></div>

      <button
        type="button"
        class="add"
        onclick="addFeature()"
      >
        + Додати перевагу
      </button>


      <!-- COMPACT -->

      <h3>Compact</h3>

      <div class="grid">

        <div class="field">
          <label>Eyebrow</label>
          <input id="compact_eyebrow">
        </div>

        <div class="field">
          <label>Title</label>
          <input id="compact_title">
        </div>

        <div class="field full">
          <label>Description</label>
          <textarea id="compact_description"></textarea>
        </div>

      </div>

      <div id="compact_bullets"></div>

      <button
        type="button"
        class="add"
        onclick="addCompactBullet()"
      >
        + Додати bullet
      </button>


      <!-- PORTS -->

      <h3>Ports</h3>

      <div class="grid">

        <div class="field">
          <label>Eyebrow</label>
          <input id="ports_eyebrow">
        </div>

        <div class="field">
          <label>Title</label>
          <input id="ports_title">
        </div>

        <div class="field full">
          <label>Description</label>
          <textarea id="ports_description"></textarea>
        </div>

      </div>

      <div id="ports_bullets"></div>

      <button
        type="button"
        class="add"
        onclick="addPortsBullet()"
      >
        + Додати bullet
      </button>


      <!-- PACKAGE -->

      <h3>Package</h3>

      <div class="grid">

        <div class="field">
          <label>Eyebrow</label>
          <input id="package_eyebrow">
        </div>

        <div class="field">
          <label>Title</label>
          <input id="package_title">
        </div>

        <div class="field full">
          <label>Description</label>
          <textarea id="package_description"></textarea>
        </div>

      </div>

      <div id="package_items"></div>

      <button
        type="button"
        class="add"
        onclick="addPackageItem()"
      >
        + Додати елемент
      </button>


      <!-- SPECIFICATIONS -->

      <h3>Specifications</h3>

      <div class="field">
        <label>Title</label>
        <input id="specifications_title">
      </div>

      <div id="specifications_items"></div>

      <button
        type="button"
        class="add"
        onclick="addSpecification()"
      >
        + Додати характеристику
      </button>


      <!-- FAQ -->

      <h3>FAQ</h3>

      <div id="faq_items"></div>

      <button
        type="button"
        class="add"
        onclick="addFaq()"
      >
        + Додати FAQ
      </button>


      <!-- REVIEWS -->

      <h3>Reviews</h3>

      <div id="reviews_items"></div>

      <button
        type="button"
        class="add"
        onclick="addReview()"
      >
        + Додати відгук
      </button>

    </div>


    <input
      type="hidden"
      name="config_json"
      id="config_json"
    >

    <input
      type="hidden"
      name="params_json"
      id="params_json"
    >

    <button
      type="submit"
      class="submit"
    >
      Створити товар
    </button>

  </form>

</div>


<script>

let featureIndex = 0;
let compactBulletIndex = 0;
let portsBulletIndex = 0;
let packageItemIndex = 0;
let specificationIndex = 0;
let faqIndex = 0;
let reviewIndex = 0;
let paramIndex = 0;


// ========================================================
// PARAMS
// ========================================================

function addParam() {

  const index = paramIndex++;

  const container = document.getElementById("params");

  const row = document.createElement("div");

  row.className = "row three";

  row.innerHTML = \`
    <div>
      <label>Назва</label>
      <input
        data-param-name
        placeholder="Наприклад: Потужність"
      >
    </div>

    <div>
      <label>Значення</label>
      <input
        data-param-value
        placeholder="Наприклад: 100"
      >
    </div>

    <div>
      <label>Одиниця</label>
      <input
        data-param-unit
        placeholder="Наприклад: Вт"
      >
    </div>

    <div class="full">
      <button
        type="button"
        class="remove"
        onclick="this.closest('.row').remove()"
      >
        Видалити
      </button>
    </div>
  \`;

  container.appendChild(row);
}


// ========================================================
// FEATURES
// ========================================================

function addFeature() {

  const index = featureIndex++;

  const container = document.getElementById("features_items");

  const row = document.createElement("div");

  row.className = "row four";

  row.innerHTML = \`
    <div>
      <label>Icon</label>
      <input data-icon>
    </div>

    <div>
      <label>Title</label>
      <input data-title>
    </div>

    <div>
      <label>Text</label>
      <input data-text>
    </div>

    <div>
      <label>Large</label>
      <input type="checkbox" data-large>
    </div>

    <div class="full">
      <button
        type="button"
        class="remove"
        onclick="this.closest('.row').remove()"
      >
        Видалити
      </button>
    </div>
  \`;

  container.appendChild(row);
}


// ========================================================
// COMPACT BULLETS
// ========================================================

function addCompactBullet() {

  const container = document.getElementById("compact_bullets");

  const row = document.createElement("div");

  row.className = "row";

  row.innerHTML = \`
    <div class="full">
      <label>Bullet</label>
      <input data-bullet>
    </div>

    <div class="full">
      <button
        type="button"
        class="remove"
        onclick="this.closest('.row').remove()"
      >
        Видалити
      </button>
    </div>
  \`;

  container.appendChild(row);
}


// ========================================================
// PORTS BULLETS
// ========================================================

function addPortsBullet() {

  const container = document.getElementById("ports_bullets");

  const row = document.createElement("div");

  row.className = "row";

  row.innerHTML = \`
    <div class="full">
      <label>Bullet</label>
      <input data-bullet>
    </div>

    <div class="full">
      <button
        type="button"
        class="remove"
        onclick="this.closest('.row').remove()"
      >
        Видалити
      </button>
    </div>
  \`;

  container.appendChild(row);
}


// ========================================================
// PACKAGE
// ========================================================

function addPackageItem() {

  const container = document.getElementById("package_items");

  const row = document.createElement("div");

  row.className = "row";

  row.innerHTML = \`
    <div class="full">
      <label>Елемент</label>
      <input data-item>
    </div>

    <div class="full">
      <button
        type="button"
        class="remove"
        onclick="this.closest('.row').remove()"
      >
        Видалити
      </button>
    </div>
  \`;

  container.appendChild(row);
}


// ========================================================
// SPECIFICATIONS
// ========================================================

function addSpecification() {

  const container =
    document.getElementById("specifications_items");

  const row = document.createElement("div");

  row.className = "row";

  row.innerHTML = \`
    <div>
      <label>Name</label>
      <input data-name>
    </div>

    <div>
      <label>Value</label>
      <input data-value>
    </div>

    <div class="full">
      <button
        type="button"
        class="remove"
        onclick="this.closest('.row').remove()"
      >
        Видалити
      </button>
    </div>
  \`;

  container.appendChild(row);
}


// ========================================================
// FAQ
// ========================================================

function addFaq() {

  const container =
    document.getElementById("faq_items");

  const row = document.createElement("div");

  row.className = "row";

  row.innerHTML = \`
    <div class="full">
      <label>Question</label>
      <input data-question>
    </div>

    <div class="full">
      <label>Answer</label>
      <textarea data-answer></textarea>
    </div>

    <div class="full">
      <button
        type="button"
        class="remove"
        onclick="this.closest('.row').remove()"
      >
        Видалити
      </button>
    </div>
  \`;

  container.appendChild(row);
}


// ========================================================
// REVIEWS
// ========================================================

function addReview() {

  const container =
    document.getElementById("reviews_items");

  const row = document.createElement("div");

  row.className = "row four";

  row.innerHTML = \`
    <div>
      <label>Name</label>
      <input data-name>
    </div>

    <div>
      <label>City</label>
      <input data-city>
    </div>

    <div>
      <label>Rating</label>
      <input
        type="number"
        min="1"
        max="5"
        value="5"
        data-rating
      >
    </div>

    <div>
      <label>Date</label>
      <input
        type="date"
        data-date
      >
    </div>

    <div class="full">
      <label>Text</label>
      <textarea data-text></textarea>
    </div>

    <div class="full">
      <button
        type="button"
        class="remove"
        onclick="this.closest('.row').remove()"
      >
        Видалити
      </button>
    </div>
  \`;

  container.appendChild(row);
}


// ========================================================
// BUILD CONFIG
// ========================================================

function buildConfig() {

  const features = [];

  document
    .querySelectorAll("#features_items .row")
    .forEach(row => {

      features.push({
        icon:
          row.querySelector("[data-icon]")?.value || "",

        title:
          row.querySelector("[data-title]")?.value || "",

        text:
          row.querySelector("[data-text]")?.value || "",

        large:
          row.querySelector("[data-large]")?.checked || false
      });

    });


  const compactBullets = [];

  document
    .querySelectorAll("#compact_bullets [data-bullet]")
    .forEach(input => {

      const value = input.value.trim();

      if (value) {
        compactBullets.push(value);
      }

    });


  const portsBullets = [];

  document
    .querySelectorAll("#ports_bullets [data-bullet]")
    .forEach(input => {

      const value = input.value.trim();

      if (value) {
        portsBullets.push(value);
      }

    });


  const packageItems = [];

  document
    .querySelectorAll("#package_items [data-item]")
    .forEach(input => {

      const value = input.value.trim();

      if (value) {
        packageItems.push(value);
      }

    });


  const specifications = [];

  document
    .querySelectorAll("#specifications_items .row")
    .forEach(row => {

      specifications.push({
        name:
          row.querySelector("[data-name]")?.value || "",

        value:
          row.querySelector("[data-value]")?.value || ""
      });

    });


  const faq = [];

  document
    .querySelectorAll("#faq_items .row")
    .forEach(row => {

      faq.push({
        question:
          row.querySelector("[data-question]")?.value || "",

        answer:
          row.querySelector("[data-answer]")?.value || ""
      });

    });


  const reviews = [];

  document
    .querySelectorAll("#reviews_items .row")
    .forEach(row => {

      reviews.push({
        name:
          row.querySelector("[data-name]")?.value || "",

        city:
          row.querySelector("[data-city]")?.value || "",

        rating:
          Number(
            row.querySelector("[data-rating]")?.value || 5
          ),

        date:
          row.querySelector("[data-date]")?.value || "",

        text:
          row.querySelector("[data-text]")?.value || ""
      });

    });


  return {

    hero: {
      badgeText:
        document.getElementById("hero_badge").value,

      title:
        document.getElementById("hero_title").value,

      description:
        document.getElementById("hero_description").value
    },

    features: {
      eyebrow:
        document.getElementById("features_eyebrow").value,

      title:
        document.getElementById("features_title").value,

      items: features
    },

    compact: {
      eyebrow:
        document.getElementById("compact_eyebrow").value,

      title:
        document.getElementById("compact_title").value,

      description:
        document.getElementById("compact_description").value,

      bullets: compactBullets
    },

    ports: {
      eyebrow:
        document.getElementById("ports_eyebrow").value,

      title:
        document.getElementById("ports_title").value,

      description:
        document.getElementById("ports_description").value,

      bullets: portsBullets
    },

    package: {
      eyebrow:
        document.getElementById("package_eyebrow").value,

      title:
        document.getElementById("package_title").value,

      description:
        document.getElementById("package_description").value,

      items: packageItems
    },

    specifications: {
      title:
        document.getElementById("specifications_title").value,

      items: specifications
    },

    faq,

    reviews

  };

}


// ========================================================
// BUILD PARAMS
// ========================================================

function buildParams() {

  const params = [];

  document
    .querySelectorAll("#params .row")
    .forEach(row => {

      const name =
        row.querySelector("[data-param-name]")?.value.trim() || "";

      const value =
        row.querySelector("[data-param-value]")?.value.trim() || "";

      const unit =
        row.querySelector("[data-param-unit]")?.value.trim() || "";

      if (!name) {
        return;
      }

      params.push({
        name,
        value,
        unit
      });

    });

  return params;
}


// ========================================================
// SUBMIT
// ========================================================

document
  .getElementById("product-form")
  .addEventListener("submit", function () {

    document.getElementById("config_json").value =
      JSON.stringify(buildConfig());

    document.getElementById("params_json").value =
      JSON.stringify(buildParams());

  });

</script>

</body>
</html>
  `);
});


// ---------------------------------------------------------
// POST CREATE PRODUCT
// ---------------------------------------------------------

app.post(
  "/admin/products",
  upload.array("images", 20),
  async (req, res) => {

    try {

      const {
        name,
        slug,
        price,
        old_price,
        category_id,
        vendor,
        country_of_origin,
        description,
        seo_title,
        seo_description,
        config_json,
        params_json,
      } = req.body;

      // ---------------------------------------------------
      // VALIDATION
      // ---------------------------------------------------

      if (!name?.trim()) {
        throw new Error("Не вказана назва товару");
      }

      if (!slug?.trim()) {
        throw new Error("Не вказаний slug");
      }

      const parsedPrice = parseNumber(price);

      if (parsedPrice === null) {
        throw new Error("Некоректна ціна");
      }

      const parsedOldPrice =
        parseNullableNumber(old_price);

      const parsedCategoryId =
        category_id
          ? Number(category_id)
          : null;

      if (
        parsedCategoryId !== null &&
        !Number.isInteger(parsedCategoryId)
      ) {
        throw new Error("Некоректна категорія");
      }

      // ---------------------------------------------------
      // CONFIG
      // ---------------------------------------------------

      const config =
        parseConfig(config_json);

      // ---------------------------------------------------
      // PARAMS
      // ---------------------------------------------------

      let params: {
        name: string;
        value: string;
        unit: string;
      }[] = [];

      if (params_json) {

        try {

          const parsed =
            JSON.parse(params_json);

          if (Array.isArray(parsed)) {

            params = parsed
              .filter(
                (item) =>
                  item &&
                  typeof item.name === "string" &&
                  item.name.trim()
              )
              .map((item) => ({
                name: item.name.trim(),
                value: String(item.value ?? "").trim(),
                unit: String(item.unit ?? "").trim(),
              }));

          }

        } catch {

          throw new Error(
            "Некоректний JSON параметрів"
          );

        }

      }

      // ---------------------------------------------------
      // MANUAL SOURCE
      // ---------------------------------------------------

      const source = "manual";

      const sourceOfferId =
        `manual-${crypto.randomUUID()}`;

      // ---------------------------------------------------
      // CREATE PRODUCT
      // ---------------------------------------------------

      await createProduct({
        source,
        sourceOfferId,

        vendorCode: null,

        name: name.trim(),

        slug: slug.trim(),

        price: parsedPrice,

        oldPrice: parsedOldPrice,

        available:
          req.body.available === "1",

        categoryId:
          parsedCategoryId,

        vendor:
          vendor?.trim() || null,

        countryOfOrigin:
          country_of_origin?.trim() || null,

        description:
          description?.trim() || null,

        seoTitle:
          seo_title?.trim() || null,

        seoDescription:
          seo_description?.trim() || null,

        config,
      });


      // ---------------------------------------------------
      // GET CREATED PRODUCT
      // ---------------------------------------------------

      const product =
        await getProductBySourceOffer(
          source,
          sourceOfferId
        );

      if (!product) {
        throw new Error(
          "Товар створено, але не вдалося отримати його ID"
        );
      }

      const productId = product.id;


      // ---------------------------------------------------
      // PRODUCT PARAMS
      // ---------------------------------------------------

      for (const param of params) {

        await db.query(
          `
          INSERT INTO product_params
          (
            product_id,
            name,
            value,
            unit
          )
          VALUES (?, ?, ?, ?)
          `,
          [
            productId,
            param.name,
            param.value,
            param.unit || null,
          ]
        );

      }


      // ---------------------------------------------------
      // IMAGES
      // ---------------------------------------------------

      const files =
        (req.files as Express.Multer.File[]) || [];

      for (
        let index = 0;
        index < files.length;
        index++
      ) {

        const file = files[index];

        if (!file) {
          continue;
        }

        const localPath =
          await saveUploadedImage(
            file,
            slug.trim(),
            index
          );

        await db.query(
          `
          INSERT INTO product_images
          (
            product_id,
            source_url,
            local_path,
            source_hash,
            sort_order
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            productId,

            // Для ручного товару немає
            // зовнішнього source URL.
            // Використовуємо унікальний manual:// ідентифікатор.
            `manual://${crypto.randomUUID()}`,

            localPath,

            null,

            index,
          ]
        );

      }


      // ---------------------------------------------------
      // SUCCESS
      // ---------------------------------------------------

      res.send(`
        <!doctype html>

        <html lang="uk">

        <head>
          <meta charset="UTF-8">

          <title>Товар створено</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 50px;
              background: #f5f5f5;
            }

            .box {
              max-width: 700px;
              margin: 0 auto;
              background: #fff;
              padding: 30px;
              border-radius: 10px;
            }

            a {
              display: inline-block;
              margin-top: 20px;
            }
          </style>
        </head>

        <body>

          <div class="box">

            <h1>Товар створено</h1>

            <p>
              <strong>ID:</strong>
              ${escapeHtml(productId)}
            </p>

            <p>
              <strong>Назва:</strong>
              ${escapeHtml(name)}
            </p>

            <p>
              <strong>Зображень:</strong>
              ${files.length}
            </p>

            <p>
              <strong>Параметрів:</strong>
              ${params.length}
            </p>

            <a href="/admin/products/new">
              Додати ще один товар
            </a>

          </div>

        </body>

        </html>
      `);

    } catch (error) {

      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "Невідома помилка";

      res.status(500).send(`
        <!doctype html>

        <html lang="uk">

        <head>
          <meta charset="UTF-8">
          <title>Помилка</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 50px;
              background: #f5f5f5;
            }

            .box {
              max-width: 700px;
              margin: 0 auto;
              background: #fff;
              padding: 30px;
              border-radius: 10px;
            }

            .error {
              color: #b00020;
            }

            a {
              display: inline-block;
              margin-top: 20px;
            }
          </style>
        </head>

        <body>

          <div class="box">

            <h1>Помилка</h1>

            <p class="error">
              ${escapeHtml(message)}
            </p>

            <a href="/admin/products/new">
              Повернутися до форми
            </a>

          </div>

        </body>

        </html>
      `);
    }
  }
);


// ---------------------------------------------------------
// MULTER ERROR HANDLER
// ---------------------------------------------------------

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {

    console.error(error);

    const message =
      error instanceof Error
        ? error.message
        : "Помилка завантаження файлу";

    res.status(400).send(`
      <h1>Помилка</h1>

      <p>
        ${escapeHtml(message)}
      </p>

      <p>
        <a href="/admin/products/new">
          Назад
        </a>
      </p>
    `);
  }
);


// ---------------------------------------------------------
// START
// ---------------------------------------------------------

app.listen(PORT, async () => {
  await fs.mkdir(PRODUCTS_DIR, { recursive: true });

  console.log(`Admin server: http://localhost:${PORT}/admin/products/new`);
});