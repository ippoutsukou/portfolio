(() => {
  const INITIAL_COUNT = 6;
  const LOAD_COUNT = 6;
  const STORAGE_KEY = "works:listState";

  const cardsEl = document.getElementById("worksCards");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const statusEl = document.getElementById("worksStatus");
  const entryMessageEl = document.getElementById("entryMessage");

  if (!cardsEl || !loadMoreBtn || !statusEl) {
    return;
  }

  let allWorks = [];
  let renderedCount = 0;
  let restoredScrollY = 0;

  const loadListState = () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const count = Number(parsed?.renderedCount);
      const scrollY = Number(parsed?.scrollY);
      return {
        renderedCount: Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0,
        scrollY: Number.isFinite(scrollY) ? Math.max(0, Math.floor(scrollY)) : 0,
      };
    } catch {
      return null;
    }
  };

  const saveListState = () => {
    try {
      const payload = {
        renderedCount,
        scrollY: Math.max(0, Math.floor(window.scrollY || window.pageYOffset || 0)),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // no-op
    }
  };

  const restoreScrollPosition = () => {
    if (restoredScrollY <= 0) return;
    requestAnimationFrame(() => {
      window.scrollTo(0, restoredScrollY);
    });
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const isNoteUrl = (value) => typeof value === "string" && /^https:\/\/note\.com\//.test(value.trim());

  const showEntryMessage = () => {
    if (!entryMessageEl) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "note") {
      entryMessageEl.textContent = "noteからのご訪問ありがとうございます。実績一覧をご覧ください。";
      entryMessageEl.hidden = false;
    }
  };

  const createCard = (work) => {
    const tagsHtml = (Array.isArray(work.tags) ? work.tags : [])
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");

    const imageHtml = work.image
      ? `<img class="card-thumb" src="${escapeHtml(work.image)}" alt="${escapeHtml(
          work.alt || `${work.title} スクリーンショット`
        )}" loading="lazy" decoding="async" />`
      : "";

    const workHref = escapeHtml(work.href || "#");
    const noteUrl = typeof work.noteUrl === "string" ? work.noteUrl.trim() : "";
    const noteLinkHtml = isNoteUrl(noteUrl)
      ? `<a class="card-link note-link" href="${escapeHtml(noteUrl)}" target="_blank" rel="noopener noreferrer">note記事を見る</a>`
      : "";

    return `
      <article class="card">
        ${imageHtml}
        <h3>${escapeHtml(work.title || "Untitled")}</h3>
        <p>${escapeHtml(work.description || "")}</p>
        <div class="tags">${tagsHtml}</div>
        <div class="card-actions">
          <a class="card-link work-link" href="${workHref}">作品を見る</a>
          ${noteLinkHtml}
        </div>
      </article>
    `;
  };

  const renderNext = (count) => {
    const end = Math.min(renderedCount + count, allWorks.length);
    const chunk = allWorks.slice(renderedCount, end);
    cardsEl.insertAdjacentHTML("beforeend", chunk.map(createCard).join(""));
    renderedCount = end;

    const remaining = allWorks.length - renderedCount;
    loadMoreBtn.hidden = remaining <= 0;
    statusEl.textContent = `${renderedCount} / ${allWorks.length} 件を表示中`;
    saveListState();
  };

  const boot = async () => {
    showEntryMessage();

    try {
      const response = await fetch(new URL("./works.json", window.location.href), {
        cache: "no-cache",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("works.json の形式が配列ではありません。");
      }

      allWorks = data;

      if (allWorks.length === 0) {
        statusEl.textContent = "作品データがまだありません。";
        return;
      }

      const saved = loadListState();
      const targetCount = Math.min(
        allWorks.length,
        Math.max(INITIAL_COUNT, saved?.renderedCount || 0)
      );
      restoredScrollY = saved?.scrollY || 0;

      renderNext(targetCount);
      restoreScrollPosition();

      loadMoreBtn.addEventListener("click", () => {
        renderNext(LOAD_COUNT);
      });

      cardsEl.addEventListener("click", (e) => {
        const link = e.target.closest("a.card-link");
        if (!link) return;
        saveListState();
      });

      window.addEventListener("scroll", saveListState, { passive: true });
      window.addEventListener("beforeunload", saveListState);
    } catch (error) {
      cardsEl.innerHTML = "";
      loadMoreBtn.hidden = true;
      statusEl.textContent = "作品の読み込みに失敗しました。";
      console.error("Failed to load works:", error);
    }
  };

  void boot();
})();
