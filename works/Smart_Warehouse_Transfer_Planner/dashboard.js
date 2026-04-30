const dashboardStatus = document.querySelector("#dashboard-status");
const summaryTable = document.querySelector("#warehouse-summary-table");
const summaryBody = document.querySelector("#warehouse-summary-body");
const planCoverageLabels = document.querySelectorAll(".plan-coverage-label");
const warehouseItemStatus = document.querySelector("#warehouse-item-status");
const warehouseItemTitle = document.querySelector("#warehouse-item-title");
const warehouseItemTable = document.querySelector("#warehouse-item-table");
const warehouseItemBody = document.querySelector("#warehouse-item-body");
const warehousePlanStatus = document.querySelector("#warehouse-plan-status");
const warehousePlanTitle = document.querySelector("#warehouse-plan-title");
const warehousePlanChart = document.querySelector("#warehouse-plan-chart");
const warehousePlanTooltip = document.querySelector("#warehouse-plan-tooltip");

const formatNumber = (value) => Number(value).toFixed(1);
const formatRate = (value) => `${(Number(value) * 100).toFixed(1)}%`;
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
  text: "#2f261d",
};

let currentPlanPoints = [];
let currentChartLayout = null;
let hoveredPlanIndex = null;
let hoveredBarKey = null;

const hideWarehousePlanTooltip = () => {
  hoveredPlanIndex = null;
  hoveredBarKey = null;
  if (warehousePlanTooltip) {
    warehousePlanTooltip.hidden = true;
  }
  if (currentPlanPoints.length) {
    drawWarehousePlanChart(currentPlanPoints);
  }
};

