const form = document.querySelector("#judge-form");
const statusMessage = document.querySelector("#status-message");
const bestCandidate = document.querySelector("#best-candidate");
const candidateList = document.querySelector("#candidate-list");

const renderBestCandidate = (candidate) => {
  if (!candidate) {
    bestCandidate.innerHTML = `
      <h3>第1候補</h3>
      <p class="empty">候補が見つかりませんでした。</p>
    `;
    return;
  }

  const reasons = (candidate.reasons || [])
    .map((reason) => `<li>${reason}</li>`)
    .join("");

  bestCandidate.innerHTML = `
    <h3>第1候補</h3>
    <p class="candidate-name">${candidate.warehouse_name}</p>
    <p class="candidate-meta">${candidate.warehouse_id} / ${candidate.warehouse_type} / ${candidate.score}点</p>
    <ul class="reason-list">${reasons}</ul>
  `;
};

const renderCandidates = (candidates) => {
  candidateList.innerHTML = "";

  candidates.slice(0, 3).forEach((candidate) => {
    const item = document.createElement("li");
    item.className = "candidate-item";
    item.textContent = `${candidate.warehouse_name} (${candidate.warehouse_id}) / ${candidate.score}点`;
    candidateList.appendChild(item);
  });
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const endpoint = form.dataset.endpoint || "/warehouse-judge";

  const formData = new FormData(form);
  const payload = {
    action: formData.get("action"),
    item_name: String(formData.get("item_name") || "").trim(),
    quantity: Number(formData.get("quantity")),
    destination: String(formData.get("destination") || "").trim(),
    requested_date: formData.get("requested_date"),
  };

  statusMessage.textContent = "判定中です...";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.detail || "判定に失敗しました。");
    }

    statusMessage.textContent = "判定が完了しました。";
    renderBestCandidate(body.best_candidate);
    renderCandidates(body.candidates || []);
  } catch (error) {
    statusMessage.textContent = error.message || "判定に失敗しました。";
    renderBestCandidate(null);
    candidateList.innerHTML = "";
  }
});
