import { state } from "./state.js";
import { loadAllData } from "./data-loader.js";
import { parseRoute, navigateTo } from "./router.js";
import { filterProducts, filterFactories, filterDestinations } from "./search.js";
import { buildRelationIndex, relatedIds } from "./utils/relation.js";
import { loadLearningProgress, saveLearningProgress } from "./utils/storage.js";
import { renderTop } from "./render/top.js";
import { renderProductList, renderProductDetail } from "./render/products.js";
import { renderFactoryList, renderFactoryDetail } from "./render/factories.js";
import { renderDestinationList, renderDestinationDetail } from "./render/destinations.js";
import { renderMap } from "./render/map.js";
import { renderMistakes } from "./render/mistakes.js";
import { renderLearning } from "./render/learning.js";
import { renderGlossaryFaq } from "./render/glossary.js";

const appRoot = document.querySelector("#app");
const sideNav = document.querySelector("#side-nav");
const statusBanner = document.querySelector("#status-banner");
const globalSearchInput = document.querySelector("#global-search");
const globalSearchButton = document.querySelector("#global-search-button");

function setStatus(message = "", type = "info") {
  if (!message) {
    statusBanner.hidden = true;
    statusBanner.textContent = "";
    statusBanner.className = "status-banner";
    return;
  }

  statusBanner.hidden = false;
  statusBanner.textContent = message;
  statusBanner.className = `status-banner status-${type}`;
}

function setupDerivedState() {
  state.derived.relationIndex = buildRelationIndex(state.data.relations);
  state.derived.stats = {
    products: state.data.products.length,
    factories: state.data.factories.length,
    destinations: state.data.destinations.length,
    relations: state.data.relations.length,
  };
}

function renderSideNav() {
  const items = [
    ["トップ", "#/top"],
    ["商品一覧", "#/products"],
    ["工場一覧", "#/factories"],
    ["仕向け先一覧", "#/destinations"],
    ["関係マップ", "#/map"],
    ["よくある間違い", "#/mistakes"],
    ["学習モード", "#/learning"],
    ["用語集 / FAQ", "#/glossary"],
  ];

  sideNav.innerHTML = `
    <div class="tags">
      ${items.map(([label, href]) => `<a class="pill-link" href="${href}">${label}</a>`).join("")}
    </div>
  `;
}

function getById(collection, id) {
  return collection.find((item) => item.id === id) ?? null;
}

function relationsFor(routeName, id) {
  const index = state.derived.relationIndex;

  if (routeName === "products") {
    return index.byProduct.get(id) ?? [];
  }

  if (routeName === "factories") {
    return index.byFactory.get(id) ?? [];
  }

  if (routeName === "destinations") {
    return index.byDestination.get(id) ?? [];
  }

  return [];
}

function renderRoute() {
  const route = state.ui.route;
  setStatus();

  switch (route.name) {
    case "top":
      appRoot.innerHTML = renderTop({ stats: state.derived.stats });
      break;
    case "products": {
      if (route.id) {
        const product = getById(state.data.products, route.id);
        if (!product) {
          setStatus("商品が見つかりません。", "warn");
          navigateTo("products");
          return;
        }

        const relations = relationsFor("products", route.id);
        const factories = relatedIds(relations, "factoryId").map((id) => getById(state.data.factories, id)).filter(Boolean);
        const destinations = relatedIds(relations, "destinationId").map((id) => getById(state.data.destinations, id)).filter(Boolean);
        const mistakes = state.data.mistakes.filter((item) => item.relatedProductIds?.includes(route.id));

        appRoot.innerHTML = renderProductDetail({ product, factories, destinations, mistakes });
        break;
      }

      const categories = [...new Set(state.data.products.map((product) => product.category).filter(Boolean))];
      const products = filterProducts(state.data.products, state.ui.filters.products);
      appRoot.innerHTML = renderProductList({ products, categories, filter: state.ui.filters.products });
      break;
    }
    case "factories": {
      if (route.id) {
        const factory = getById(state.data.factories, route.id);
        if (!factory) {
          setStatus("工場が見つかりません。", "warn");
          navigateTo("factories");
          return;
        }

        const relations = relationsFor("factories", route.id);
        const products = relatedIds(relations, "productId").map((id) => getById(state.data.products, id)).filter(Boolean);
        const destinations = relatedIds(relations, "destinationId").map((id) => getById(state.data.destinations, id)).filter(Boolean);

        appRoot.innerHTML = renderFactoryDetail({ factory, products, destinations });
        break;
      }

      const factories = filterFactories(state.data.factories, state.ui.filters.factories);
      appRoot.innerHTML = renderFactoryList({ factories, filter: state.ui.filters.factories });
      break;
    }
    case "destinations": {
      if (route.id) {
        const destination = getById(state.data.destinations, route.id);
        if (!destination) {
          setStatus("仕向け先が見つかりません。", "warn");
          navigateTo("destinations");
          return;
        }

        const relations = relationsFor("destinations", route.id);
        const products = relatedIds(relations, "productId").map((id) => getById(state.data.products, id)).filter(Boolean);
        const factories = relatedIds(relations, "factoryId").map((id) => getById(state.data.factories, id)).filter(Boolean);

        appRoot.innerHTML = renderDestinationDetail({ destination, products, factories });
        break;
      }

      const destinations = filterDestinations(state.data.destinations, state.ui.filters.destinations);
      appRoot.innerHTML = renderDestinationList({ destinations, filter: state.ui.filters.destinations });
      break;
    }
    case "map":
      appRoot.innerHTML = renderMap(state.data);
      break;
    case "mistakes":
      appRoot.innerHTML = renderMistakes(state.data);
      break;
    case "learning":
      appRoot.innerHTML = renderLearning({
        products: state.data.products,
        progress: state.ui.learningProgress,
        quiz: state.data.quiz,
      });
      break;
    case "glossary":
      appRoot.innerHTML = renderGlossaryFaq(state.data);
      break;
    default:
      navigateTo("top");
  }
}

