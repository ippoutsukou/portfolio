export function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [name = "top", id = ""] = hash.split("/");
  return { name: name || "top", id: id || null };
}

export function navigateTo(name, id = null) {
  const nextHash = id ? `#/${name}/${id}` : `#/${name}`;
  if (window.location.hash === nextHash) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }

  window.location.hash = nextHash;
}