const showWarehousePlanTooltipForHover = (point, x, y, bar = null) => {
  if (!warehousePlanTooltip || !warehousePlanChart) {
    return;
  }

  if (bar) {
    const itemRows = (bar.items || [])
      .map(
        (item) => `<dt>${escapeHtml(item.item_name)}</dt><dd>${formatNumber(item.qty)}</dd>`
      )
      .join("");
    warehousePlanTooltip.innerHTML = `
      <strong>${point.date}</strong>
      <dl>
        <dt>${bar.label}</dt><dd>${formatNumber(bar.value)}</dd>
        <dt>在庫数量</dt><dd>${formatNumber(point.stock_qty)}</dd>
        ${itemRows}
      </dl>
    `;
  } else {
    warehousePlanTooltip.innerHTML = `
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
  warehousePlanTooltip.hidden = false;

  const shell = warehousePlanChart.parentElement;
  const shellRect = shell.getBoundingClientRect();
  const tooltipRect = warehousePlanTooltip.getBoundingClientRect();
  const canvasRect = warehousePlanChart.getBoundingClientRect();
  const leftInShell = canvasRect.left - shellRect.left + x * (canvasRect.width / warehousePlanChart.width);
  const topInShell = canvasRect.top - shellRect.top + y * (canvasRect.height / warehousePlanChart.height);
  const maxLeft = shell.clientWidth - tooltipRect.width - 8;
  const nextLeft = Math.min(Math.max(leftInShell + 14, 8), Math.max(maxLeft, 8));
  const nextTop = Math.max(topInShell - tooltipRect.height - 12, 8);

  warehousePlanTooltip.style.left = `${nextLeft}px`;
  warehousePlanTooltip.style.top = `${nextTop}px`;
};

const drawEmptyChart = (message) => {
  if (!warehousePlanChart) {
    return;
  }

  const context = warehousePlanChart.getContext("2d");
  context.clearRect(0, 0, warehousePlanChart.width, warehousePlanChart.height);
  context.fillStyle = chartColors.axis;
  context.font = "16px sans-serif";
  context.textAlign = "center";
  context.fillText(message, warehousePlanChart.width / 2, warehousePlanChart.height / 2);
  currentPlanPoints = [];
  currentChartLayout = null;
  if (warehousePlanTooltip) {
    warehousePlanTooltip.hidden = true;
  }
};

const drawWarehousePlanChart = (points, hoverIndex = hoveredPlanIndex) => {
  if (!warehousePlanChart) {
    return;
  }

  if (!points.length) {
    drawEmptyChart("有効計画データがありません。");
    return;
  }

  const context = warehousePlanChart.getContext("2d");
  const width = warehousePlanChart.width;
  const height = warehousePlanChart.height;
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

  currentPlanPoints = points;
  currentChartLayout = {
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
        items: point.transfer_in_items || [],
        color: chartColors.transferIn,
        offset: -barWidth,
      },
      {
        type: "transferOut",
        label: "移動出庫",
        value: point.transfer_out_qty,
        items: point.transfer_out_items || [],
        color: chartColors.transferOut,
        offset: 0,
      },
      {
        type: "disposal",
        label: "廃却",
        value: point.disposal_qty,
        items: point.disposal_items || [],
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
        items: bar.items,
        x: x - barWidth / 2 + bar.offset,
        y: baseY - barHeight,
        width: barWidth * 0.82,
        height: barHeight,
      };
      barRects.push(rect);
      context.fillStyle = bar.color;
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
      if (hoveredBarKey === rect.key) {
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

  points.forEach((point, index) => {
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

const updateWarehousePlanHover = (event) => {
  if (!warehousePlanChart || !currentChartLayout || !currentPlanPoints.length) {
    return;
  }

  const rect = warehousePlanChart.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (warehousePlanChart.width / rect.width);
  const y = (event.clientY - rect.top) * (warehousePlanChart.height / rect.height);

  if (
    x < currentChartLayout.left ||
    x > currentChartLayout.right ||
    y < currentChartLayout.top ||
    y > currentChartLayout.bottom
  ) {
    hideWarehousePlanTooltip();
    return;
  }

  const hoveredBar = currentChartLayout.barRects.find(
    (bar) =>
      bar.value > 0 &&
      x >= bar.x &&
      x <= bar.x + bar.width &&
      y >= bar.y &&
      y <= bar.y + bar.height
  );

  if (hoveredBar) {
    hoveredPlanIndex = hoveredBar.pointIndex;
    hoveredBarKey = hoveredBar.key;
    drawWarehousePlanChart(currentPlanPoints, hoveredBar.pointIndex);
    showWarehousePlanTooltipForHover(
      currentPlanPoints[hoveredBar.pointIndex],
      hoveredBar.x + hoveredBar.width / 2,
      hoveredBar.y,
      hoveredBar
    );
    return;
  }

  let nearestIndex = 0;
  let nearestDistance = Infinity;
  currentChartLayout.pointPositions.forEach((position, index) => {
    const distance = Math.abs(position.x - x);
    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  });

  if (nearestDistance > currentChartLayout.hoverThreshold) {
    hideWarehousePlanTooltip();
    return;
  }

  hoveredPlanIndex = nearestIndex;
  hoveredBarKey = null;
  drawWarehousePlanChart(currentPlanPoints, nearestIndex);
  const position = currentChartLayout.pointPositions[nearestIndex];
  showWarehousePlanTooltipForHover(currentPlanPoints[nearestIndex], position.x, position.y);
};

const loadWarehousePlans = async (warehouseId, warehouseName) => {
  if (!warehousePlanChart) {
    return;
  }

  warehousePlanStatus.textContent = "読み込み中です...";
  warehousePlanTitle.textContent = `${warehouseId} ${warehouseName}`;
  drawEmptyChart("読み込み中です...");

  try {
    const endpointTemplate =
      warehousePlanChart.dataset.endpointTemplate || "/dashboard/warehouses/{warehouse_id}/plans";
    const endpoint = endpointTemplate.replace("{warehouse_id}", warehouseId);
    const response = await fetch(endpoint);
    const body = await response.json();

    if (!response.ok) {
      throw new Error("倉庫別有効計画グラフの取得に失敗しました。");
    }

    hoveredPlanIndex = null;
    hoveredBarKey = null;
    if (warehousePlanTooltip) {
      warehousePlanTooltip.hidden = true;
    }
    drawWarehousePlanChart(body);
    warehousePlanStatus.textContent = "読み込み完了";
  } catch (error) {
    warehousePlanStatus.textContent =
      error.message || "倉庫別有効計画グラフの取得に失敗しました。";
    drawEmptyChart("グラフを表示できません。");
  }
};

const selectWarehouse = (warehouseId, warehouseName) => {
  loadWarehouseItems(warehouseId, warehouseName);
  loadWarehousePlans(warehouseId, warehouseName);
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

const loadWarehouseItems = async (warehouseId, warehouseName) => {
  if (!warehouseItemTable || !warehouseItemBody) {
    return;
  }

  warehouseItemStatus.textContent = "読み込み中です...";
  warehouseItemTitle.textContent = `${warehouseId} ${warehouseName}`;

  try {
    const endpointTemplate =
      warehouseItemTable.dataset.endpointTemplate || "/dashboard/warehouses/{warehouse_id}/items";
    const endpoint = endpointTemplate.replace("{warehouse_id}", warehouseId);
    const response = await fetch(endpoint);
    const body = await response.json();

    if (!response.ok) {
      throw new Error("倉庫別品目在庫の取得に失敗しました。");
    }

    warehouseItemBody.innerHTML = "";
    body.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.item_name}</td>
        <td>${formatNumber(item.effective_stock_qty)}</td>
        <td>${formatNumber(item.used_area)}</td>
        <td>${formatNumber(item.unit_area)}</td>
        <td>${item.stack_limit}</td>
      `;
      warehouseItemBody.appendChild(row);
    });

    warehouseItemStatus.textContent = "読み込み完了";
  } catch (error) {
    warehouseItemStatus.textContent = error.message || "倉庫別品目在庫の取得に失敗しました。";
  }
};

