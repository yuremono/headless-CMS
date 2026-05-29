/**
 * セクション型ごとの簡易 markup 生成。
 * CMS は表示責任を持たないため、ここはデモ専用の最小レンダラー。
 */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readText(value) {
  return typeof value === "string" && value.trim() ? value : "";
}

function readImage(value) {
  if (typeof value === "string" && value.trim()) {
    return { url: value, alt: "" };
  }

  const image = asObject(value);
  if (!image || typeof image.url !== "string" || !image.url.trim()) {
    return null;
  }

  return {
    url: image.url,
    alt: typeof image.alt === "string" ? image.alt : "",
  };
}

function readButton(value) {
  const button = asObject(value);
  if (!button) {
    return null;
  }

  const label = readText(button.label);
  const href = readText(button.href);
  if (!label || !href) {
    return null;
  }

  return { label, href };
}

function renderImage(image, className) {
  if (!image) {
    return "";
  }

  return `<img class="${className}" src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" loading="lazy" />`;
}

function renderButton(button, className) {
  if (!button) {
    return "";
  }

  return `<a class="${className}" href="${escapeHtml(button.href)}">${escapeHtml(button.label)}</a>`;
}

function renderTitleBlock(title, lead) {
  const parts = [];
  if (title) {
    parts.push(`<h2 class="preview_section__title">${escapeHtml(title)}</h2>`);
  }
  if (lead) {
    parts.push(`<p class="preview_section__lead">${escapeHtml(lead)}</p>`);
  }
  return parts.join("");
}

function renderBodyHtml(body) {
  if (!body) {
    return "";
  }
  return `<div class="preview_section__body">${body}</div>`;
}

function renderFallback(section) {
  return `<pre class="preview_section__fallback">${escapeHtml(JSON.stringify(section, null, 2))}</pre>`;
}

function wrapSection(type, id, innerHtml, extraClass = "") {
  const classNames = ["preview_section", extraClass].filter(Boolean).join(" ");
  const idAttr = id ? ` id="${escapeHtml(id)}"` : "";
  return `<section class="${classNames}" data-section-type="${escapeHtml(type)}"${idAttr}>
    <p class="preview_section__type">${escapeHtml(type)}</p>
    ${innerHtml}
  </section>`;
}

function renderHero(data) {
  const title = readText(data.title);
  const lead = readText(data.lead);
  const image = readImage(data.image);
  const button = readButton(data.button);

  return wrapSection(
    "hero",
    "",
    `${renderTitleBlock(title, lead)}
     ${renderImage(image, "preview_section__image")}
     ${renderButton(button, "preview_section__button")}`,
  );
}

function renderTitleGroup(data) {
  const title = readText(data.title);
  const lead = readText(data.lead) || readText(data.subtitle);
  return wrapSection("titleGroup", "", renderTitleBlock(title, lead));
}

function renderTextBlock(data) {
  const title = readText(data.title);
  const body = readText(data.body) || readText(data.content);
  return wrapSection("textBlock", "", `${renderTitleBlock(title, "")}${renderBodyHtml(body)}`);
}

function renderImageText(data) {
  const title = readText(data.title);
  const body = readText(data.body) || readText(data.content);
  const image = readImage(data.image);
  const position = readText(data.imagePosition).toLowerCase();
  const layoutClass = position === "left" ? "is_image_left" : position === "right" ? "is_image_right" : "";

  return wrapSection(
    "imageText",
    "",
    `<div class="preview_section__media">${renderImage(image, "preview_section__image")}</div>
     <div class="preview_section__content">${renderTitleBlock(title, "")}${renderBodyHtml(body)}</div>`,
    layoutClass,
  );
}

function renderCardList(data) {
  const title = readText(data.title);
  const cards = asArray(data.cards ?? data.items);

  const items = cards
    .map((card) => {
      const item = asObject(card);
      if (!item) {
        return "";
      }

      const cardTitle = readText(item.title);
      const cardBody = readText(item.body) || readText(item.description);
      const image = readImage(item.image);
      const link = readButton(item.link ?? item.button);

      return `<li class="preview_card">
        ${renderImage(image, "preview_card__image")}
        ${cardTitle ? `<h3 class="preview_card__title">${escapeHtml(cardTitle)}</h3>` : ""}
        ${cardBody ? `<p class="preview_card__body">${escapeHtml(cardBody)}</p>` : ""}
        ${renderButton(link, "preview_section__button")}
      </li>`;
    })
    .join("");

  return wrapSection(
    "cardList",
    "",
    `${renderTitleBlock(title, "")}<ul class="preview_section__cards">${items}</ul>`,
  );
}

function renderFeatureList(data) {
  const title = readText(data.title);
  const items = asArray(data.items ?? data.features);

  const list = items
    .map((entry) => {
      const item = asObject(entry);
      if (!item) {
        return "";
      }

      const itemTitle = readText(item.title);
      const description = readText(item.description) || readText(item.body);
      return `<li><strong>${escapeHtml(itemTitle)}</strong>${description ? `: ${escapeHtml(description)}` : ""}</li>`;
    })
    .join("");

  return wrapSection(
    "featureList",
    "",
    `${renderTitleBlock(title, "")}<ul class="preview_section__list">${list}</ul>`,
  );
}

