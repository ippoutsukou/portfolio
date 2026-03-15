import { escapeHtml } from "../utils/format.js";

export function renderGlossaryFaq({ glossary, faq }) {
  return `
    <section class="grid grid-2">
      <article class="panel">
        <p class="eyebrow">Glossary</p>
        <h2 class="section-title">用語集</h2>
        <div class="grid">
          ${glossary.map((item) => `
            <section class="card">
              <div>
                <p class="eyebrow">${escapeHtml(item.reading)}</p>
                <h3>${escapeHtml(item.term)}</h3>
              </div>
              <p>${escapeHtml(item.description)}</p>
            </section>
          `).join("")}
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">FAQ</p>
        <h2 class="section-title">よくある質問</h2>
        <div class="grid">
          ${faq.map((item) => `
            <section class="card">
              <h3>${escapeHtml(item.question)}</h3>
              <p>${escapeHtml(item.answer)}</p>
            </section>
          `).join("")}
        </div>
      </article>
    </section>
  `;
}