const loadWarehouseSummary = async () => {
  if (!summaryTable || !summaryBody) {
    return;
  }

  dashboardStatus.textContent = "読み込み中です...";
  loadPlanCoverage();

  try {
    const endpoint = summaryTable.dataset.endpoint || "/dashboard/warehouses";
    const response = await fetch(endpoint);
    const body = await response.json();

    if (!response.ok) {
      throw new Error("倉庫サマリーの取得に失敗しました。");
    }

    summaryBody.innerHTML = "";
    body.forEach((warehouse) => {
      const row = document.createElement("tr");
      row.className = "summary-row";
      row.addEventListener("click", () =>
        selectWarehouse(warehouse.warehouse_id, warehouse.warehouse_name)
      );
      row.innerHTML = `
        <td>${warehouse.warehouse_id}</td>
        <td>${warehouse.warehouse_name}</td>
        <td>${warehouse.warehouse_type}</td>
        <td>${warehouse.area_name ?? ""}</td>
        <td>${formatNumber(warehouse.used_area)}</td>
        <td>${formatNumber(warehouse.free_area)}</td>
        <td>${formatRate(warehouse.usage_rate)}</td>
        <td>${warehouse.item_count}</td>
      `;
      summaryBody.appendChild(row);
    });

    dashboardStatus.textContent = "読み込み完了";
    const first = body[0];
    if (first) {
      selectWarehouse(first.warehouse_id, first.warehouse_name);
    }
  } catch (error) {
    dashboardStatus.textContent = error.message || "倉庫サマリーの取得に失敗しました。";
  }
};

if (warehousePlanChart) {
  warehousePlanChart.addEventListener("mousemove", updateWarehousePlanHover);
  warehousePlanChart.addEventListener("mouseleave", hideWarehousePlanTooltip);
}

loadWarehouseSummary();