function renderFaq(data) {
  const title = readText(data.title);
  const items = asArray(data.items ?? data.questions);

  const list = items
    .map((entry) => {
      const item = asObject(entry);
      if (!item) {
        return "";
      }

      const question = readText(item.question) || readText(item.title);
      const answer = readText(item.answer) || readText(item.body);
      return `<div class="preview_faq_item">
        <p class="preview_faq_item__question">${escapeHtml(question)}</p>
        <p class="preview_faq_item__answer">${escapeHtml(answer)}</p>
      </div>`;
    })
    .join("");

  return wrapSection("faq", "", `${renderTitleBlock(title, "")}${list}`);
}

function renderCta(data) {
  const title = readText(data.title);
  const lead = readText(data.lead) || readText(data.body);
  const button = readButton(data.button);

  return wrapSection(
    "cta",
    "",
    `${renderTitleBlock(title, lead)}${renderButton(button, "preview_section__button")}`,
  );
}

function renderNewsList(data) {
  const title = readText(data.title);
  const items = asArray(data.items ?? data.posts);

  const list = items
    .map((entry) => {
      const item = asObject(entry);
      if (!item) {
        return "";
      }

      const itemTitle = readText(item.title);
      const summary = readText(item.summary);
      const slug = readText(item.slug);
      return `<li>${escapeHtml(itemTitle)}${summary ? ` — ${escapeHtml(summary)}` : ""}${slug ? ` <small>(${escapeHtml(slug)})</small>` : ""}</li>`;
    })
    .join("");

  return wrapSection(
    "newsList",
    "",
    `${renderTitleBlock(title, "")}<ul class="preview_section__list">${list}</ul>`,
  );
}

function renderGallery(data) {
  const title = readText(data.title);
  const images = asArray(data.images ?? data.items);

  const list = images
    .map((entry) => {
      const image = readImage(entry);
      if (!image) {
        return "";
      }

      const item = asObject(entry);
      const caption = item && typeof item.caption === "string" ? item.caption : "";

      return `<li class="preview_gallery_item">
        ${renderImage(image, "preview_gallery_item__image")}
        ${caption ? `<p class="preview_gallery_item__caption">${escapeHtml(caption)}</p>` : ""}
      </li>`;
    })
    .join("");

  return wrapSection(
    "gallery",
    "",
    `${renderTitleBlock(title, "")}<ul class="preview_section__gallery">${list}</ul>`,
  );
}

function renderCompanyProfile(data) {
  const name = readText(data.companyName) || readText(data.title);
  const description = readText(data.description) || readText(data.body);
  return wrapSection(
    "companyProfile",
    "",
    `${name ? `<h2 class="preview_section__title">${escapeHtml(name)}</h2>` : ""}${renderBodyHtml(description)}`,
  );
}

function renderAccess(data) {
  const title = readText(data.title) || "Access";
  const address = readText(data.address);
  const mapUrl = readText(data.mapUrl);

  return wrapSection(
    "access",
    "",
    `${renderTitleBlock(title, "")}
     ${address ? `<p class="preview_section__body">${escapeHtml(address)}</p>` : ""}
     ${mapUrl ? `<p><a class="preview_section__button" href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener noreferrer">Map</a></p>` : ""}`,
  );
}

function renderContactLead(data) {
  const title = readText(data.title);
  const lead = readText(data.lead) || readText(data.body);
  const button = readButton(data.button);

  return wrapSection(
    "contactLead",
    "",
    `${renderTitleBlock(title, lead)}${renderButton(button, "preview_section__button")}`,
  );
}

const SECTION_RENDERERS = {
  hero: renderHero,
  titleGroup: renderTitleGroup,
  textBlock: renderTextBlock,
  imageText: renderImageText,
  cardList: renderCardList,
  featureList: renderFeatureList,
  faq: renderFaq,
  cta: renderCta,
  newsList: renderNewsList,
  gallery: renderGallery,
  companyProfile: renderCompanyProfile,
  access: renderAccess,
  contactLead: renderContactLead,
};

/**
 * topPage のページレベル hero オブジェクト（sectionArray 外）を描画。
 * @param {Record<string, unknown>} hero
 */
export function renderPageHero(hero) {
  const data = asObject(hero);
  if (!data) {
    return "";
  }

  const title = readText(data.title);
  const lead = readText(data.lead);
  const image = readImage(data.image);
  const button = readButton(data.button);

  if (!title && !lead && !image && !button) {
    return "";
  }

  return `<section class="preview_page_hero">
    ${title ? `<h1 class="preview_page_hero__title">${escapeHtml(title)}</h1>` : ""}
    ${lead ? `<p class="preview_page_hero__lead">${escapeHtml(lead)}</p>` : ""}
    ${renderImage(image, "preview_page_hero__image")}
    ${renderButton(button, "preview_page_hero__button")}
  </section>`;
}

/**
 * @param {unknown} sections
 */
export function renderSections(sections) {
  const list = asArray(sections);
  if (list.length === 0) {
    return "";
  }

  return `<div class="preview_sections">${list.map(renderSection).join("")}</div>`;
}

/**
 * @param {unknown} section
 */
export function renderSection(section) {
  const record = asObject(section);
  if (!record) {
    return "";
  }

  const type = readText(record.type);
  const id = readText(record.id);
  const data = asObject(record.data) ?? {};

  const renderer = SECTION_RENDERERS[type];
  if (renderer) {
    return renderer(data).replace(
      'class="preview_section"',
      id ? `class="preview_section" id="${escapeHtml(id)}"` : 'class="preview_section"',
    );
  }

  return wrapSection(type || "unknown", id, renderFallback(record));
}

export const supportedSectionTypes = Object.keys(SECTION_RENDERERS);
