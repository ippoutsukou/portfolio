const historyStatus = document.querySelector("#history-status");
const historyTable = document.querySelector("#batch-history-table");
const historyBody = document.querySelector("#batch-history-body");
const historyDetailStatus = document.querySelector("#history-detail-status");
const historyDetail = document.querySelector("#batch-history-detail");

const loadHistoryDetail = async (requestId) => {
  historyDetailStatus.textContent = "詳細を読み込み中です...";
  try {
    const response = await fetch(`/history/batch/${requestId}`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.detail || "履歴詳細の取得に失敗しました。");
    }

    const lines = body.lines
      .map(
        (line) => `
          <li>${line.line_id} / ${line.action} / ${line.item_name} / 候補: ${line.best_candidate_name || line.best_candidate || "なし"} / 成立: ${line.feasible ? "はい" : "いいえ"} / 不足: ${line.shortage_quantity}</li>
        `
      )
      .join("");
    const allocations = body.allocations
      .map((allocation) => `<li>${allocation.line_id} / ${allocation.warehouse_id} / ${allocation.quantity}</li>`)
      .join("");
    const warnings = (body.warnings || []).map((warning) => `<li>${warning}</li>`).join("");

    historyDetail.innerHTML = `
      <section class="line-result-card">
        <h3>${body.request_id} / ${body.request_name || "未設定"}</h3>
        <p class="candidate-meta">成立可否: ${body.feasible ? "成立" : "不足あり"}</p>
        <p class="candidate-meta">警告数: ${body.warning_count}</p>
        <div class="result-columns">
          <div>
            <h4>明細</h4>
            <ul class="reason-list">${lines}</ul>
          </div>
          <div>
            <h4>割当</h4>
            <ul class="reason-list">${allocations || "<li>割当なし</li>"}</ul>
          </div>
          <div>
            <h4>警告</h4>
            ${warnings ? `<ul class="reason-list">${warnings}</ul>` : '<p class="empty">警告なし</p>'}
          </div>
        </div>
      </section>
    `;
    historyDetailStatus.textContent = "詳細を表示中です。";
  } catch (error) {
    historyDetailStatus.textContent = error.message || "履歴詳細の取得に失敗しました。";
    historyDetail.innerHTML = "";
  }
};

const loadHistoryList = async () => {
  if (!historyTable || !historyBody) {
    return;
  }

  historyStatus.textContent = "読み込み中です...";
  try {
    const endpoint = historyTable.dataset.endpoint || "/history/batch";
    const response = await fetch(endpoint);
    const body = await response.json();
    if (!response.ok) {
      throw new Error("履歴一覧の取得に失敗しました。");
    }

    historyBody.innerHTML = "";
    body.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "summary-row";
      tr.innerHTML = `
        <td>${row.request_id}</td>
        <td>${row.request_name || ""}</td>
        <td>${row.feasible ? "成立" : "不足あり"}</td>
        <td>${row.warning_count}</td>
        <td>${row.line_count}</td>
        <td>${row.allocation_count}</td>
        <td>${row.created_at}</td>
      `;
      tr.addEventListener("click", () => loadHistoryDetail(row.request_id));
      historyBody.appendChild(tr);
    });

    historyStatus.textContent = "読み込み完了";
    if (body[0]) {
      loadHistoryDetail(body[0].request_id);
    }
  } catch (error) {
    historyStatus.textContent = error.message || "履歴一覧の取得に失敗しました。";
  }
};

loadHistoryList();
