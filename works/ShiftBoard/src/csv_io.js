/**
 * csv_io.js - CSV読込・書出・ファイルハンドル管理
 */

const CsvIO = (() => {
    /**
     * ファイル選択ダイアログを開いてCSVを読み込む
     * @returns {Promise<{records: ScheduleRecord[], fileName: string, fileHandle: FileSystemFileHandle|null, errors: string[]}>}
     */
    async function loadFromFileDialog() {
        // File System Access API対応チェック
        if ('showOpenFilePicker' in window) {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'CSV Files',
                        accept: { 'text/csv': ['.csv'] }
                    }],
                    multiple: false
                });
                const file = await handle.getFile();
                const text = await file.text();
                const result = parseCSV(text);
                return {
                    ...result,
                    fileName: file.name,
                    fileHandle: handle
                };
            } catch (err) {
                if (err.name === 'AbortError') {
                    return { records: [], fileName: '', fileHandle: null, errors: ['キャンセルされました'] };
                }
                throw err;
            }
        } else {
            // フォールバック: input[file]を使用
            return new Promise((resolve) => {
                const input = document.getElementById('fileInput');
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) {
                        resolve({ records: [], fileName: '', fileHandle: null, errors: ['ファイルが選択されていません'] });
                        return;
                    }
                    const text = await file.text();
                    const result = parseCSV(text);
                    resolve({
                        ...result,
                        fileName: file.name,
                        fileHandle: null
                    });
                    input.value = '';
                };
                input.click();
            });
        }
    }

    /**
     * CSVテキストをパース
     * @param {string} text
     * @returns {{records: ScheduleRecord[], errors: string[]}}
     */
    function parseCSV(text) {
        const result = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim().toLowerCase()
        });

        if (result.errors.length > 0) {
            const parseErrors = result.errors.map(e => `CSV解析エラー: ${e.message} (行${e.row})`);
            return { records: [], errors: parseErrors };
        }

        const { records, errors } = Model.normalizeAll(result.data);
        return { records, errors };
    }

    /**
     * レコードをCSVテキストに変換
     * @param {ScheduleRecord[]} records
     * @returns {string}
     */
    function toCSVText(records) {
        const data = Model.toCSVData(records);
        return Papa.unparse(data, {
            header: true,
            columns: ['date', 'worker', 'process', 'start', 'end', 'id', 'note']
        });
    }

    /**
     * File System Access APIで上書き保存
     * @param {FileSystemFileHandle} fileHandle
     * @param {string} csvText
     * @returns {Promise<boolean>}
     */
    async function saveToHandle(fileHandle, csvText) {
        try {
            const writable = await fileHandle.createWritable();
            await writable.write(csvText);
            await writable.close();
            return true;
        } catch (err) {
            console.error('Save failed:', err);
            return false;
        }
    }

    /**
     * 新規保存ダイアログを開いて保存
     * @param {string} csvText
     * @param {string} suggestedName
     * @returns {Promise<{success: boolean, fileHandle: FileSystemFileHandle|null}>}
     */
    async function saveAsDialog(csvText, suggestedName) {
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: suggestedName || 'shift_data.csv',
                    types: [{
                        description: 'CSV Files',
                        accept: { 'text/csv': ['.csv'] }
                    }]
                });
                const success = await saveToHandle(handle, csvText);
                return { success, fileHandle: success ? handle : null };
            } catch (err) {
                if (err.name === 'AbortError') {
                    return { success: false, fileHandle: null };
                }
                throw err;
            }
        } else {
            // フォールバック: ダウンロード
            downloadCSV(csvText, suggestedName);
            return { success: true, fileHandle: null };
        }
    }

    /**
     * CSVをダウンロード（互換モード）
     * @param {string} csvText
     * @param {string} fileName
     */
    function downloadCSV(csvText, fileName) {
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'shift_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 保存処理（上書きまたは新規）
     * @returns {Promise<boolean>}
     */
    async function save() {
        const state = Store.getState();
        const csvText = toCSVText(state.records);

        if (state.fileHandle) {
            // 既存ハンドルで上書き
            const success = await saveToHandle(state.fileHandle, csvText);
            if (success) {
                Store.markSaved();
                return true;
            }
            // 失敗時はダイアログで新規保存を試みる
            UI.showToast('上書き保存に失敗しました。別名で保存してください。', 'warning');
        }

        // 新規保存ダイアログ
        const { success, fileHandle } = await saveAsDialog(csvText, state.fileName);
        if (success && fileHandle) {
            // 新しいハンドルをStoreに反映
            const currentState = Store.getState();
            Store.loadRecords(currentState.records, currentState.fileName, fileHandle);
            Store.markSaved();
        } else if (success) {
            // ダウンロード保存の場合
            Store.markSaved();
        }
        return success;
    }

    /**
     * 互換保存（常にダウンロード）
     */
    function downloadSave() {
        const state = Store.getState();
        const csvText = toCSVText(state.records);
        downloadCSV(csvText, state.fileName || 'shift_data.csv');
        Store.markSaved();
    }

    return {
        loadFromFileDialog,
        parseCSV,
        toCSVText,
        save,
        downloadSave
    };
})();
