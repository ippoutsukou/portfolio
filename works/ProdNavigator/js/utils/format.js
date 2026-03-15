export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderTags(tags = []) {
  if (!tags.length) {
    return '<span class="muted">タグなし</span>';
  }

  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

export function renderList(items = []) {
  if (!items.length) {
    return '<p class="muted">登録なし</p>';
  }

  return `<ul class="list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}
