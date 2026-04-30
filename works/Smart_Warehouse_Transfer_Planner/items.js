const itemSummaryStatus = document.querySelector("#item-summary-status");
const itemSummaryTable = document.querySelector("#item-summary-table");
const itemSummaryBody = document.querySelector("#item-summary-body");
const itemWarehouseStatus = document.querySelector("#item-warehouse-status");
const itemWarehouseTitle = document.querySelector("#item-warehouse-title");
const itemWarehouseTable = document.querySelector("#item-warehouse-table");
const itemWarehouseBody = document.querySelector("#item-warehouse-body");
const itemPlanStatus = document.querySelector("#item-plan-status");
const itemPlanTitle = document.querySelector("#item-plan-title");
const itemPlanChart = document.querySelector("#item-plan-chart");
const itemPlanTooltip = document.querySelector("#item-plan-tooltip");
const planCoverageLabels = document.querySelectorAll(".plan-coverage-label");

const formatNumber = (value) => Number(value).toFixed(1);
const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const chartColors = {
  stock: "#1f7a5c",
  transferIn: "#2d7ff9",
  transferOut: "#f59f00",
  disposal: "#d64550",
  axis: "#6f6254",
  grid: "rgba(111, 98, 84, 0.18)",
};

let currentItemPlanPoints = [];
let currentItemChartLayout = null;
let hoveredItemPlanIndex = null;
let hoveredItemBarKey = null;

const eventLabel = (event, type) => {
  if (type === "disposal") {
    return event.warehouse_name || event.warehouse_id || "倉庫未設定";
  }

  const fromName = event.from_warehouse_name || event.from_warehouse_id || "外部";
  const toName = event.to_warehouse_name || event.to_warehouse_id || "外部";
  return `${fromName} -> ${toName}`;
};

const hideItemPlanTooltip = () => {
  hoveredItemPlanIndex = null;
  hoveredItemBarKey = null;
  if (itemPlanTooltip) {
    itemPlanTooltip.hidden = true;
  }
  if (currentItemPlanPoints.length) {
    drawItemPlanChart(currentItemPlanPoints);
  }
};

const showItemPlanTooltip = (point, x, y, bar = null) => {
  if (!itemPlanTooltip || !itemPlanChart) {
    return;
  }

  if (bar) {
    const eventRows = (bar.events || [])
      .map(
        (event) =>
          `<dt>${escapeHtml(eventLabel(event, bar.type))}</dt><dd>${formatNumber(event.qty)}</dd>`
      )
      .join("");
    itemPlanTooltip.innerHTML = `
      <strong>${point.date}</strong>
      <dl>
        <dt>${bar.label}</dt><dd>${formatNumber(bar.value)}</dd>
        <dt>在庫数量</dt><dd>${formatNumber(point.stock_qty)}</dd>
        ${eventRows}
      </dl>
    `;
  } else {
    itemPlanTooltip.innerHTML = `
      <strong>${point.date}</strong>
      <dl>
        <dt>在庫数量</dt><dd>${formatNumber(point.stock_qty)}</dd>
        <dt>移動入庫</dt><dd>${formatNumber(point.transfer_in_qty)}</dd>
        <dt>移動出庫</dt><dd>${formatNumber(point.transfer_out_qty)}</dd>
        <dt>移動差分</dt><dd>${formatNumber(point.transfer_net_qty)}</dd>
        <dt>廃却</dt><dd>${formatNumber(point.disposal_qty)}</dd>
      </dl>
    `;
  }
  itemPlanTooltip.hidden = false;

  const shell = itemPlanChart.parentElement;
  const shellRect = shell.getBoundingClientRect();
  const tooltipRect = itemPlanTooltip.getBoundingClientRect();
  const canvasRect = itemPlanChart.getBoundingClientRect();
  const leftInShell = canvasRect.left - shellRect.left + x * (canvasRect.width / itemPlanChart.width);
  const topInShell = canvasRect.top - shellRect.top + y * (canvasRect.height / itemPlanChart.height);
  const maxLeft = shell.clientWidth - tooltipRect.width - 8;
  const nextLeft = Math.min(Math.max(leftInShell + 14, 8), Math.max(maxLeft, 8));
  const nextTop = Math.max(topInShell - tooltipRect.height - 12, 8);

  itemPlanTooltip.style.left = `${nextLeft}px`;
  itemPlanTooltip.style.top = `${nextTop}px`;
};

