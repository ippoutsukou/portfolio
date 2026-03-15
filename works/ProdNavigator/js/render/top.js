export function renderTop({ stats }) {
  return `
    <section class="hero">
      <p class="eyebrow">Overview</p>
      <h2>全体像を最短でつかむための入口</h2>
      <p>商品、工場、仕向け先の関係を迷わずたどれる教育用ポータルの雛形です。</p>
      <div class="stats">
        <article class="stat">
          <span>商品</span>
          <strong>${stats.products}</strong>
        </article>
        <article class="stat">
          <span>工場</span>
          <strong>${stats.factories}</strong>
        </article>
        <article class="stat">
          <span>仕向け先</span>
          <strong>${stats.destinations}</strong>
        </article>
      </div>
    </section>
    <section class="grid grid-2">
      <article class="panel">
        <h2 class="section-title">おすすめ閲覧順</h2>
        <ol class="list">
          <li>トップで件数とカテゴリを把握する</li>
          <li>商品一覧から主力商品を確認する</li>
          <li>商品詳細から工場・仕向け先へ横断する</li>
          <li>学習モードでクイズに進む</li>
        </ol>
      </article>
      <article class="panel">
        <h2 class="section-title">主要導線</h2>
        <div class="tags">
          <a class="pill-link" href="#/products">商品一覧</a>
          <a class="pill-link" href="#/factories">工場一覧</a>
          <a class="pill-link" href="#/destinations">仕向け先一覧</a>
          <a class="pill-link" href="#/map">関係マップ</a>
          <a class="pill-link" href="#/learning">学習モード</a>
        </div>
      </article>
    </section>
  `;
}
