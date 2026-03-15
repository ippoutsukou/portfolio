import { escapeHtml } from "../utils/format.js";

export function renderLearning({ products, progress, quiz }) {
  const priorityProducts = products
    .filter((product) => product.priority === "high")
    .slice(0, 10);

  const progressSet = new Set(progress);
  const firstQuiz = quiz[0];

  return `
    <section class="panel">
      <p class="eyebrow">Learning Mode</p>
      <h2 class="section-title">学習モード</h2>
      <p class="muted">優先学習対象を確認し、最後にクイズで理解度を確認します。</p>
    </section>
    <section class="grid grid-2">
      <article class="panel">
        <h3>まず覚える商品</h3>
        <div class="stepper">
          ${priorityProducts.map((product, index) => `
            <div class="step ${progressSet.has(product.id) ? "done" : ""}">
              <strong>${index + 1}. ${escapeHtml(product.name)}</strong>
              <p>${escapeHtml(product.description)}</p>
              <button class="button button-link" data-progress-id="${escapeHtml(product.id)}" type="button">
                ${progressSet.has(product.id) ? "学習済み" : "学習済みにする"}
              </button>
            </div>
          `).join("")}
        </div>
      </article>
      <article class="panel quiz-card">
        <h3>確認クイズ</h3>
        ${firstQuiz
          ? `
            <p>${escapeHtml(firstQuiz.question)}</p>
            <div class="choices">
              ${firstQuiz.choices.map((choice, index) => `
                <button class="button choice-button" data-quiz-answer="${index}" type="button">${escapeHtml(choice)}</button>
              `).join("")}
            </div>
            <div id="quiz-result" class="muted"></div>
          `
          : "<p>クイズデータを登録してください。</p>"}
      </article>
    </section>
  `;
}
