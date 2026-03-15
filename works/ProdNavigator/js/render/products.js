import { renderList, renderTags, escapeHtml } from "../utils/format.js";

export function renderProductList({ products, categories, filter }) {
  const options = categories
    .map((category) => `<option value="${escapeHtml(category)}"${filter.category === category ? " selected" : ""}>${escapeHtml(category)}</option>`)
    .join("");

  return `
    <section class="panel">
      <div class="detail-header">
        <div>
          <p class="eyebrow">Products</p>
          <h2 class="section-title">商品一覧</h2>
        </div>
        <p class="muted">${products.length} 件</p>
      </div>
      <div class="toolbar">
        <label class="field">
          <span>検索</span>
          <input id="products-keyword" type="search" value="${escapeHtml(filter.keyword)}" placeholder="商品名・コード">
        </label>
        <label class="field">
          <span>カテゴリ</span>
          <select id="products-category">
            <option value="all">すべて</option>
            ${options}
          </select>
        </label>
        <label class="field">
          <span>並び順</span>
          <select id="products-sort">
            <option value="name"${filter.sort === "name" ? " selected" : ""}>商品名順</option>
            <option value="code"${filter.sort === "code" ? " selected" : ""}>コード順</option>
          </select>
        </label>
      </div>
    </section>
    <section class="card-list">
      ${products.map((product) => `
        <article class="card">
          <div>
            <p class="eyebrow">${escapeHtml(product.code)}</p>
            <h3>${escapeHtml(product.name)}</h3>
          </div>
          <p>${escapeHtml(product.description)}</p>
          <div class="tags">${renderTags([product.category, ...(product.tags ?? [])])}</div>
          <a class="button button-primary" href="#/products/${escapeHtml(product.id)}">詳細を見る</a>
        </article>
      `).join("")}
    </section>
  `;
}

export function renderProductDetail({ product, factories, destinations, mistakes }) {
  return `
    <section class="panel detail-header">
      <div>
        <p class="eyebrow">${escapeHtml(product.code)}</p>
        <h2 class="section-title">${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.description)}</p>
      </div>
      <div class="tags">${renderTags([product.category, ...(product.tags ?? [])])}</div>
    </section>
    <section class="detail-sections">
      <article class="panel">
        <h3>基本情報</h3>
        <p><strong>用途:</strong> ${escapeHtml(product.usage)}</p>
        <h4>特徴</h4>
        ${renderList(product.features)}
      </article>
      <article class="notice notice-warn">
        <h3>注意点</h3>
        ${renderList(product.cautions)}
      </article>
      <article class="panel">
        <h3>関連工場</h3>
        <div class="tags">
          ${factories.map((factory) => `<a class="pill-link" href="#/factories/${escapeHtml(factory.id)}">${escapeHtml(factory.name)}</a>`).join("") || '<span class="muted">登録なし</span>'}
        </div>
      </article>
      <article class="panel">
        <h3>関連仕向け先</h3>
        <div class="tags">
          ${destinations.map((destination) => `<a class="pill-link" href="#/destinations/${escapeHtml(destination.id)}">${escapeHtml(destination.name)}</a>`).join("") || '<span class="muted">登録なし</span>'}
        </div>
      </article>
      <article class="notice notice-danger">
        <h3>よくあるミス</h3>
        ${mistakes.length
          ? `<ul class="list">${mistakes.map((mistake) => `<li>${escapeHtml(mistake.title)}</li>`).join("")}</ul>`
          : '<p class="muted">登録なし</p>'}
      </article>
    </section>
  `;
}
