/**
 * ui_common.js - 蜈ｱ騾啅I繧ｳ繝ｳ繝昴・繝阪Φ繝茨ｼ医ヨ繝ｼ繧ｹ繝医√Δ繝ｼ繝繝ｫ縲∫｢ｺ隱阪ム繧､繧｢繝ｭ繧ｰ・・
 */

const UI = (() => {
    const toastContainer = document.getElementById('toastContainer');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnConfirmModal = document.getElementById('btnConfirmModal');

    let modalConfirmCallback = null;

    /**
     * 繝医・繧ｹ繝磯夂衍繧定｡ｨ遉ｺ
     * @param {string} message
     * @param {'info'|'success'|'error'|'warning'} type
     * @param {number} duration - 繝溘Μ遘・
     */
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * 繝｢繝ｼ繝繝ｫ繧帝幕縺・
     * @param {string} title
     * @param {string|HTMLElement} content
     * @param {Function} [onConfirm]
     */
    function openModal(title, content, onConfirm = null) {
        modalTitle.textContent = title;

        if (typeof content === 'string') {
            modalBody.innerHTML = content;
        } else {
            modalBody.innerHTML = '';
            modalBody.appendChild(content);
        }

        modalConfirmCallback = onConfirm;
        modalOverlay.hidden = false;

        // 遒ｺ隱阪・繧ｿ繝ｳ縺ｮ陦ｨ遉ｺ/髱櫁｡ｨ遉ｺ
        if (onConfirm) {
            btnConfirmModal.hidden = false;
            btnCancelModal.textContent = '繧ｭ繝｣繝ｳ繧ｻ繝ｫ';
        } else {
            btnConfirmModal.hidden = true;
            btnCancelModal.textContent = '閉じる';
        }
    }

    /**
     * 繝｢繝ｼ繝繝ｫ繧帝哩縺倥ｋ
     */
    function closeModal() {
        modalOverlay.hidden = true;
        modalBody.innerHTML = '';
        modalConfirmCallback = null;
    }

    /**
     * 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ繧定｡ｨ遉ｺ
     * @param {string} message
     * @returns {Promise<boolean>}
     */
    function confirm(message) {
        return new Promise((resolve) => {
            const messageEl = document.createElement('p');
            messageEl.textContent = message;

            openModal('確認', messageEl, () => {
                closeModal();
                resolve(true);
            });

            // キャンセル時の処理を一時的に上書き
            const originalCancel = btnCancelModal.onclick;
            btnCancelModal.onclick = () => {
                closeModal();
                resolve(false);
                btnCancelModal.onclick = originalCancel;
            };
        });
    }

    /**
     * 繝√ぉ繝・け繝ｪ繧ｹ繝亥ｽ｢蠑上・邱ｨ髮・Δ繝ｼ繝繝ｫ繧定｡ｨ遉ｺ
     * @param {string} title
     * @param {string[]} allItems - 蜈ｨ驕ｸ謚櫁い
     * @param {string[]} selectedItems - 驕ｸ謚樊ｸ医∩鬆・岼
     * @param {Function} onConfirm - (selectedItems: string[]) => void
     */
    function openChecklistModal(title, allItems, selectedItems, onConfirm) {
        const container = document.createElement('div');
        container.className = 'checklist';

        const selectedSet = new Set(selectedItems);

        for (const item of allItems) {
            const label = document.createElement('label');
            label.className = 'checklist-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item;
            checkbox.checked = selectedSet.has(item);

            const text = document.createTextNode(item);

            label.appendChild(checkbox);
            label.appendChild(text);
            container.appendChild(label);
        }

        openModal(title, container, () => {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
            const newSelected = Array.from(checkboxes).map(cb => cb.value);
            onConfirm(newSelected);
            closeModal();
        });
    }

    /**
     * 譁ｰ隕剰ｿｽ蜉逕ｨ蜈･蜉帙Δ繝ｼ繝繝ｫ
     * @param {string} title
     * @param {Object} fields - {label: defaultValue}
     * @param {Function} onConfirm - (values: Object) => void
     */
    function openInputModal(title, fields, onConfirm) {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '1rem';

        const inputs = {};

        for (const [label, defaultValue] of Object.entries(fields)) {
            const group = document.createElement('div');
            group.className = 'control-group';
            group.style.flexDirection = 'column';
            group.style.alignItems = 'flex-start';

            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            labelEl.style.marginBottom = '0.25rem';

            const input = document.createElement('input');
            input.type = 'text';
            input.value = defaultValue || '';
            input.style.width = '100%';
            input.style.padding = '0.5rem';
            input.style.border = '1px solid var(--border-color)';
            input.style.borderRadius = '4px';

            inputs[label] = input;

            group.appendChild(labelEl);
            group.appendChild(input);
            container.appendChild(group);
        }

        openModal(title, container, () => {
            const values = {};
            for (const [label, input] of Object.entries(inputs)) {
                values[label] = input.value.trim();
            }
            onConfirm(values);
            closeModal();
        });
    }

    /**
     * 繝輔ぃ繧､繝ｫ諠・ｱ繧呈峩譁ｰ
     * @param {string} fileName
     * @param {boolean} dirty
     */
    function updateFileInfo(fileName, dirty) {
        const fileInfo = document.getElementById('fileInfo');
        const dirtyIndicator = document.getElementById('dirtyIndicator');

        fileInfo.textContent = fileName || 'ファイル未選択';
        dirtyIndicator.hidden = !dirty;
    }

    /**
     * 繝懊ち繝ｳ譛牙柑/辟｡蜉ｹ繧貞・繧頑崛縺・
     * @param {boolean} hasData
     */
    function updateButtons(hasData) {
        document.getElementById('btnSave').disabled = !hasData;
        document.getElementById('btnDownload').disabled = !hasData;
    }

    // 繧､繝吶Φ繝医Μ繧ｹ繝翫・險ｭ螳・
    function init() {
        btnCloseModal.addEventListener('click', closeModal);
        btnCancelModal.addEventListener('click', closeModal);
        btnConfirmModal.addEventListener('click', () => {
            if (modalConfirmCallback) {
                modalConfirmCallback();
            }
        });

        // 繧ｪ繝ｼ繝舌・繝ｬ繧､繧ｯ繝ｪ繝・け縺ｧ髢峨§繧・
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });

        // ESC繧ｭ繝ｼ縺ｧ髢峨§繧・
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modalOverlay.hidden) {
                closeModal();
            }
        });
    }

    return {
        init,
        showToast,
        openModal,
        closeModal,
        confirm,
        openChecklistModal,
        openInputModal,
        updateFileInfo,
        updateButtons
    };
})();


