import { escapeHtml } from "../utils/format.js";

export function renderMistakes({ mistakes }) {
  return `
    <section class="panel">
      <p class="eyebrow">Mistakes</p>
      <h2 class="section-title">よくある間違い</h2>
    </section>
    <section class="grid">
      ${mistakes.map((mistake) => `
        <article class="notice notice-danger">
          <p class="eyebrow">${escapeHtml(mistake.category)}</p>
          <h3>${escapeHtml(mistake.title)}</h3>
          <p>${escapeHtml(mistake.description)}</p>
          <p><strong>予防策:</strong> ${escapeHtml(mistake.prevention)}</p>
        </article>
      `).join("")}
    </section>
  `;
}
