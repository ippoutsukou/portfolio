function pushToIndex(map, key, value) {
  if (!map.has(key)) {
    map.set(key, []);
  }

  map.get(key).push(value);
}

export function buildRelationIndex(relations) {
  const byProduct = new Map();
  const byFactory = new Map();
  const byDestination = new Map();

  relations.forEach((relation) => {
    pushToIndex(byProduct, relation.productId, relation);
    pushToIndex(byFactory, relation.factoryId, relation);
    pushToIndex(byDestination, relation.destinationId, relation);
  });

  return { byProduct, byFactory, byDestination };
}

export function relatedIds(relations, key) {
  return [...new Set(relations.map((relation) => relation[key]).filter(Boolean))];
}
