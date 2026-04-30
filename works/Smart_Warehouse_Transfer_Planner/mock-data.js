// Smart Warehouse Transfer Planner - GitHub Pages デモ用 固定値データ
// 値はすべて架空。実 DB / 実運用 Excel は使用しない。

window.MOCK_DATA = (() => {
  const STOCK_BASE_DATE = "2026-04-20";
  const REFLECTED_UNTIL = "2026-05-15";

  const warehouses = [
    {
      warehouse_id: "W001",
      warehouse_name: "東京個建倉庫",
      warehouse_type: "kobate",
      area_name: "東京",
      max_area: 100.0,
      priority_out: 5.0,
      priority_in: 1.0,
      remarks: "個建拠点",
    },
    {
      warehouse_id: "W002",
      warehouse_name: "東京㎡借り倉庫",
      warehouse_type: "sqm_rental",
      area_name: "東京",
      max_area: 120.0,
      priority_out: 2.0,
      priority_in: 5.0,
      remarks: "都内㎡借り",
    },
    {
      warehouse_id: "W003",
      warehouse_name: "大阪個建倉庫",
      warehouse_type: "kobate",
      area_name: "大阪",
      max_area: 90.0,
      priority_out: 4.0,
      priority_in: 1.0,
      remarks: "関西個建",
    },
    {
      warehouse_id: "W004",
      warehouse_name: "大阪㎡借り倉庫",
      warehouse_type: "sqm_rental",
      area_name: "大阪",
      max_area: 150.0,
      priority_out: 1.0,
      priority_in: 4.0,
      remarks: "関西㎡借り",
    },
    {
      warehouse_id: "W005",
      warehouse_name: "名古屋㎡借り倉庫",
      warehouse_type: "sqm_rental",
      area_name: "名古屋",
      max_area: 110.0,
      priority_out: 1.0,
      priority_in: 3.0,
      remarks: "中部㎡借り",
    },
  ];

  const items = [
    { item_name: "A品", unit_area: 2.0, stack_limit: 10, remarks: "標準パレット" },
    { item_name: "B品", unit_area: 1.5, stack_limit: 8, remarks: "小型品" },
    { item_name: "C品", unit_area: 3.0, stack_limit: 6, remarks: "大型品" },
    { item_name: "D品", unit_area: 2.5, stack_limit: 12, remarks: "軽量品" },
  ];

  const stockCurrent = [
    { warehouse_id: "W001", item_name: "A品", stock_qty: 40.0, update_time: STOCK_BASE_DATE },
    { warehouse_id: "W001", item_name: "B品", stock_qty: 20.0, update_time: STOCK_BASE_DATE },
    { warehouse_id: "W002", item_name: "A品", stock_qty: 10.0, update_time: STOCK_BASE_DATE },
    { warehouse_id: "W002", item_name: "C品", stock_qty: 30.0, update_time: STOCK_BASE_DATE },
    { warehouse_id: "W003", item_name: "A品", stock_qty: 25.0, update_time: STOCK_BASE_DATE },
    { warehouse_id: "W003", item_name: "B品", stock_qty: 15.0, update_time: STOCK_BASE_DATE },
    { warehouse_id: "W004", item_name: "B品", stock_qty: 18.0, update_time: STOCK_BASE_DATE },
    { warehouse_id: "W004", item_name: "C品", stock_qty: 12.0, update_time: STOCK_BASE_DATE },
    { warehouse_id: "W004", item_name: "D品", stock_qty: 24.0, update_time: STOCK_BASE_DATE },
    { warehouse_id: "W005", item_name: "A品", stock_qty: 30.0, update_time: STOCK_BASE_DATE },
  ];

  const transferPlans = [
    {
      plan_id: "TP001",
      item_name: "A品",
      from_warehouse_id: "W001",
      to_warehouse_id: "W003",
      qty: 30.0,
      plan_date: "2026-04-25",
      status: "planned",
    },
    {
      plan_id: "TP002",
      item_name: "B品",
      from_warehouse_id: "W001",
      to_warehouse_id: "W004",
      qty: 10.0,
      plan_date: "2026-05-01",
      status: "fixed",
    },
    {
      plan_id: "TP003",
      item_name: "C品",
      from_warehouse_id: "W002",
      to_warehouse_id: "W005",
      qty: 12.0,
      plan_date: "2026-05-08",
      status: "planned",
    },
    {
      plan_id: "TP004",
      item_name: "A品",
      from_warehouse_id: "W005",
      to_warehouse_id: "W002",
      qty: 8.0,
      plan_date: "2026-05-10",
      status: "cancelled",
    },
    {
      plan_id: "TP005",
      item_name: "D品",
      from_warehouse_id: "W004",
      to_warehouse_id: "W005",
      qty: 12.0,
      plan_date: "2026-05-15",
      status: "planned",
    },
  ];

  const disposalPlans = [
    {
      plan_id: "DP001",
      warehouse_id: "W001",
      item_name: "A品",
      qty: 5.0,
      plan_date: "2026-04-22",
      status: "planned",
    },
    {
      plan_id: "DP002",
      warehouse_id: "W003",
      item_name: "B品",
      qty: 3.0,
      plan_date: "2026-05-05",
      status: "fixed",
    },
    {
      plan_id: "DP003",
      warehouse_id: "W004",
      item_name: "C品",
      qty: 4.0,
      plan_date: "2026-05-12",
      status: "planned",
    },
  ];

  // 倉庫別 在庫推移グラフ用ポイント (有効計画反映後)
  const warehousePlans = {
    W001: [
      { date: "2026-04-20", stock_qty: 60.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_items: [], transfer_out_items: [], disposal_items: [] },
      { date: "2026-04-22", stock_qty: 55.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 5.0, transfer_in_items: [], transfer_out_items: [], disposal_items: [{ item_name: "A品", qty: 5.0 }] },
      { date: "2026-04-25", stock_qty: 25.0, transfer_in_qty: 0.0, transfer_out_qty: 30.0, transfer_net_qty: -30.0, disposal_qty: 0.0, transfer_in_items: [], transfer_out_items: [{ item_name: "A品", qty: 30.0 }], disposal_items: [] },
      { date: "2026-05-01", stock_qty: 15.0, transfer_in_qty: 0.0, transfer_out_qty: 10.0, transfer_net_qty: -10.0, disposal_qty: 0.0, transfer_in_items: [], transfer_out_items: [{ item_name: "B品", qty: 10.0 }], disposal_items: [] },
    ],
    W002: [
      { date: "2026-04-20", stock_qty: 40.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_items: [], transfer_out_items: [], disposal_items: [] },
      { date: "2026-05-08", stock_qty: 28.0, transfer_in_qty: 0.0, transfer_out_qty: 12.0, transfer_net_qty: -12.0, disposal_qty: 0.0, transfer_in_items: [], transfer_out_items: [{ item_name: "C品", qty: 12.0 }], disposal_items: [] },
    ],
    W003: [
      { date: "2026-04-20", stock_qty: 40.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_items: [], transfer_out_items: [], disposal_items: [] },
      { date: "2026-04-25", stock_qty: 70.0, transfer_in_qty: 30.0, transfer_out_qty: 0.0, transfer_net_qty: 30.0, disposal_qty: 0.0, transfer_in_items: [{ item_name: "A品", qty: 30.0 }], transfer_out_items: [], disposal_items: [] },
      { date: "2026-05-05", stock_qty: 67.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 3.0, transfer_in_items: [], transfer_out_items: [], disposal_items: [{ item_name: "B品", qty: 3.0 }] },
    ],
    W004: [
      { date: "2026-04-20", stock_qty: 54.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_items: [], transfer_out_items: [], disposal_items: [] },
      { date: "2026-05-01", stock_qty: 64.0, transfer_in_qty: 10.0, transfer_out_qty: 0.0, transfer_net_qty: 10.0, disposal_qty: 0.0, transfer_in_items: [{ item_name: "B品", qty: 10.0 }], transfer_out_items: [], disposal_items: [] },
      { date: "2026-05-12", stock_qty: 60.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 4.0, transfer_in_items: [], transfer_out_items: [], disposal_items: [{ item_name: "C品", qty: 4.0 }] },
      { date: "2026-05-15", stock_qty: 48.0, transfer_in_qty: 0.0, transfer_out_qty: 12.0, transfer_net_qty: -12.0, disposal_qty: 0.0, transfer_in_items: [], transfer_out_items: [{ item_name: "D品", qty: 12.0 }], disposal_items: [] },
    ],
    W005: [
      { date: "2026-04-20", stock_qty: 30.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_items: [], transfer_out_items: [], disposal_items: [] },
      { date: "2026-05-08", stock_qty: 42.0, transfer_in_qty: 12.0, transfer_out_qty: 0.0, transfer_net_qty: 12.0, disposal_qty: 0.0, transfer_in_items: [{ item_name: "C品", qty: 12.0 }], transfer_out_items: [], disposal_items: [] },
      { date: "2026-05-15", stock_qty: 54.0, transfer_in_qty: 12.0, transfer_out_qty: 0.0, transfer_net_qty: 12.0, disposal_qty: 0.0, transfer_in_items: [{ item_name: "D品", qty: 12.0 }], transfer_out_items: [], disposal_items: [] },
    ],
  };

  // 品目別 在庫推移グラフ用ポイント (品目全体の合計)
  const itemPlans = {
    "A品": [
      { date: "2026-04-20", stock_qty: 105.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_events: [], transfer_out_events: [], disposal_events: [] },
      { date: "2026-04-22", stock_qty: 100.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 5.0, transfer_in_events: [], transfer_out_events: [], disposal_events: [{ warehouse_id: "W001", warehouse_name: "東京個建倉庫", qty: 5.0 }] },
      { date: "2026-04-25", stock_qty: 100.0, transfer_in_qty: 30.0, transfer_out_qty: 30.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_events: [{ from_warehouse_id: "W001", from_warehouse_name: "東京個建倉庫", to_warehouse_id: "W003", to_warehouse_name: "大阪個建倉庫", qty: 30.0 }], transfer_out_events: [{ from_warehouse_id: "W001", from_warehouse_name: "東京個建倉庫", to_warehouse_id: "W003", to_warehouse_name: "大阪個建倉庫", qty: 30.0 }], disposal_events: [] },
    ],
    "B品": [
      { date: "2026-04-20", stock_qty: 53.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_events: [], transfer_out_events: [], disposal_events: [] },
      { date: "2026-05-01", stock_qty: 53.0, transfer_in_qty: 10.0, transfer_out_qty: 10.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_events: [{ from_warehouse_id: "W001", from_warehouse_name: "東京個建倉庫", to_warehouse_id: "W004", to_warehouse_name: "大阪㎡借り倉庫", qty: 10.0 }], transfer_out_events: [{ from_warehouse_id: "W001", from_warehouse_name: "東京個建倉庫", to_warehouse_id: "W004", to_warehouse_name: "大阪㎡借り倉庫", qty: 10.0 }], disposal_events: [] },
      { date: "2026-05-05", stock_qty: 50.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 3.0, transfer_in_events: [], transfer_out_events: [], disposal_events: [{ warehouse_id: "W003", warehouse_name: "大阪個建倉庫", qty: 3.0 }] },
    ],
    "C品": [
      { date: "2026-04-20", stock_qty: 42.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_events: [], transfer_out_events: [], disposal_events: [] },
      { date: "2026-05-08", stock_qty: 42.0, transfer_in_qty: 12.0, transfer_out_qty: 12.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_events: [{ from_warehouse_id: "W002", from_warehouse_name: "東京㎡借り倉庫", to_warehouse_id: "W005", to_warehouse_name: "名古屋㎡借り倉庫", qty: 12.0 }], transfer_out_events: [{ from_warehouse_id: "W002", from_warehouse_name: "東京㎡借り倉庫", to_warehouse_id: "W005", to_warehouse_name: "名古屋㎡借り倉庫", qty: 12.0 }], disposal_events: [] },
      { date: "2026-05-12", stock_qty: 38.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 4.0, transfer_in_events: [], transfer_out_events: [], disposal_events: [{ warehouse_id: "W004", warehouse_name: "大阪㎡借り倉庫", qty: 4.0 }] },
    ],
    "D品": [
      { date: "2026-04-20", stock_qty: 24.0, transfer_in_qty: 0.0, transfer_out_qty: 0.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_events: [], transfer_out_events: [], disposal_events: [] },
      { date: "2026-05-15", stock_qty: 24.0, transfer_in_qty: 12.0, transfer_out_qty: 12.0, transfer_net_qty: 0.0, disposal_qty: 0.0, transfer_in_events: [{ from_warehouse_id: "W004", from_warehouse_name: "大阪㎡借り倉庫", to_warehouse_id: "W005", to_warehouse_name: "名古屋㎡借り倉庫", qty: 12.0 }], transfer_out_events: [{ from_warehouse_id: "W004", from_warehouse_name: "大阪㎡借り倉庫", to_warehouse_id: "W005", to_warehouse_name: "名古屋㎡借り倉庫", qty: 12.0 }], disposal_events: [] },
    ],
  };

  // 履歴一覧 (3 件)
  const batchHistoryList = [
    {
      request_id: "REQ-20260425-001",
      request_name: "4月仕入一括",
      feasible: true,
      warning_count: 0,
      line_count: 2,
      allocation_count: 2,
      created_at: "2026-04-25T10:30:00",
    },
    {
      request_id: "REQ-20260426-002",
      request_name: "連休前再判定",
      feasible: true,
      warning_count: 1,
      line_count: 3,
      allocation_count: 3,
      created_at: "2026-04-26T15:12:00",
    },
    {
      request_id: "REQ-20260428-003",
      request_name: "月末追加搬出",
      feasible: false,
      warning_count: 2,
      line_count: 2,
      allocation_count: 1,
      created_at: "2026-04-28T09:45:00",
    },
  ];

  // 履歴詳細
  const batchHistoryDetails = {
    "REQ-20260425-001": {
      request_id: "REQ-20260425-001",
      request_name: "4月仕入一括",
      feasible: true,
      warning_count: 0,
      created_at: "2026-04-25T10:30:00",
      warnings: [],
      lines: [
        { line_id: "L001", action: "搬入", item_name: "A品", quantity: 30.0, destination: "東京", feasible: true, best_candidate: "W002", best_candidate_name: "東京㎡借り倉庫", shortage_quantity: 0.0 },
        { line_id: "L002", action: "搬入", item_name: "B品", quantity: 20.0, destination: "大阪", feasible: true, best_candidate: "W004", best_candidate_name: "大阪㎡借り倉庫", shortage_quantity: 0.0 },
      ],
      allocations: [
        { line_id: "L001", warehouse_id: "W002", quantity: 30.0 },
        { line_id: "L002", warehouse_id: "W004", quantity: 20.0 },
      ],
    },
    "REQ-20260426-002": {
      request_id: "REQ-20260426-002",
      request_name: "連休前再判定",
      feasible: true,
      warning_count: 1,
      created_at: "2026-04-26T15:12:00",
      warnings: ["L003: 候補に余裕があるが行先エリア外のため再確認推奨"],
      lines: [
        { line_id: "L001", action: "搬出", item_name: "A品", quantity: 20.0, destination: "東京", feasible: true, best_candidate: "W001", best_candidate_name: "東京個建倉庫", shortage_quantity: 0.0 },
        { line_id: "L002", action: "搬入", item_name: "C品", quantity: 18.0, destination: "名古屋", feasible: true, best_candidate: "W005", best_candidate_name: "名古屋㎡借り倉庫", shortage_quantity: 0.0 },
        { line_id: "L003", action: "搬入", item_name: "D品", quantity: 24.0, destination: "東京", feasible: true, best_candidate: "W002", best_candidate_name: "東京㎡借り倉庫", shortage_quantity: 0.0 },
      ],
      allocations: [
        { line_id: "L001", warehouse_id: "W001", quantity: 20.0 },
        { line_id: "L002", warehouse_id: "W005", quantity: 18.0 },
        { line_id: "L003", warehouse_id: "W002", quantity: 24.0 },
      ],
    },
    "REQ-20260428-003": {
      request_id: "REQ-20260428-003",
      request_name: "月末追加搬出",
      feasible: false,
      warning_count: 2,
      created_at: "2026-04-28T09:45:00",
      warnings: [
        "L001: A品 の引当に不足があります (要求: 80, 引当可能: 55)",
        "L002: 行先エリア(東京)に該当する候補がありません",
      ],
      lines: [
        { line_id: "L001", action: "搬出", item_name: "A品", quantity: 80.0, destination: "大阪", feasible: false, best_candidate: "W003", best_candidate_name: "大阪個建倉庫", shortage_quantity: 25.0 },
        { line_id: "L002", action: "搬出", item_name: "D品", quantity: 30.0, destination: "東京", feasible: false, best_candidate: null, best_candidate_name: null, shortage_quantity: 30.0 },
      ],
      allocations: [
        { line_id: "L001", warehouse_id: "W003", quantity: 55.0 },
      ],
    },
  };

  return {
    STOCK_BASE_DATE,
    REFLECTED_UNTIL,
    warehouses,
    items,
    stockCurrent,
    transferPlans,
    disposalPlans,
    warehousePlans,
    itemPlans,
    batchHistoryList,
    batchHistoryDetails,
  };
})();
