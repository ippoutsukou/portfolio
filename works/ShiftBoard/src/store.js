/**
 * store.js - 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ迥ｶ諷狗ｮ｡逅・(Single Source of Truth)
 */

const Store = (() => {
    const DEFAULT_DATE = '2026-02-02';
    // 迥ｶ諷・
    let state = {
        fileHandle: null,
        fileName: '',
        records: [],
        // 繧､繝ｳ繝・ャ繧ｯ繧ｹ
        byId: new Map(),
        byDate: new Map(),
        byWorkerDate: new Map(),
        byProcessDate: new Map(),
        // 繝槭せ繧ｿ繝ｪ繧ｹ繝茨ｼ医Θ繝九・繧ｯ蛟､・・
        workers: [],
        processes: [],
        // UI迥ｶ諷・
        ui: {
            activeScreen: 'grid', // 'grid' | 'gantt' | 'admin3'
            gridMode: 'process',  // 'process' | 'worker'
            rangeMode: 'week',    // 'week' | 'month'
            anchorDate: '',       // 騾ｱ/譛医・蝓ｺ貅匁律
            ganttDate: '',        // 繧ｬ繝ｳ繝亥ｯｾ雎｡譌･
            admin3Date: '',       // 騾ｱ谺｡繧ｬ繝ｳ繝医・蝓ｺ貅匁律
            admin3Worker: '',     // 騾ｱ谺｡繧ｬ繝ｳ繝医・菴懈･ｭ閠・ヵ繧｣繝ｫ繧ｿ繝ｼ
            filterText: ''
        },
        dirty: false,
        lastSavedAt: null
    };

    // 螟画峩繝ｪ繧ｹ繝翫・
    const listeners = [];

    /**
     * 迥ｶ諷句､画峩繧帝夂衍
     */
    function notify() {
        listeners.forEach(fn => fn(state));
    }

    /**
     * 螟画峩繝ｪ繧ｹ繝翫・繧堤匳骭ｲ
     * @param {Function} fn
     */
    function subscribe(fn) {
        listeners.push(fn);
    }

    /**
     * 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧貞・讒狗ｯ・
     */
    function rebuildIndexes() {
        state.byId.clear();
        state.byDate.clear();
        state.byWorkerDate.clear();
        state.byProcessDate.clear();

        const workersSet = new Set();
        const processesSet = new Set();

        for (const record of state.records) {
            // byId
            state.byId.set(record.id, record);

            // byDate
            if (!state.byDate.has(record.date)) {
                state.byDate.set(record.date, []);
            }
            state.byDate.get(record.date).push(record.id);

            // byWorkerDate
            const wdKey = `${record.worker}|${record.date}`;
            if (!state.byWorkerDate.has(wdKey)) {
                state.byWorkerDate.set(wdKey, []);
            }
            state.byWorkerDate.get(wdKey).push(record.id);

            // byProcessDate
            const pdKey = `${record.process}|${record.date}`;
            if (!state.byProcessDate.has(pdKey)) {
                state.byProcessDate.set(pdKey, []);
            }
            state.byProcessDate.get(pdKey).push(record.id);

            // 繝槭せ繧ｿ
            workersSet.add(record.worker);
            processesSet.add(record.process);
        }

        state.workers = [...workersSet].sort();
        state.processes = [...processesSet].sort();
    }

    /**
     * 蛻晄悄迥ｶ諷九↓繝ｪ繧ｻ繝・ヨ
     */
    function reset() {
        state = {
            fileHandle: null,
            fileName: '',
            records: [],
            byId: new Map(),
            byDate: new Map(),
            byWorkerDate: new Map(),
            byProcessDate: new Map(),
            workers: [],
            processes: [],
            ui: {
                activeScreen: 'grid',
                gridMode: 'process',
                rangeMode: 'week',
                anchorDate: getDefaultDateString(),
                ganttDate: getDefaultDateString(),
                admin3Date: getDefaultDateString(),
                admin3Worker: '',
                filterText: ''
            },
            dirty: false,
            lastSavedAt: null
        };
        notify();
    }

    /**
     * 莉頑律縺ｮ譌･莉俶枚蟄怜・繧貞叙蠕・
     * @returns {string}
     */
    function getDefaultDateString() {
        return DEFAULT_DATE;
    }

    /**
     * CSV繝・・繧ｿ繧偵Ο繝ｼ繝・
     * @param {ScheduleRecord[]} records
     * @param {string} fileName
     * @param {FileSystemFileHandle} [fileHandle]
     */
    function loadRecords(records, fileName, fileHandle = null) {
        state.records = Model.sortRecords(records);
        state.fileName = fileName;
        state.fileHandle = fileHandle;
        state.dirty = false;
        state.lastSavedAt = null;
        state.ui.anchorDate = getDefaultDateString();
        state.ui.ganttDate = getDefaultDateString();
        state.ui.admin3Date = getDefaultDateString();
        rebuildIndexes();
        state.ui.admin3Worker = state.workers[0] || '';
        notify();
    }

    /**
     * 繝ｬ繧ｳ繝ｼ繝峨ｒ霑ｽ蜉
     * @param {ScheduleRecord} record
     */
    function addRecord(record) {
        state.records.push(record);
        state.records = Model.sortRecords(state.records);
        state.dirty = true;
        rebuildIndexes();
        notify();
    }

    /**
     * 繝ｬ繧ｳ繝ｼ繝峨ｒ譖ｴ譁ｰ
     * @param {string} id
     * @param {Partial<ScheduleRecord>} patch
     */
    function updateRecord(id, patch) {
        const idx = state.records.findIndex(r => r.id === id);
        if (idx === -1) return;

        state.records[idx] = { ...state.records[idx], ...patch };
        state.records = Model.sortRecords(state.records);
        state.dirty = true;
        rebuildIndexes();
        notify();
    }

    /**
     * 繝ｬ繧ｳ繝ｼ繝峨ｒ蜑企勁
     * @param {string} id
     */
    function deleteRecord(id) {
        state.records = state.records.filter(r => r.id !== id);
        state.dirty = true;
        rebuildIndexes();
        notify();
    }

    /**
     * UI迥ｶ諷九ｒ譖ｴ譁ｰ
     * @param {Partial<typeof state.ui>} partial
     */
    function setUi(partial) {
        state.ui = { ...state.ui, ...partial };
        notify();
    }

    /**
     * 菫晏ｭ伜ｮ御ｺ・ｒ繝槭・繧ｯ
     */
    function markSaved() {
        state.dirty = false;
        state.lastSavedAt = new Date().toISOString();
        notify();
    }

    /**
     * 迴ｾ蝨ｨ縺ｮ迥ｶ諷九ｒ蜿門ｾ暦ｼ郁ｪｭ縺ｿ蜿悶ｊ蟆ら畑・・
     * @returns {typeof state}
     */
    function getState() {
        return state;
    }

    /**
     * 謖・ｮ壽律縺ｮ繝ｬ繧ｳ繝ｼ繝我ｸ隕ｧ繧貞叙蠕・
     * @param {string} date
     * @returns {ScheduleRecord[]}
     */
    function getRecordsByDate(date) {
        const ids = state.byDate.get(date) || [];
        return ids.map(id => state.byId.get(id)).filter(Boolean);
    }

    /**
     * 謖・ｮ壻ｽ懈･ｭ閠・・譌･莉倥・繝ｬ繧ｳ繝ｼ繝我ｸ隕ｧ繧貞叙蠕・
     * @param {string} worker
     * @param {string} date
     * @returns {ScheduleRecord[]}
     */
    function getRecordsByWorkerDate(worker, date) {
        const key = `${worker}|${date}`;
        const ids = state.byWorkerDate.get(key) || [];
        return ids.map(id => state.byId.get(id)).filter(Boolean);
    }

    /**
     * 謖・ｮ壼ｷ･遞九・譌･莉倥・繝ｬ繧ｳ繝ｼ繝我ｸ隕ｧ繧貞叙蠕・
     * @param {string} process
     * @param {string} date
     * @returns {ScheduleRecord[]}
     */
    function getRecordsByProcessDate(process, date) {
        const key = `${process}|${date}`;
        const ids = state.byProcessDate.get(key) || [];
        return ids.map(id => state.byId.get(id)).filter(Boolean);
    }

    // 蛻晄悄蛹・
    reset();

    return {
        subscribe,
        reset,
        getState,
        loadRecords,
        addRecord,
        updateRecord,
        deleteRecord,
        setUi,
        markSaved,
        getRecordsByDate,
        getRecordsByWorkerDate,
        getRecordsByProcessDate
    };
})();

