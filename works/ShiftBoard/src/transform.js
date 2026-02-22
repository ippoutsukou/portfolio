/**
 * transform.js - Storeデータを表示用データに変換する
 */

const Transform = (() => {
    /**
     * 週の開始日（月曜）を返す
     * @param {Date} date
     * @returns {Date}
     */
    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    /**
     * 月初を返す
     * @param {Date} date
     * @returns {Date}
     */
    function getMonthStart(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    /**
     * 月末を返す
     * @param {Date} date
     * @returns {Date}
     */
    function getMonthEnd(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    /**
     * DateをYYYY-MM-DDへ変換
     * @param {Date} date
     * @returns {string}
     */
    function dateToString(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * 日付配列を生成
     * @param {string} anchorDate - 基準日
     * @param {'week'|'month'} rangeMode
     * @returns {string[]}
     */
    function generateDates(anchorDate, rangeMode) {
        const anchor = new Date(anchorDate);
        const dates = [];

        if (rangeMode === 'week') {
            const start = getWeekStart(anchor);
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                dates.push(dateToString(d));
            }
            return dates;
        }

        const start = getMonthStart(anchor);
        const end = getMonthEnd(anchor);
        const current = new Date(start);
        while (current <= end) {
            dates.push(dateToString(current));
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    /**
     * 日付ヘッダー表示を生成
     * @param {string} dateStr - YYYY-MM-DD
     * @returns {string}
     */
    function formatDateHeader(dateStr) {
        const d = new Date(dateStr);
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        const month = d.getMonth() + 1;
        const date = d.getDate();
        const dayName = days[d.getDay()];
        return `${month}/${date}(${dayName})`;
    }

    /**
     * 工程x日付グリッド用データ
     * @param {string[]} dates
     * @param {string} filterText
     * @returns {{rows: string[], dates: string[], cells: Map<string, Object[]>}}
     */
    function generateProcessGrid(dates, filterText = '') {
        const state = Store.getState();
        let processes = state.processes;

        if (filterText) {
            const lower = filterText.toLowerCase();
            processes = processes.filter(p => p.toLowerCase().includes(lower));
        }

        const cells = new Map();

        for (const process of processes) {
            for (const date of dates) {
                const key = `${process}|${date}`;
                const records = Store.getRecordsByProcessDate(process, date);
                cells.set(key, records.map(r => ({
                    id: r.id,
                    worker: r.worker,
                    start: r.start,
                    end: r.end
                })));
            }
        }

        return { rows: processes, dates, cells };
    }

    /**
     * 作業者x日付グリッド用データ
     * @param {string[]} dates
     * @param {string} filterText
     * @returns {{rows: string[], dates: string[], cells: Map<string, Object[]>}}
     */
    function generateWorkerGrid(dates, filterText = '') {
        const state = Store.getState();
        let workers = state.workers;

        if (filterText) {
            const lower = filterText.toLowerCase();
            workers = workers.filter(w => w.toLowerCase().includes(lower));
        }

        const cells = new Map();

        for (const worker of workers) {
            for (const date of dates) {
                const key = `${worker}|${date}`;
                const records = Store.getRecordsByWorkerDate(worker, date);
                cells.set(key, records.map(r => ({
                    id: r.id,
                    process: r.process,
                    start: r.start,
                    end: r.end
                })));
            }
        }

        return { rows: workers, dates, cells };
    }

    /**
     * 管理画面2向けガントデータ
     * @param {string} ganttDate
     * @returns {{workers: string[], events: Object[]}}
     */
    function generateGanttData(ganttDate) {
        const state = Store.getState();
        const records = Store.getRecordsByDate(ganttDate);

        const workersInDay = new Set(records.map(r => r.worker));
        const allWorkers = state.workers;
        const workers = allWorkers.filter(w => workersInDay.has(w))
            .concat(allWorkers.filter(w => !workersInDay.has(w)));

        const events = records.map(r => ({
            id: r.id,
            worker: r.worker,
            process: r.process,
            start: r.start,
            end: r.end,
            note: r.note || '',
            color: r.color || ''
        }));

        return { workers, events };
    }

    /**
     * 管理画面3向け: 作業者の週次ガントデータ
     * @param {string} anchorDate
     * @param {string} worker
     * @returns {{dates: string[], worker: string, eventsByDate: Map<string, Object[]>}}
     */
    function generateAdmin3WeekData(anchorDate, worker) {
        const dates = generateDates(anchorDate, 'week');
        const eventsByDate = new Map();

        for (const date of dates) {
            const records = worker ? Store.getRecordsByWorkerDate(worker, date) : [];
            const events = records
                .map(r => ({
                    id: r.id,
                    date: r.date,
                    worker: r.worker,
                    process: r.process,
                    start: r.start,
                    end: r.end,
                    note: r.note || '',
                    color: r.color || ''
                }))
                .sort((a, b) => a.start.localeCompare(b.start));

            eventsByDate.set(date, events);
        }

        return { dates, worker, eventsByDate };
    }

    /**
     * 時間スロット配列（ガント用）
     * @returns {string[]}
     */
    function generateTimeSlots() {
        const config = Rules.getConfig();
        const startMin = Model.timeToMinutes(config.businessStart);
        const endMin = Model.timeToMinutes(config.businessEnd);
        const step = config.timeStep;
        const slots = [];

        for (let m = startMin; m < endMin; m += step) {
            slots.push(Model.minutesToTime(m));
        }

        return slots;
    }

    return {
        getWeekStart,
        getMonthStart,
        getMonthEnd,
        generateDates,
        formatDateHeader,
        generateProcessGrid,
        generateWorkerGrid,
        generateGanttData,
        generateAdmin3WeekData,
        generateTimeSlots
    };
})();
