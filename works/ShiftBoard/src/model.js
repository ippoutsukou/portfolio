/**
 * model.js - データモデル定義と正規化ロジック
 */

const Model = (() => {
  /**
   * ScheduleRecord型
   * @typedef {Object} ScheduleRecord
   * @property {string} id - レコード識別子
   * @property {string} date - 作業日 (YYYY-MM-DD)
   * @property {string} worker - 作業者名
   * @property {string} process - 作業工程名
   * @property {string} start - 開始時刻 (HH:MM)
   * @property {string} end - 終了時刻 (HH:MM)
   * @property {string} [note] - 備考
   * @property {string} [color] - 表示色
   */

  let idCounter = 0;

  /**
   * ユニークIDを生成
   * @param {string} date
   * @param {string} worker
   * @param {string} process
   * @param {string} start
   * @param {string} end
   * @returns {string}
   */
  function generateId(date, worker, process, start, end) {
    idCounter++;
    const dateStr = date.replace(/-/g, '');
    return `A${dateStr}-${String(idCounter).padStart(4, '0')}`;
  }

  /**
   * IDカウンターをリセット
   */
  function resetIdCounter() {
    idCounter = 0;
  }

  /**
   * 時刻を正規化 (H:MM → HH:MM)
   * @param {string} time
   * @returns {string}
   */
  function normalizeTime(time) {
    if (!time) return '';
    const trimmed = time.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return trimmed;
    const hour = match[1].padStart(2, '0');
    const minute = match[2];
    return `${hour}:${minute}`;
  }

  /**
   * 日付形式を検証 (YYYY-MM-DD)
   * @param {string} date
   * @returns {boolean}
   */
  function isValidDate(date) {
    if (!date) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    const d = new Date(date);
    return !isNaN(d.getTime());
  }

  /**
   * 時刻形式を検証 (HH:MM)
   * @param {string} time
   * @returns {boolean}
   */
  function isValidTime(time) {
    if (!time) return false;
    const regex = /^\d{2}:\d{2}$/;
    if (!regex.test(time)) return false;
    const [h, m] = time.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  /**
   * 時刻を分に変換
   * @param {string} time - HH:MM形式
   * @returns {number}
   */
  function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * 分を時刻に変換
   * @param {number} minutes
   * @returns {string}
   */
  function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * CSVの1行を正規化してScheduleRecordに変換
   * @param {Object} row - CSVパース後の1行オブジェクト
   * @param {number} index - 行番号（エラー表示用）
   * @returns {{record: ScheduleRecord|null, errors: string[]}}
   */
  function normalizeRow(row, index) {
    const errors = [];
    const lineNum = index + 2; // ヘッダー行 + 0-indexed

    // 必須フィールドの存在チェック
    const requiredFields = ['date', 'worker', 'process', 'start', 'end'];
    for (const field of requiredFields) {
      if (!row[field] || !row[field].toString().trim()) {
        errors.push(`行${lineNum}: ${field}が未入力です`);
      }
    }

    if (errors.length > 0) {
      return { record: null, errors };
    }

    // 正規化
    const date = row.date.trim();
    const worker = row.worker.trim();
    const process = row.process.trim();
    const start = normalizeTime(row.start);
    const end = normalizeTime(row.end);
    const note = row.note ? row.note.trim() : '';
    const color = row.color ? row.color.trim() : '';
    let id = row.id ? row.id.trim() : '';

    // 日付検証
    if (!isValidDate(date)) {
      errors.push(`行${lineNum}: 日付形式が不正です (${date})`);
    }

    // 時刻検証
    if (!isValidTime(start)) {
      errors.push(`行${lineNum}: 開始時刻形式が不正です (${start})`);
    }
    if (!isValidTime(end)) {
      errors.push(`行${lineNum}: 終了時刻形式が不正です (${end})`);
    }

    // start < end 検証
    if (isValidTime(start) && isValidTime(end)) {
      if (timeToMinutes(start) >= timeToMinutes(end)) {
        errors.push(`行${lineNum}: 開始時刻が終了時刻以降です (${start} - ${end})`);
      }
    }

    if (errors.length > 0) {
      return { record: null, errors };
    }

    // ID生成（未設定の場合）
    if (!id) {
      id = generateId(date, worker, process, start, end);
    }

    return {
      record: { id, date, worker, process, start, end, note, color },
      errors: []
    };
  }

  /**
   * CSVデータ全体を正規化
   * @param {Object[]} rows - CSVパース後の配列
   * @returns {{records: ScheduleRecord[], errors: string[]}}
   */
  function normalizeAll(rows) {
    resetIdCounter();
    const records = [];
    const allErrors = [];

    for (let i = 0; i < rows.length; i++) {
      const { record, errors } = normalizeRow(rows[i], i);
      if (record) {
        records.push(record);
      }
      allErrors.push(...errors);
    }

    return { records, errors: allErrors };
  }

  /**
   * レコードをソート（date, start, worker順）
   * @param {ScheduleRecord[]} records
   * @returns {ScheduleRecord[]}
   */
  function sortRecords(records) {
    return [...records].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.start !== b.start) return a.start.localeCompare(b.start);
      return a.worker.localeCompare(b.worker);
    });
  }

  /**
   * レコードをCSV用オブジェクト配列に変換
   * @param {ScheduleRecord[]} records
   * @returns {Object[]}
   */
  function toCSVData(records) {
    return records.map(r => ({
      date: r.date,
      worker: r.worker,
      process: r.process,
      start: r.start,
      end: r.end,
      id: r.id,
      note: r.note || ''
    }));
  }

  return {
    generateId,
    resetIdCounter,
    normalizeTime,
    isValidDate,
    isValidTime,
    timeToMinutes,
    minutesToTime,
    normalizeRow,
    normalizeAll,
    sortRecords,
    toCSVData
  };
})();
