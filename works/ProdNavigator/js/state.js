export const state = {
  data: {
    products: [],
    factories: [],
    destinations: [],
    relations: [],
    mistakes: [],
    quiz: [],
    glossary: [],
    faq: [],
  },
  derived: {
    relationIndex: {
      byProduct: new Map(),
      byFactory: new Map(),
      byDestination: new Map(),
    },
    stats: {
      products: 0,
      factories: 0,
      destinations: 0,
      relations: 0,
    },
  },
  ui: {
    globalKeyword: "",
    route: { name: "top", id: null },
    filters: {
      products: { keyword: "", category: "all", sort: "name" },
      factories: { keyword: "", sort: "name" },
      destinations: { keyword: "", sort: "name" },
    },
    learningProgress: [],
  },
};
