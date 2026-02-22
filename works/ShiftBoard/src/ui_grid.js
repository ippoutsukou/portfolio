/**
 * ui_grid.js - 管理画面1（グリッド表示）
 */

const UIGrid = (() => {
    const gridContainer = document.getElementById('gridContainer');

    /**
     * グリッドを描画
     */
    function render() {
        const state = Store.getState();

        if (state.records.length === 0) {
            gridContainer.innerHTML = '<p class="placeholder-text">CSVファイルを読み込んでください</p>';
            return;
        }

        const dates = Transform.generateDates(state.ui.anchorDate, state.ui.rangeMode);

        let gridData;
        if (state.ui.gridMode === 'process') {
            gridData = Transform.generateProcessGrid(dates, state.ui.filterText);
        } else {
            gridData = Transform.generateWorkerGrid(dates, state.ui.filterText);
        }

        const html = buildTableHTML(gridData, state.ui.gridMode);
        gridContainer.innerHTML = html;

        // セルクリックイベント設定
        attachCellClickHandlers(state.ui.gridMode);
    }

    /**
     * テーブルHTMLを構築
     * @param {Object} gridData
     * @param {'process'|'worker'} mode
     * @returns {string}
     */
    function buildTableHTML(gridData, mode) {
        const { rows, dates, cells } = gridData;

        if (rows.length === 0) {
            return '<p class="placeholder-text">表示するデータがありません</p>';
        }

        let html = '<table class="schedule-grid">';

        // ヘッダー行
        html += '<thead><tr>';
        html += `<th>${mode === 'process' ? '工程' : '作業者'}</th>`;
        for (const date of dates) {
            html += `<th>${Transform.formatDateHeader(date)}</th>`;
        }
        html += '</tr></thead>';

        // データ行
        html += '<tbody>';
        for (const row of rows) {
            html += '<tr>';
            html += `<td>${escapeHtml(row)}</td>`;

            for (const date of dates) {
                const key = `${row}|${date}`;
                const items = cells.get(key) || [];
                html += buildCellHTML(key, items, mode);
            }

            html += '</tr>';
        }
        html += '</tbody></table>';

        return html;
    }

    /**
     * セルHTMLを構築
     * @param {string} key
     * @param {Object[]} items
     * @param {'process'|'worker'} mode
     * @returns {string}
     */
    function buildCellHTML(key, items, mode) {
        let content = '<div class="cell-content">';

        if (items.length === 0) {
            content += '<span class="cell-empty">-</span>';
        } else {
            for (const item of items) {
                const label = mode === 'process' ? item.worker : item.process;
                const time = `${item.start}-${item.end}`;
                content += `<span class="cell-tag with-time" data-id="${item.id}" title="${time}">${escapeHtml(label)}</span>`;
            }
        }

        content += '</div>';
        return `<td data-key="${key}">${content}</td>`;
    }

    /**
     * セルクリックハンドラを設定
     * @param {'process'|'worker'} mode
     */
    function attachCellClickHandlers(mode) {
        const cells = gridContainer.querySelectorAll('td[data-key]');

        cells.forEach(cell => {
            cell.addEventListener('click', () => {
                const key = cell.dataset.key;
                const [rowValue, date] = key.split('|');
                openEditModal(rowValue, date, mode);
            });
        });
    }

    /**
     * 編集モーダルを開く
     * @param {string} rowValue - 工程名または作業者名
     * @param {string} date
     * @param {'process'|'worker'} mode
     */
    function openEditModal(rowValue, date, mode) {
        const state = Store.getState();

        if (mode === 'process') {
            // 工程×日付 → 作業者を編集
            const records = Store.getRecordsByProcessDate(rowValue, date);
            const currentWorkers = records.map(r => r.worker);

            UI.openChecklistModal(
                `${rowValue} - ${Transform.formatDateHeader(date)} の担当者`,
                state.workers,
                currentWorkers,
                (selectedWorkers) => {
                    updateAssignments(rowValue, date, mode, currentWorkers, selectedWorkers, records);
                }
            );
        } else {
            // 作業者×日付 → 工程を編集
            const records = Store.getRecordsByWorkerDate(rowValue, date);
            const currentProcesses = records.map(r => r.process);

            UI.openChecklistModal(
                `${rowValue} - ${Transform.formatDateHeader(date)} の工程`,
                state.processes,
                currentProcesses,
                (selectedProcesses) => {
                    updateAssignments(rowValue, date, mode, currentProcesses, selectedProcesses, records);
                }
            );
        }
    }

    /**
     * 割当を更新
     */
    function updateAssignments(rowValue, date, mode, current, selected, existingRecords) {
        const currentSet = new Set(current);
        const selectedSet = new Set(selected);

        // 削除対象
        const toRemove = current.filter(item => !selectedSet.has(item));

        // 追加対象
        const toAdd = selected.filter(item => !currentSet.has(item));

        // 削除
        for (const item of toRemove) {
            const record = existingRecords.find(r =>
                mode === 'process' ? r.worker === item : r.process === item
            );
            if (record) {
                Store.deleteRecord(record.id);
            }
        }

        // 追加（デフォルト時間で追加）
        const config = Rules.getConfig();
        for (const item of toAdd) {
            const newRecord = {
                id: Model.generateId(date,
                    mode === 'process' ? item : rowValue,
                    mode === 'process' ? rowValue : item,
                    config.businessStart,
                    config.businessEnd),
                date: date,
                worker: mode === 'process' ? item : rowValue,
                process: mode === 'process' ? rowValue : item,
                start: config.businessStart,
                end: config.businessEnd,
                note: ''
            };

            // バリデーション
            const validation = Rules.validateRecord(newRecord);
            if (!validation.valid) {
                UI.showToast(validation.errors[0], 'error');
                continue;
            }

            Store.addRecord(newRecord);
        }

        if (toRemove.length > 0 || toAdd.length > 0) {
            UI.showToast('更新しました', 'success');
        }
    }

    /**
     * HTMLエスケープ
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return {
        render
    };
})();
