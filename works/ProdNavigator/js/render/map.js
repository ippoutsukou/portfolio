import { escapeHtml } from "../utils/format.js";

export function renderMap({ products, factories, destinations, relations }) {
  const sample = relations[0];
  const product = products.find((item) => item.id === sample?.productId);
  const factory = factories.find((item) => item.id === sample?.factoryId);
  const destination = destinations.find((item) => item.id === sample?.destinationId);

  return `
    <section class="panel">
      <p class="eyebrow">Relation Map</p>
      <h2 class="section-title">関係マップ</h2>
      <p class="muted">初版雛形では代表的な接続例を表示します。実装時に起点選択とハイライトを拡張します。</p>
    </section>
    <section class="panel map-stage">
      ${sample
        ? `
          <div class="node-flow">
            <a class="node" href="#/products/${escapeHtml(product?.id ?? "")}">${escapeHtml(product?.name ?? "商品未設定")}</a>
            <span class="arrow">→</span>
            <a class="node" href="#/factories/${escapeHtml(factory?.id ?? "")}">${escapeHtml(factory?.name ?? "工場未設定")}</a>
            <span class="arrow">→</span>
            <a class="node" href="#/destinations/${escapeHtml(destination?.id ?? "")}">${escapeHtml(destination?.name ?? "仕向け先未設定")}</a>
          </div>
        `
        : "<p>relations.json にデータを登録すると表示されます。</p>"}
    </section>
  `;
}
