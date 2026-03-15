import { renderList, renderTags, escapeHtml } from "../utils/format.js";

export function renderDestinationList({ destinations, filter }) {
  return `
    <section class="panel">
      <div class="detail-header">
        <div>
          <p class="eyebrow">Destinations</p>
          <h2 class="section-title">仕向け先一覧</h2>
        </div>
        <p class="muted">${destinations.length} 件</p>
      </div>
      <div class="toolbar">
        <label class="field">
          <span>検索</span>
          <input id="destinations-keyword" type="search" value="${escapeHtml(filter.keyword)}" placeholder="仕向け先名・地域">
        </label>
      </div>
    </section>
    <section class="card-list">
      ${destinations.map((destination) => `
        <article class="card">
          <div>
            <p class="eyebrow">${escapeHtml(destination.region)}</p>
            <h3>${escapeHtml(destination.name)}</h3>
          </div>
          <p>${escapeHtml(destination.description)}</p>
          <div class="tags">${renderTags(destination.tags)}</div>
          <a class="button button-primary" href="#/destinations/${escapeHtml(destination.id)}">詳細を見る</a>
        </article>
      `).join("")}
    </section>
  `;
}

export function renderDestinationDetail({ destination, products, factories }) {
  return `
    <section class="panel detail-header">
      <div>
        <p class="eyebrow">${escapeHtml(destination.region)}</p>
        <h2 class="section-title">${escapeHtml(destination.name)}</h2>
        <p>${escapeHtml(destination.description)}</p>
      </div>
      <div class="tags">${renderTags(destination.tags)}</div>
    </section>
    <section class="detail-sections">
      <article class="panel">
        <h3>特有ルール</h3>
        ${renderList(destination.specificRules)}
      </article>
      <article class="panel">
        <h3>対象商品</h3>
        <div class="tags">
          ${products.map((product) => `<a class="pill-link" href="#/products/${escapeHtml(product.id)}">${escapeHtml(product.name)}</a>`).join("") || '<span class="muted">登録なし</span>'}
        </div>
      </article>
      <article class="panel">
        <h3>担当工場</h3>
        <div class="tags">
          ${factories.map((factory) => `<a class="pill-link" href="#/factories/${escapeHtml(factory.id)}">${escapeHtml(factory.name)}</a>`).join("") || '<span class="muted">登録なし</span>'}
        </div>
      </article>
      <article class="notice notice-warn">
        <h3>注意事項</h3>
        ${renderList(destination.cautions)}
      </article>
    </section>
  `;
}
