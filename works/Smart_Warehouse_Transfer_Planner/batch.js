const batchForm = document.querySelector("#batch-form");
const lineItems = document.querySelector("#line-items");
const addLineButton = document.querySelector("#add-line-button");
const batchStatusMessage = document.querySelector("#batch-status-message");
const batchSummary = document.querySelector("#batch-summary");
const batchLineResults = document.querySelector("#batch-line-results");

let lineCounter = 0;

const readResponseBody = async (response) => {
  const rawText = await response.text();
  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return { detail: rawText };
  }
};

const createLineItem = (defaults = {}) => {
  lineCounter += 1;
  const wrapper = document.createElement("section");
  wrapper.className = "line-item";
  wrapper.innerHTML = `
    <div class="line-item-header">
      <h3>明細 ${lineCounter}</h3>
      <button type="button" class="ghost-button remove-line-button">削除</button>
    </div>
    <div class="line-item-grid">
      <label>
        <span>明細ID</span>
        <input name="line_id" type="text" value="${defaults.line_id || `L${String(lineCounter).padStart(3, "0")}`}" required maxlength="64" />
      </label>
      <label>
        <span>搬送区分</span>
        <select name="action" required>
          <option value="搬出" ${defaults.action === "搬出" ? "selected" : ""}>搬出</option>
          <option value="搬入" ${defaults.action === "搬入" ? "selected" : ""}>搬入</option>
        </select>
      </label>
      <label>
        <span>品目</span>
        <input name="item_name" type="text" value="${defaults.item_name || "A品"}" required maxlength="255" />
      </label>
      <label>
        <span>数量</span>
        <input name="quantity" type="number" min="0.01" step="0.01" value="${defaults.quantity || 30}" required />
      </label>
      <label>
        <span>行先 / 対象拠点</span>
        <input name="destination" type="text" value="${defaults.destination || "東京"}" required maxlength="255" />
      </label>
    </div>
  `;

  wrapper.querySelector(".remove-line-button").addEventListener("click", () => {
    wrapper.remove();
  });
  lineItems.appendChild(wrapper);
};

const readLines = () =>
  Array.from(lineItems.querySelectorAll(".line-item")).map((line) => ({
    line_id: line.querySelector('[name="line_id"]').value.trim(),
    action: line.querySelector('[name="action"]').value,
    item_name: line.querySelector('[name="item_name"]').value.trim(),
    quantity: Number(line.querySelector('[name="quantity"]').value),
    destination: line.querySelector('[name="destination"]').value.trim(),
  }));

const renderBatchSummary = (body) => {
  const warnings = (body.warnings || []).map((warning) => `<li>${warning}</li>`).join("");
  batchSummary.innerHTML = `
    <p class="candidate-meta">依頼ID: ${body.request_id}</p>
    <p class="candidate-meta">依頼名: ${body.request_name || "未設定"}</p>
    <p class="candidate-meta">成立可否: ${body.feasible ? "成立" : "不足あり"}</p>
    ${warnings ? `<ul class="reason-list">${warnings}</ul>` : '<p class="empty">警告はありません。</p>'}
  `;
};

const renderLineResults = (lines) => {
  batchLineResults.innerHTML = "";

  lines.forEach((line) => {
    const card = document.createElement("section");
    card.className = "line-result-card";

    const allocations = (line.allocations || [])
      .map((allocation) => `<li>${allocation.warehouse_id}: ${allocation.quantity}</li>`)
      .join("");
    const candidates = (line.candidates || [])
      .slice(0, 3)
      .map((candidate) => `<li>${candidate.warehouse_name} (${candidate.warehouse_id}) / ${candidate.score}点</li>`)
      .join("");

    card.innerHTML = `
      <h4>${line.line_id} / ${line.action} / ${line.item_name}</h4>
      <p class="candidate-meta">数量: ${line.quantity} / 行先: ${line.destination}</p>
      <p class="candidate-meta">成立可否: ${line.feasible ? "成立" : "不足あり"}</p>
      <p class="candidate-meta">不足量: ${line.shortage_quantity}</p>
      <div class="result-columns">
        <div>
          <h5>割当</h5>
          ${allocations ? `<ul class="reason-list">${allocations}</ul>` : '<p class="empty">割当なし</p>'}
        </div>
        <div>
          <h5>候補上位</h5>
          ${candidates ? `<ul class="reason-list">${candidates}</ul>` : '<p class="empty">候補なし</p>'}
        </div>
      </div>
    `;

    batchLineResults.appendChild(card);
  });
};

addLineButton?.addEventListener("click", () => createLineItem());

batchForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const endpoint = batchForm.dataset.endpoint || "/warehouse-judge/batch";
  const payload = {
    request_id: batchForm.querySelector('[name="request_id"]').value.trim(),
    request_name: batchForm.querySelector('[name="request_name"]').value.trim(),
    lines: readLines(),
  };

  batchStatusMessage.textContent = "一括判定中です...";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await readResponseBody(response);
    if (!response.ok) {
      throw new Error(body.detail || "一括判定に失敗しました。");
    }

    batchStatusMessage.textContent = "一括判定が完了しました。";
    renderBatchSummary(body);
    renderLineResults(body.lines || []);
  } catch (error) {
    batchStatusMessage.textContent = error.message || "一括判定に失敗しました。";
    batchSummary.innerHTML = '<p class="empty">結果を表示できませんでした。</p>';
    batchLineResults.innerHTML = "";
  }
});

createLineItem({ line_id: "L001", action: "搬出", item_name: "A品", quantity: 60, destination: "東京" });
createLineItem({ line_id: "L002", action: "搬入", item_name: "A品", quantity: 300, destination: "東京" });
