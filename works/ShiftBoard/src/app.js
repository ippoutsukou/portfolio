/**
 * app.js - 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繧ｨ繝ｳ繝医Μ繝ｼ繝昴う繝ｳ繝・ */

const App = (() => {
    const DEFAULT_DATE = '2026-02-02';
    const AUTO_SAMPLE_FILES = [
        'sample_data_0202_0208_no_overlap.csv',
        'sample_data_0202_0208_randomized.csv'
    ];
    const FALLBACK_SAMPLE_RECORDS = [
        { id: 'A20260202-0001', date: '2026-02-02', worker: '田中', process: '工程A', start: '08:30', end: '10:00', note: '' },
        { id: 'A20260202-0002', date: '2026-02-02', worker: '佐藤', process: '工程B', start: '09:00', end: '11:00', note: '' },
        { id: 'A20260202-0003', date: '2026-02-02', worker: '鈴木', process: '工程C', start: '10:00', end: '12:00', note: '' }
    ];
    async function init() {
        UI.init();

        setupEventListeners();
        Store.subscribe(handleStateChange);

        await ensureDefaultData();
        const fixedDate = getDefaultDateString();
        document.getElementById('anchorDate').value = fixedDate;
        document.getElementById('ganttDate').value = fixedDate;
        document.getElementById('admin3Date').value = fixedDate;
        Store.setUi({ anchorDate: fixedDate, ganttDate: fixedDate, admin3Date: fixedDate });

        renderAll();

        console.log('ShiftBoard initialized');
    }

    function getDefaultDateString() {
        return DEFAULT_DATE;
    }

    async function ensureDefaultData() {
        const state = Store.getState();
        if (state.records.length > 0) return;

        for (const fileName of AUTO_SAMPLE_FILES) {
            try {
                const response = await fetch(fileName, { cache: 'no-store' });
                if (!response.ok) continue;

                const csvText = await response.text();
                const result = CsvIO.parseCSV(csvText);
                if (result.records.length === 0) continue;

                Store.loadRecords(result.records, fileName, null);
                if (result.errors.length > 0) {
                    UI.showToast(`${fileName} を読み込みました（一部エラー ${result.errors.length}件）`, 'warning', 3500);
                }
                return;
            } catch (err) {
                // no-op: 次の候補ファイルで再試行
            }
        }

        Store.loadRecords(FALLBACK_SAMPLE_RECORDS, 'sample_data_auto.csv', null);
        UI.showToast('自動CSV読込に失敗したため、最小サンプルを表示しています', 'warning', 4000);
    }

    function setupEventListeners() {
        document.getElementById('btnLoad').addEventListener('click', handleLoad);
        document.getElementById('btnSave').addEventListener('click', handleSave);
        document.getElementById('btnDownload').addEventListener('click', handleDownload);
        document.getElementById('btnHelp').addEventListener('click', showHelp);

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Store.setUi({ activeScreen: btn.dataset.screen });
            });
        });

        document.getElementById('gridMode').addEventListener('change', (e) => {
            Store.setUi({ gridMode: e.target.value });
        });

        document.getElementById('rangeMode').addEventListener('change', (e) => {
            Store.setUi({ rangeMode: e.target.value });
        });

        document.getElementById('anchorDate').addEventListener('change', (e) => {
            Store.setUi({ anchorDate: e.target.value });
        });

        document.getElementById('filterText').addEventListener('input', (e) => {
            Store.setUi({ filterText: e.target.value });
        });

        document.getElementById('ganttDate').addEventListener('change', (e) => {
            Store.setUi({ ganttDate: e.target.value });
        });

        document.getElementById('admin3Date').addEventListener('change', (e) => {
            Store.setUi({ admin3Date: e.target.value });
        });

        document.getElementById('admin3WorkerFilter').addEventListener('change', (e) => {
            Store.setUi({ admin3Worker: e.target.value });
        });

        window.addEventListener('beforeunload', (e) => {
            const state = Store.getState();
            if (state.dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    async function handleLoad() {
        try {
            const result = await CsvIO.loadFromFileDialog();

            if (result.errors.length > 0) {
                if (result.errors[0] === '繧ｭ繝｣繝ｳ繧ｻ繝ｫ縺輔ｌ縺ｾ縺励◆') {
                    return;
                }

                const errorMessages = result.errors.slice(0, 5).join('\n');
                const more = result.errors.length > 5 ? `\n...莉・${result.errors.length - 5} 莉ｶ` : '';
                UI.showToast(`隱ｭ霎ｼ繧ｨ繝ｩ繝ｼ:\n${errorMessages}${more}`, 'error', 5000);

                if (result.records.length === 0) {
                    return;
                }
            }

            const validation = Rules.validateAll(result.records);
            if (!validation.valid) {
                const warnings = validation.errors.slice(0, 3).join('\n');
                UI.showToast(`讀懆ｨｼ隴ｦ蜻・\n${warnings}`, 'warning', 4000);
            }

            Store.loadRecords(result.records, result.fileName, result.fileHandle);
            UI.showToast(`${result.fileName} を読み込みました（${result.records.length}件）`, 'success');
        } catch (err) {
            console.error('Load failed:', err);
            UI.showToast('繝輔ぃ繧､繝ｫ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆', 'error');
        }
    }

    async function handleSave() {
        try {
            const success = await CsvIO.save();
            if (success) {
                UI.showToast('菫晏ｭ倥＠縺ｾ縺励◆', 'success');
            }
        } catch (err) {
            console.error('Save failed:', err);
            UI.showToast('菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆', 'error');
        }
    }

    function handleDownload() {
        CsvIO.downloadSave();
        UI.showToast('繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｾ縺励◆', 'success');
    }

    function showHelp() {
        const helpContent = `
      <h3>蝓ｺ譛ｬ謫堺ｽ・/h3>
      <ul>
        <li><strong>CSV隱ｭ霎ｼ</strong>: 繝懊ち繝ｳ繧偵け繝ｪ繝・け縺励※CSV繧定ｪｭ縺ｿ霎ｼ縺ｿ縺ｾ縺吶・/li>
        <li><strong>菫晏ｭ・/strong>: 螟画峩繧貞・繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ倥＠縺ｾ縺吶・/li>
        <li><strong>菫晏ｭ・蜷榊燕繧剃ｻ倥￠縺ｦ)</strong>: CSV繧偵ム繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｾ縺吶・/li>
      </ul>

      <h3>邂｡逅・判髱｢1</h3>
      <ul>
        <li>蟾･遞・菴懈･ｭ閠・・騾ｱ繝ｻ譛医げ繝ｪ繝・ラ陦ｨ遉ｺ</li>
      </ul>

      <h3>邂｡逅・判髱｢2</h3>
      <ul>
        <li>譌･蜊倅ｽ阪ぎ繝ｳ繝茨ｼ井ｽ懈･ｭ閠・｡鯉ｼ・/li>
      </ul>

      <h3>邂｡逅・判髱｢3</h3>
      <ul>
        <li>騾ｱ谺｡繧ｬ繝ｳ繝茨ｼ育ｸｦ:譌･莉・/ 讓ｪ:譎る俣・・/li>
        <li>菴懈･ｭ閠・ヵ繧｣繝ｫ繧ｿ繝ｼ縲√ヰ繝ｼ霑ｽ蜉/繝峨Λ繝・げ邱ｨ髮・蜑企勁</li>
      </ul>
    `;

        UI.openModal('ヘルプ', helpContent);
    }

    function handleStateChange(state) {
        UI.updateFileInfo(state.fileName, state.dirty);
        UI.updateButtons(state.records.length > 0);

        updateActiveScreen(state.ui.activeScreen);
        syncUIControls(state.ui);
        syncAdmin3WorkerOptions(state);

        renderAll();
    }

    /**
     * @param {'grid'|'gantt'|'admin3'} screen
     */
    function updateActiveScreen(screen) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screen);
        });

        document.getElementById('screenGrid').classList.toggle('active', screen === 'grid');
        document.getElementById('screenGantt').classList.toggle('active', screen === 'gantt');
        document.getElementById('screenAdmin3').classList.toggle('active', screen === 'admin3');
    }

    function syncUIControls(ui) {
        const gridMode = document.getElementById('gridMode');
        const rangeMode = document.getElementById('rangeMode');
        const anchorDate = document.getElementById('anchorDate');
        const ganttDate = document.getElementById('ganttDate');
        const admin3Date = document.getElementById('admin3Date');

        if (gridMode.value !== ui.gridMode) gridMode.value = ui.gridMode;
        if (rangeMode.value !== ui.rangeMode) rangeMode.value = ui.rangeMode;
        if (anchorDate.value !== ui.anchorDate) anchorDate.value = ui.anchorDate;
        if (ganttDate.value !== ui.ganttDate) ganttDate.value = ui.ganttDate;
        if (admin3Date.value !== ui.admin3Date) admin3Date.value = ui.admin3Date;
    }

    function syncAdmin3WorkerOptions(state) {
        const select = document.getElementById('admin3WorkerFilter');
        if (!select) return;

        const workers = state.workers || [];
        const current = state.ui.admin3Worker;

        const optionHtml = ['<option value="">菴懈･ｭ閠・ｒ驕ｸ謚・/option>']
            .concat(workers.map(w => `<option value="${escapeAttr(w)}">${escapeHtml(w)}</option>`))
            .join('');

        if (select.innerHTML !== optionHtml) {
            select.innerHTML = optionHtml;
        }

        if (current && workers.includes(current)) {
            if (select.value !== current) {
                select.value = current;
            }
            return;
        }

        if (workers.length === 0) {
            if (current !== '') {
                Store.setUi({ admin3Worker: '' });
                return;
            }
            select.value = '';
            return;
        }

        const nextWorker = workers[0];
        if (current !== nextWorker) {
            Store.setUi({ admin3Worker: nextWorker });
            return;
        }

        if (select.value !== nextWorker) {
            select.value = nextWorker;
        }
    }

    function renderAll() {
        const state = Store.getState();

        if (state.ui.activeScreen === 'grid') {
            UIGrid.render();
            return;
        }

        if (state.ui.activeScreen === 'gantt') {
            UIGantt.render();
            return;
        }

        UIAdmin3.render();
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.init().catch((err) => {
        console.error('Init failed:', err);
        UI.showToast('初期化に失敗しました', 'error');
    });
});

