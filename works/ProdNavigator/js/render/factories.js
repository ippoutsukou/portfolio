import { renderList, renderTags, escapeHtml } from "../utils/format.js";

export function renderFactoryList({ factories, filter }) {
  return `
    <section class="panel">
      <div class="detail-header">
        <div>
          <p class="eyebrow">Factories</p>
          <h2 class="section-title">工場一覧</h2>
        </div>
        <p class="muted">${factories.length} 件</p>
      </div>
      <div class="toolbar">
        <label class="field">
          <span>検索</span>
          <input id="factories-keyword" type="search" value="${escapeHtml(filter.keyword)}" placeholder="工場名・所在地">
        </label>
      </div>
    </section>
    <section class="card-list">
      ${factories.map((factory) => `
        <article class="card">
          <div>
            <p class="eyebrow">${escapeHtml(factory.location)}</p>
            <h3>${escapeHtml(factory.name)}</h3>
          </div>
          <p>${escapeHtml(factory.description)}</p>
          <div class="tags">${renderTags(factory.tags)}</div>
          <a class="button button-primary" href="#/factories/${escapeHtml(factory.id)}">詳細を見る</a>
        </article>
      `).join("")}
    </section>
  `;
}

export function renderFactoryDetail({ factory, products, destinations }) {
  return `
    <section class="panel detail-header">
      <div>
        <p class="eyebrow">${escapeHtml(factory.location)}</p>
        <h2 class="section-title">${escapeHtml(factory.name)}</h2>
        <p>${escapeHtml(factory.description)}</p>
      </div>
      <div class="tags">${renderTags(factory.tags)}</div>
    </section>
    <section class="detail-sections">
      <article class="panel">
        <h3>対応可能仕様</h3>
        ${renderList(factory.capabilities)}
      </article>
      <article class="panel">
        <h3>担当商品</h3>
        <div class="tags">
          ${products.map((product) => `<a class="pill-link" href="#/products/${escapeHtml(product.id)}">${escapeHtml(product.name)}</a>`).join("") || '<span class="muted">登録なし</span>'}
        </div>
      </article>
      <article class="panel">
        <h3>出荷先</h3>
        <div class="tags">
          ${destinations.map((destination) => `<a class="pill-link" href="#/destinations/${escapeHtml(destination.id)}">${escapeHtml(destination.name)}</a>`).join("") || '<span class="muted">登録なし</span>'}
        </div>
      </article>
      <article class="notice notice-warn">
        <h3>注意点</h3>
        ${renderList(factory.cautions)}
      </article>
    </section>
  `;
}
