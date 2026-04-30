// Smart Warehouse Transfer Planner - GitHub Pages デモ用
// window.fetch を上書きして、固定値データから API レスポンスを返す。
// 既存の web/*.js は無修正で動作する。

(() => {
  const data = window.MOCK_DATA;
  if (!data) {
    console.error("mock-data.js が読み込まれていません。");
    return;
  }

  const VALID_PLAN_STATUSES = new Set(["planned", "fixed"]);

  // -- 派生計算ユーティリティ --

  const itemByName = (name) => data.items.find((it) => it.item_name === name) || null;
  const warehouseById = (id) => data.warehouses.find((wh) => wh.warehouse_id === id) || null;

  const effectiveStockQty = (warehouseId, itemName) => {
    const baseRow = data.stockCurrent.find(
      (row) => row.warehouse_id === warehouseId && row.item_name === itemName
    );
    let qty = baseRow ? baseRow.stock_qty : 0;
    data.transferPlans.forEach((plan) => {
      if (!VALID_PLAN_STATUSES.has(plan.status) || plan.item_name !== itemName) return;
      if (plan.from_warehouse_id === warehouseId) qty -= plan.qty;
      if (plan.to_warehouse_id === warehouseId) qty += plan.qty;
    });
    data.disposalPlans.forEach((plan) => {
      if (!VALID_PLAN_STATUSES.has(plan.status)) return;
      if (plan.warehouse_id === warehouseId && plan.item_name === itemName) qty -= plan.qty;
    });
    return Math.max(0, qty);
  };

  const usedAreaForWarehouseItem = (warehouseId, itemName) => {
    const item = itemByName(itemName);
    if (!item) return 0;
    const qty = effectiveStockQty(warehouseId, itemName);
    if (qty <= 0) return 0;
    const piles = Math.ceil(qty / item.stack_limit);
    return piles * item.unit_area;
  };

  const itemNamesInWarehouse = (warehouseId) => {
    const names = new Set();
    data.stockCurrent
      .filter((row) => row.warehouse_id === warehouseId)
      .forEach((row) => names.add(row.item_name));
    data.transferPlans
      .filter((p) => VALID_PLAN_STATUSES.has(p.status) && p.to_warehouse_id === warehouseId)
      .forEach((p) => names.add(p.item_name));
    return Array.from(names);
  };

  const warehouseUsedArea = (warehouseId) =>
    itemNamesInWarehouse(warehouseId)
      .map((name) => usedAreaForWarehouseItem(warehouseId, name))
      .reduce((a, b) => a + b, 0);

  const warehouseSummaries = () =>
    data.warehouses.map((wh) => {
      const used = warehouseUsedArea(wh.warehouse_id);
      const items = itemNamesInWarehouse(wh.warehouse_id).filter(
        (name) => effectiveStockQty(wh.warehouse_id, name) > 0
      );
      return {
        warehouse_id: wh.warehouse_id,
        warehouse_name: wh.warehouse_name,
        warehouse_type: wh.warehouse_type,
        area_name: wh.area_name,
        max_area: wh.max_area,
        used_area: used,
        free_area: wh.max_area - used,
        usage_rate: wh.max_area > 0 ? used / wh.max_area : 0,
        item_count: items.length,
      };
    });

  const warehouseItemBreakdown = (warehouseId) =>
    itemNamesInWarehouse(warehouseId)
      .map((name) => {
        const item = itemByName(name);
        return {
          warehouse_id: warehouseId,
          item_name: name,
          effective_stock_qty: effectiveStockQty(warehouseId, name),
          used_area: usedAreaForWarehouseItem(warehouseId, name),
          unit_area: item ? item.unit_area : 0,
          stack_limit: item ? item.stack_limit : 0,
        };
      })
      .filter((row) => row.effective_stock_qty > 0);

  const itemSummaries = () =>
    data.items.map((item) => {
      const breakdown = data.warehouses
        .map((wh) => ({
          warehouse_id: wh.warehouse_id,
          qty: effectiveStockQty(wh.warehouse_id, item.item_name),
          used: usedAreaForWarehouseItem(wh.warehouse_id, item.item_name),
        }))
        .filter((row) => row.qty > 0);
      const totalQty = breakdown.reduce((a, b) => a + b.qty, 0);
      const totalUsed = breakdown.reduce((a, b) => a + b.used, 0);
      return {
        item_name: item.item_name,
        effective_stock_qty: totalQty,
        used_area: totalUsed,
        warehouse_count: breakdown.length,
        unit_area: item.unit_area,
        stack_limit: item.stack_limit,
      };
    });

  const itemWarehouseBreakdown = (itemName) =>
    data.warehouses
      .map((wh) => ({
        warehouse_id: wh.warehouse_id,
        warehouse_name: wh.warehouse_name,
        warehouse_type: wh.warehouse_type,
        area_name: wh.area_name,
        effective_stock_qty: effectiveStockQty(wh.warehouse_id, itemName),
        used_area: usedAreaForWarehouseItem(wh.warehouse_id, itemName),
      }))
      .filter((row) => row.effective_stock_qty > 0);

  // -- 簡易判定ロジック --

  const computeRequiredArea = (itemName, quantity) => {
    const item = itemByName(itemName);
    if (!item) return 0;
    const piles = Math.ceil(quantity / item.stack_limit);
    return piles * item.unit_area;
  };

  const judgeInbound = (itemName, quantity, destination) => {
    const required = computeRequiredArea(itemName, quantity);
    const summaries = warehouseSummaries();
    const candidates = data.warehouses.map((wh) => {
      const summary = summaries.find((s) => s.warehouse_id === wh.warehouse_id);
      const free = summary.free_area;
      const feasible = free >= required;
      const reasons = [];
      let score = 0;
      if (feasible) {
        score += 50;
        reasons.push(`実質空き面積 ${free.toFixed(1)} ≥ 必要 ${required.toFixed(1)}`);
      } else {
        score -= 100;
        reasons.push(`受入余力不足 (空き ${free.toFixed(1)} < 必要 ${required.toFixed(1)})`);
      }
      if (wh.warehouse_type === "sqm_rental") {
        score += 30;
        reasons.push("㎡借り倉庫を優先加点");
      }
      if (wh.area_name === destination) {
        score += 10;
        reasons.push(`行先エリア(${destination})一致`);
      }
      score += wh.priority_in;

      return {
        warehouse_id: wh.warehouse_id,
        warehouse_name: wh.warehouse_name,
        warehouse_type: wh.warehouse_type,
        area_name: wh.area_name,
        score: Math.round(score * 10) / 10,
        feasible,
        reasons,
        effective_stock_qty: 0,
        required_quantity: quantity,
        free_area: free,
        required_area: required,
      };
    });

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aArea = a.area_name === destination ? 1 : 0;
      const bArea = b.area_name === destination ? 1 : 0;
      if (aArea !== bArea) return bArea - aArea;
      const aSqm = a.warehouse_type === "sqm_rental" ? 1 : 0;
      const bSqm = b.warehouse_type === "sqm_rental" ? 1 : 0;
      if (aSqm !== bSqm) return bSqm - aSqm;
      if (b.free_area !== a.free_area) return b.free_area - a.free_area;
      return a.warehouse_id.localeCompare(b.warehouse_id);
    });

    return candidates;
  };

  const judgeOutbound = (itemName, quantity, destination) => {
    const candidates = data.warehouses.map((wh) => {
      const stock = effectiveStockQty(wh.warehouse_id, itemName);
      const feasible = stock >= quantity;
      const reasons = [];
      let score = 0;
      if (feasible) {
        score += 50;
        reasons.push(`実質在庫 ${stock.toFixed(1)} ≥ 要求 ${quantity}`);
      } else {
        score -= 100;
        reasons.push(`在庫不足 (実質在庫 ${stock.toFixed(1)} < 要求 ${quantity})`);
      }
      if (wh.warehouse_type === "kobate") {
        score += 30;
        reasons.push("個建倉庫を優先加点");
      }
      if (wh.area_name === destination) {
        score += 10;
        reasons.push(`行先エリア(${destination})一致`);
      }
      score += wh.priority_out;

      return {
        warehouse_id: wh.warehouse_id,
        warehouse_name: wh.warehouse_name,
        warehouse_type: wh.warehouse_type,
        area_name: wh.area_name,
        score: Math.round(score * 10) / 10,
        feasible,
        reasons,
        effective_stock_qty: stock,
        required_quantity: quantity,
        free_area: 0,
        required_area: 0,
      };
    });

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aArea = a.area_name === destination ? 1 : 0;
      const bArea = b.area_name === destination ? 1 : 0;
      if (aArea !== bArea) return bArea - aArea;
      const aKobate = a.warehouse_type === "kobate" ? 1 : 0;
      const bKobate = b.warehouse_type === "kobate" ? 1 : 0;
      if (aKobate !== bKobate) return bKobate - aKobate;
      if (b.effective_stock_qty !== a.effective_stock_qty) {
        return b.effective_stock_qty - a.effective_stock_qty;
      }
      return a.warehouse_id.localeCompare(b.warehouse_id);
    });

    return candidates;
  };

  const judgeSingle = (payload) => {
    const action = payload.action;
    const itemName = payload.item_name;
    const quantity = Number(payload.quantity);
    const destination = payload.destination;
    const item = itemByName(itemName);

    if (!item) {
      return {
        input: payload,
        best_candidate: null,
        candidates: [],
        error: `品目 "${itemName}" は品目マスタに登録されていません。`,
      };
    }

    const candidates = action === "搬入"
      ? judgeInbound(itemName, quantity, destination)
      : judgeOutbound(itemName, quantity, destination);

    const best = candidates[0] && candidates[0].feasible ? candidates[0] : null;
    return {
      input: payload,
      best_candidate: best,
      candidates,
    };
  };

  const judgeBatch = (payload) => {
    const lines = (payload.lines || []).map((line) => {
      const single = judgeSingle(line);
      const best = single.best_candidate;
      const allocations = best
        ? [{ warehouse_id: best.warehouse_id, quantity: line.quantity }]
        : [];
      const shortage = best ? 0 : Number(line.quantity);
      return {
        line_id: line.line_id,
        action: line.action,
        item_name: line.item_name,
        quantity: line.quantity,
        destination: line.destination,
        feasible: Boolean(best),
        best_candidate: best,
        candidates: single.candidates,
        allocations,
        shortage_quantity: shortage,
      };
    });

    const warnings = lines
      .filter((line) => !line.feasible)
      .map(
        (line) =>
          `${line.line_id}: ${line.item_name} の引当に不足があります (要求: ${line.quantity}, 候補なし)`
      );

    const feasible = lines.every((line) => line.feasible);
    return {
      request_id: payload.request_id,
      request_name: payload.request_name,
      feasible,
      warnings,
      lines,
    };
  };

  // -- ルーティング --

  const planCoverage = () => ({
    reflected_until: data.REFLECTED_UNTIL,
    has_active_plans: true,
  });

  const route = (method, url, body) => {
    const cleanedUrl = url.split("?")[0];
    const segments = cleanedUrl.split("/").filter(Boolean);

    // GET /dashboard/plans/coverage
    if (method === "GET" && cleanedUrl === "/dashboard/plans/coverage") {
      return planCoverage();
    }

    // GET /dashboard/warehouses
    if (method === "GET" && cleanedUrl === "/dashboard/warehouses") {
      return warehouseSummaries();
    }

    // GET /dashboard/warehouses/{id}/items
    if (
      method === "GET" &&
      segments[0] === "dashboard" &&
      segments[1] === "warehouses" &&
      segments[3] === "items"
    ) {
      return warehouseItemBreakdown(decodeURIComponent(segments[2]));
    }

    // GET /dashboard/warehouses/{id}/plans
    if (
      method === "GET" &&
      segments[0] === "dashboard" &&
      segments[1] === "warehouses" &&
      segments[3] === "plans"
    ) {
      const id = decodeURIComponent(segments[2]);
      return data.warehousePlans[id] || [];
    }

    // GET /dashboard/items/summary
    if (method === "GET" && cleanedUrl === "/dashboard/items/summary") {
      return itemSummaries();
    }

    // GET /dashboard/items/{name}/warehouses
    if (
      method === "GET" &&
      segments[0] === "dashboard" &&
      segments[1] === "items" &&
      segments[3] === "warehouses"
    ) {
      return itemWarehouseBreakdown(decodeURIComponent(segments[2]));
    }

    // GET /dashboard/items/{name}/plans
    if (
      method === "GET" &&
      segments[0] === "dashboard" &&
      segments[1] === "items" &&
      segments[3] === "plans"
    ) {
      const name = decodeURIComponent(segments[2]);
      return data.itemPlans[name] || [];
    }

    // GET /history/batch
    if (method === "GET" && cleanedUrl === "/history/batch") {
      return data.batchHistoryList;
    }

    // GET /history/batch/{id}
    if (
      method === "GET" &&
      segments[0] === "history" &&
      segments[1] === "batch" &&
      segments[2]
    ) {
      const id = decodeURIComponent(segments[2]);
      return data.batchHistoryDetails[id] || { detail: "履歴が見つかりません" };
    }

    // POST /warehouse-judge
    if (method === "POST" && cleanedUrl === "/warehouse-judge") {
      const result = judgeSingle(body);
      if (result.error) {
        return { __status: 400, detail: result.error };
      }
      return result;
    }

    // POST /warehouse-judge/batch
    if (method === "POST" && cleanedUrl === "/warehouse-judge/batch") {
      return judgeBatch(body);
    }

    return { __status: 404, detail: `Mock API: ルート ${method} ${url} は未実装です。` };
  };

  // -- fetch オーバーライド --

  const buildResponse = (payload) => {
    let status = 200;
    let body = payload;
    if (payload && typeof payload === "object" && "__status" in payload) {
      status = payload.__status;
      body = { ...payload };
      delete body.__status;
    }
    const text = JSON.stringify(body);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: async () => body,
      text: async () => text,
    };
  };

  const originalFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = async (resource, options = {}) => {
    const url = typeof resource === "string" ? resource : resource.url;
    const method = (options.method || "GET").toUpperCase();
    let body = null;
    if (options.body) {
      try {
        body = JSON.parse(options.body);
      } catch {
        body = null;
      }
    }

    // 同一プロセス内のモック対象パスのみ捌く。それ以外はネイティブにフォールバック。
    if (
      url.startsWith("/warehouse-judge") ||
      url.startsWith("/dashboard/") ||
      url.startsWith("/history/")
    ) {
      // 描画タイミングを自然に見せる軽いディレイ
      await new Promise((resolve) => setTimeout(resolve, 80));
      const payload = route(method, url, body);
      return buildResponse(payload);
    }

    if (originalFetch) {
      return originalFetch(resource, options);
    }
    throw new Error(`Mock API: 未対応 URL ${url}`);
  };
})();
