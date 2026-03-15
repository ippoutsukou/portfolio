function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function compareBy(sortKey) {
  return (a, b) => normalize(a[sortKey]).localeCompare(normalize(b[sortKey]), "ja");
}

export function filterProducts(products, filter) {
  const keyword = normalize(filter.keyword);
  const category = filter.category;

  let rows = products.filter((product) => {
    const matchesKeyword = !keyword
      || normalize(product.name).includes(keyword)
      || normalize(product.code).includes(keyword)
      || normalize(product.description).includes(keyword);

    const matchesCategory = category === "all" || product.category === category;
    return matchesKeyword && matchesCategory;
  });

  rows = rows.toSorted(compareBy(filter.sort === "code" ? "code" : "name"));
  return rows;
}

export function filterFactories(factories, filter) {
  const keyword = normalize(filter.keyword);
  return factories
    .filter((factory) => !keyword
      || normalize(factory.name).includes(keyword)
      || normalize(factory.location).includes(keyword)
      || normalize(factory.description).includes(keyword))
    .toSorted(compareBy("name"));
}

export function filterDestinations(destinations, filter) {
  const keyword = normalize(filter.keyword);
  return destinations
    .filter((destination) => !keyword
      || normalize(destination.name).includes(keyword)
      || normalize(destination.region).includes(keyword)
      || normalize(destination.description).includes(keyword))
    .toSorted(compareBy("name"));
}
