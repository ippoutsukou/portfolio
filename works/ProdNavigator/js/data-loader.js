const DATA_FILES = {
  products: "./data/products.json",
  factories: "./data/factories.json",
  destinations: "./data/destinations.json",
  relations: "./data/relations.json",
  mistakes: "./data/mistakes.json",
  quiz: "./data/quiz.json",
  glossary: "./data/glossary.json",
  faq: "./data/faq.json",
};

function ensureArray(name, value) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} は配列である必要があります。`);
  }

  return value;
}

export async function loadAllData() {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, path]) => {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`${path} の読み込みに失敗しました。`);
      }

      const json = await response.json();
      return [key, ensureArray(key, json)];
    }),
  );

  return Object.fromEntries(entries);
}