function syncRoute() {
  state.ui.route = parseRoute();
  renderRoute();
}

function bindGlobalSearch() {
  const submitSearch = () => {
    const keyword = globalSearchInput.value.trim();
    state.ui.globalKeyword = keyword;
    state.ui.filters.products.keyword = keyword;
    state.ui.filters.factories.keyword = keyword;
    state.ui.filters.destinations.keyword = keyword;
    navigateTo("products");
  };

  globalSearchButton.addEventListener("click", submitSearch);
  globalSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submitSearch();
    }
  });
}

function handleInputEvents(event) {
  const { target } = event;

  if (target.id === "products-keyword") {
    state.ui.filters.products.keyword = target.value;
    renderRoute();
  }

  if (target.id === "products-category") {
    state.ui.filters.products.category = target.value;
    renderRoute();
  }

  if (target.id === "products-sort") {
    state.ui.filters.products.sort = target.value;
    renderRoute();
  }

  if (target.id === "factories-keyword") {
    state.ui.filters.factories.keyword = target.value;
    renderRoute();
  }

  if (target.id === "destinations-keyword") {
    state.ui.filters.destinations.keyword = target.value;
    renderRoute();
  }
}

function handleClickEvents(event) {
  const progressId = event.target.getAttribute("data-progress-id");
  if (progressId) {
    const nextProgress = new Set(state.ui.learningProgress);
    if (nextProgress.has(progressId)) {
      nextProgress.delete(progressId);
    } else {
      nextProgress.add(progressId);
    }

    state.ui.learningProgress = [...nextProgress];
    saveLearningProgress(state.ui.learningProgress);
    renderRoute();
    return;
  }

  const quizAnswer = event.target.getAttribute("data-quiz-answer");
  if (quizAnswer !== null) {
    const result = document.querySelector("#quiz-result");
    const question = state.data.quiz[0];
    const isCorrect = Number(quizAnswer) === question.answerIndex;
    result.textContent = isCorrect
      ? `正解: ${question.explanation}`
      : `不正解: ${question.explanation}`;
  }
}

async function bootstrap() {
  try {
    state.data = await loadAllData();
    state.ui.learningProgress = loadLearningProgress();
    setupDerivedState();
    renderSideNav();
    bindGlobalSearch();
    window.addEventListener("hashchange", syncRoute);
    document.addEventListener("input", handleInputEvents);
    document.addEventListener("click", handleClickEvents);

    if (!window.location.hash) {
      navigateTo("top");
      return;
    }

    syncRoute();
  } catch (error) {
    setStatus(error.message, "warn");
    appRoot.innerHTML = `
      <section class="panel">
        <h2>初期化に失敗しました</h2>
        <p>${error.message}</p>
        <p class="muted">JSON ファイルの存在、ファイル名、ローカル配信環境を確認してください。</p>
      </section>
    `;
  }
}

bootstrap();