const drawEmptyItemChart = (message) => {
  if (!itemPlanChart) {
    return;
  }

  const context = itemPlanChart.getContext("2d");
  context.clearRect(0, 0, itemPlanChart.width, itemPlanChart.height);
  context.fillStyle = chartColors.axis;
  context.font = "16px sans-serif";
  context.textAlign = "center";
  context.fillText(message, itemPlanChart.width / 2, itemPlanChart.height / 2);
  currentItemPlanPoints = [];
  currentItemChartLayout = null;
  if (itemPlanTooltip) {
    itemPlanTooltip.hidden = true;
  }
};

const drawItemPlanChart = (points, hoverIndex = hoveredItemPlanIndex) => {
  if (!itemPlanChart) {
    return;
  }

  if (!points.length) {
    drawEmptyItemChart("有効計画データがありません。");
    return;
  }

  const context = itemPlanChart.getContext("2d");
  const width = itemPlanChart.width;
  const height = itemPlanChart.height;
  const padding = { top: 28, right: 28, bottom: 58, left: 64 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [
      Number(point.stock_qty),
      Number(point.disposal_qty),
      Number(point.transfer_in_qty),
      Number(point.transfer_out_qty),
    ])
  );
  const yMax = Math.ceil(maxValue * 1.15);
  const xStep = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
  const barGroupWidth = Math.min(56, Math.max(24, chartWidth / points.length / 1.8));
  const barWidth = barGroupWidth / 3;
  const xForIndex = (index) =>
    points.length > 1 ? padding.left + xStep * index : padding.left + chartWidth / 2;
  const yForValue = (value) => padding.top + chartHeight - (Number(value) / yMax) * chartHeight;
  const pointPositions = points.map((point, index) => ({
    x: xForIndex(index),
    y: yForValue(point.stock_qty),
  }));
  const barRects = [];

  currentItemPlanPoints = points;
  currentItemChartLayout = {
    left: padding.left,
    right: width - padding.right,
    top: padding.top,
    bottom: padding.top + chartHeight,
    pointPositions,
    barRects,
    hoverThreshold: Math.max(24, Math.min(64, xStep / 2)),
  };

  context.clearRect(0, 0, width, height);
  context.lineWidth = 1;
  context.font = "12px sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = (yMax / 4) * tick;
    const y = yForValue(value);
    context.strokeStyle = tick === 0 ? chartColors.axis : chartColors.grid;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillStyle = chartColors.axis;
    context.fillText(formatNumber(value), padding.left - 10, y);
  }

  points.forEach((point, index) => {
    const x = xForIndex(index);
    const baseY = yForValue(0);
    const values = [
      {
        type: "transferIn",
        label: "移動入庫",
        value: point.transfer_in_qty,
        events: point.transfer_in_events || [],
        color: chartColors.transferIn,
        offset: -barWidth,
      },
      {
        type: "transferOut",
        label: "移動出庫",
        value: point.transfer_out_qty,
        events: point.transfer_out_events || [],
        color: chartColors.transferOut,
        offset: 0,
      },
      {
        type: "disposal",
        label: "廃却",
        value: point.disposal_qty,
        events: point.disposal_events || [],
        color: chartColors.disposal,
        offset: barWidth,
      },
    ];

    values.forEach((bar) => {
      const barHeight = baseY - yForValue(bar.value);
      const rect = {
        key: `${index}-${bar.type}`,
        pointIndex: index,
        type: bar.type,
        label: bar.label,
        value: Number(bar.value),
        events: bar.events,
        x: x - barWidth / 2 + bar.offset,
        y: baseY - barHeight,
        width: barWidth * 0.82,
        height: barHeight,
      };
      barRects.push(rect);
      context.fillStyle = bar.color;
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
      if (hoveredItemBarKey === rect.key) {
        context.strokeStyle = "#2f261d";
        context.lineWidth = 2;
        context.strokeRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2);
      }
    });

    context.save();
    context.translate(x, height - padding.bottom + 28);
    context.rotate(points.length > 5 ? -Math.PI / 5 : 0);
    context.fillStyle = chartColors.axis;
    context.textAlign = points.length > 5 ? "right" : "center";
    context.textBaseline = "middle";
    context.fillText(point.date, 0, 0);
    context.restore();
  });

  context.strokeStyle = chartColors.stock;
  context.lineWidth = 3;
  context.beginPath();
  points.forEach((point, index) => {
    const x = xForIndex(index);
    const y = yForValue(point.stock_qty);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();

  points.forEach((_point, index) => {
    context.fillStyle = chartColors.stock;
    context.beginPath();
    context.arc(pointPositions[index].x, pointPositions[index].y, 4, 0, Math.PI * 2);
    context.fill();
  });

  if (hoverIndex !== null && points[hoverIndex]) {
    const position = pointPositions[hoverIndex];
    context.strokeStyle = "rgba(47, 38, 29, 0.42)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(position.x, padding.top);
    context.lineTo(position.x, padding.top + chartHeight);
    context.stroke();

    context.fillStyle = "#ffffff";
    context.strokeStyle = chartColors.stock;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(position.x, position.y, 7, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
};

const updateItemPlanHover = (event) => {
  if (!itemPlanChart || !currentItemChartLayout || !currentItemPlanPoints.length) {
    return;
  }

  const rect = itemPlanChart.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (itemPlanChart.width / rect.width);
  const y = (event.clientY - rect.top) * (itemPlanChart.height / rect.height);

  if (
    x < currentItemChartLayout.left ||
    x > currentItemChartLayout.right ||
    y < currentItemChartLayout.top ||
    y > currentItemChartLayout.bottom
  ) {
    hideItemPlanTooltip();
    return;
  }

  const hoveredBar = currentItemChartLayout.barRects.find(
    (bar) =>
      bar.value > 0 &&
      x >= bar.x &&
      x <= bar.x + bar.width &&
      y >= bar.y &&
      y <= bar.y + bar.height
  );

  if (hoveredBar) {
    hoveredItemPlanIndex = hoveredBar.pointIndex;
    hoveredItemBarKey = hoveredBar.key;
    drawItemPlanChart(currentItemPlanPoints, hoveredBar.pointIndex);
    showItemPlanTooltip(
      currentItemPlanPoints[hoveredBar.pointIndex],
      hoveredBar.x + hoveredBar.width / 2,
      hoveredBar.y,
      hoveredBar
    );
    return;
  }

  let nearestIndex = 0;
  let nearestDistance = Infinity;
  currentItemChartLayout.pointPositions.forEach((position, index) => {
    const distance = Math.abs(position.x - x);
    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  });

  if (nearestDistance > currentItemChartLayout.hoverThreshold) {
    hideItemPlanTooltip();
    return;
  }

  hoveredItemPlanIndex = nearestIndex;
  hoveredItemBarKey = null;
  drawItemPlanChart(currentItemPlanPoints, nearestIndex);
  const position = currentItemChartLayout.pointPositions[nearestIndex];
  showItemPlanTooltip(currentItemPlanPoints[nearestIndex], position.x, position.y);
};

const loadPlanCoverage = async () => {
  if (!planCoverageLabels.length) {
    return;
  }

  planCoverageLabels.forEach((label) => {
    label.textContent = "有効計画反映状況を確認中です。";
  });

  try {
    const endpoint = planCoverageLabels[0].dataset.endpoint || "/dashboard/plans/coverage";
    const response = await fetch(endpoint);
    const body = await response.json();

    if (!response.ok) {
      throw new Error("有効計画反映状況の取得に失敗しました。");
    }

    const message = body.has_active_plans
      ? `有効計画反映済み: ${body.reflected_until} まで`
      : "有効計画なし";
    planCoverageLabels.forEach((label) => {
      label.textContent = message;
    });
  } catch (error) {
    const message = error.message || "有効計画反映状況の取得に失敗しました。";
    planCoverageLabels.forEach((label) => {
      label.textContent = message;
    });
  }
};

const loadItemWarehouses = async (itemName) => {
  itemWarehouseStatus.textContent = "読み込み中です...";
  itemWarehouseTitle.textContent = itemName;

  try {
    const endpointTemplate =
      itemWarehouseTable.dataset.endpointTemplate || "/dashboard/items/{item_name}/warehouses";
    const endpoint = endpointTemplate.replace("{item_name}", encodeURIComponent(itemName));
    const response = await fetch(endpoint);
    const body = await response.json();

    if (!response.ok) {
      throw new Error("倉庫別保管内訳の取得に失敗しました。");
    }

    itemWarehouseBody.innerHTML = "";
    body.forEach((warehouse) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${warehouse.warehouse_id}</td>
        <td>${escapeHtml(warehouse.warehouse_name)}</td>
        <td>${warehouse.warehouse_type}</td>
        <td>${warehouse.area_name ?? ""}</td>
        <td>${formatNumber(warehouse.effective_stock_qty)}</td>
        <td>${formatNumber(warehouse.used_area)}</td>
      `;
      itemWarehouseBody.appendChild(row);
    });

    itemWarehouseStatus.textContent = "読み込み完了";
  } catch (error) {
    itemWarehouseStatus.textContent = error.message || "倉庫別保管内訳の取得に失敗しました。";
  }
};

const loadItemPlans = async (itemName) => {
  itemPlanStatus.textContent = "読み込み中です...";
  itemPlanTitle.textContent = itemName;
  drawEmptyItemChart("読み込み中です...");

  try {
    const endpointTemplate =
      itemPlanChart.dataset.endpointTemplate || "/dashboard/items/{item_name}/plans";
    const endpoint = endpointTemplate.replace("{item_name}", encodeURIComponent(itemName));
    const response = await fetch(endpoint);
    const body = await response.json();

    if (!response.ok) {
      throw new Error("品目別有効計画グラフの取得に失敗しました。");
    }

    hoveredItemPlanIndex = null;
    hoveredItemBarKey = null;
    if (itemPlanTooltip) {
      itemPlanTooltip.hidden = true;
    }
    drawItemPlanChart(body);
    itemPlanStatus.textContent = "読み込み完了";
  } catch (error) {
    itemPlanStatus.textContent = error.message || "品目別有効計画グラフの取得に失敗しました。";
    drawEmptyItemChart("グラフを表示できません。");
  }
};

const selectItem = (itemName) => {
  loadItemWarehouses(itemName);
  loadItemPlans(itemName);
};

const loadItemSummary = async () => {
  if (!itemSummaryTable || !itemSummaryBody) {
    return;
  }

  itemSummaryStatus.textContent = "読み込み中です...";
  loadPlanCoverage();

  try {
    const endpoint = itemSummaryTable.dataset.endpoint || "/dashboard/items/summary";
    const response = await fetch(endpoint);
    const body = await response.json();

    if (!response.ok) {
      throw new Error("品目別サマリーの取得に失敗しました。");
    }

    itemSummaryBody.innerHTML = "";
    body.forEach((item) => {
      const row = document.createElement("tr");
      row.className = "summary-row";
      row.addEventListener("click", () => selectItem(item.item_name));
      row.innerHTML = `
        <td>${escapeHtml(item.item_name)}</td>
        <td>${formatNumber(item.effective_stock_qty)}</td>
        <td>${formatNumber(item.used_area)}</td>
        <td>${item.warehouse_count}</td>
        <td>${formatNumber(item.unit_area)}</td>
        <td>${item.stack_limit}</td>
      `;
      itemSummaryBody.appendChild(row);
    });

    itemSummaryStatus.textContent = "読み込み完了";
    if (body[0]) {
      selectItem(body[0].item_name);
    }
  } catch (error) {
    itemSummaryStatus.textContent = error.message || "品目別サマリーの取得に失敗しました。";
  }
};

if (itemPlanChart) {
  itemPlanChart.addEventListener("mousemove", updateItemPlanHover);
  itemPlanChart.addEventListener("mouseleave", hideItemPlanTooltip);
}

loadItemSummary();
