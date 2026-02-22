/**
 * ui_gantt.js - 邂｡逅・判髱｢2・医ぎ繝ｳ繝医メ繝｣繝ｼ繝郁｡ｨ遉ｺ・・
 * DayPilot遲峨・繝ｩ繧､繝悶Λ繝ｪ繧剃ｽｿ繧上↑縺・ｻｽ驥丞ｮ溯｣・
 */

const UIGantt = (() => {
    const ganttContainer = document.getElementById('ganttContainer');

    // 繝峨Λ繝・げ迥ｶ諷・
    let dragState = null;

    /**
     * 繧ｬ繝ｳ繝医ｒ謠冗判
     */
    function render() {
        const state = Store.getState();

        if (state.records.length === 0) {
            ganttContainer.innerHTML = '<p class="placeholder-text">CSV繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ繧薙〒縺上□縺輔＞</p>';
            return;
        }

        const ganttData = Transform.generateGanttData(state.ui.ganttDate);
        const timeSlots = Transform.generateTimeSlots();

        const html = buildGanttHTML(ganttData, timeSlots, state.ui.ganttDate);
        ganttContainer.innerHTML = html;

        // 繧､繝吶Φ繝医ワ繝ｳ繝峨Λ險ｭ螳・
        attachEventHandlers();
    }

    /**
     * 繧ｬ繝ｳ繝・TML繧呈ｧ狗ｯ・
     * @param {Object} ganttData
     * @param {string[]} timeSlots
     * @param {string} ganttDate
     * @returns {string}
     */
    function buildGanttHTML(ganttData, timeSlots, ganttDate) {
        const { workers, events } = ganttData;
        const config = Rules.getConfig();
        const totalMinutes = Model.timeToMinutes(config.businessEnd) - Model.timeToMinutes(config.businessStart);

        let html = '<div class="gantt-wrapper">';

        // 譎る俣霆ｸ繝倥ャ繝繝ｼ
        html += '<div class="gantt-time-header gantt-row">';
        html += '<div class="gantt-row-header">作業者</div>';
        html += '<div class="gantt-time-slots">';
        for (const slot of timeSlots) {
            html += `<div class="gantt-time-slot">${slot}</div>`;
        }
        html += '</div></div>';

        // 菴懈･ｭ閠・｡・
        for (const worker of workers) {
            const workerEvents = events.filter(e => e.worker === worker);
            html += buildWorkerRowHTML(worker, workerEvents, totalMinutes, config);
        }

        html += '</div>';

        // 霑ｽ蜉繝懊ち繝ｳ
        html += `<div style="margin-top: 1rem;">
      <button class="btn btn-primary" id="btnAddBar">+ 譁ｰ隕剰ｿｽ蜉</button>
    </div>`;

        return html;
    }

    /**
     * 菴懈･ｭ閠・｡粂TML繧呈ｧ狗ｯ・
     * @param {string} worker
     * @param {Object[]} events
     * @param {number} totalMinutes
     * @param {Object} config
     * @returns {string}
     */
    function buildWorkerRowHTML(worker, events, totalMinutes, config) {
        const startOffset = Model.timeToMinutes(config.businessStart);

        let html = '<div class="gantt-row">';
        html += `<div class="gantt-row-header" data-worker="${escapeAttr(worker)}">${escapeHtml(worker)}</div>`;
        html += `<div class="gantt-row-content" data-worker="${escapeAttr(worker)}">`;

        // 繝舌・謠冗判
        for (const event of events) {
            const eventStart = Model.timeToMinutes(event.start) - startOffset;
            const eventEnd = Model.timeToMinutes(event.end) - startOffset;
            const left = (eventStart / totalMinutes) * 100;
            const width = ((eventEnd - eventStart) / totalMinutes) * 100;

            const color = event.color || getProcessColor(event.process);

            html += `<div class="gantt-bar" 
        data-id="${event.id}"
        data-worker="${escapeAttr(event.worker)}"
        data-process="${escapeAttr(event.process)}"
        data-start="${event.start}"
        data-end="${event.end}"
        style="left: ${left}%; width: ${width}%; background: ${color};"
        title="${escapeAttr(`${event.process} (${event.start}-${event.end})${event.note ? '\n' + event.note : ''}`)}"
      >${escapeHtml(event.process)}</div>`;
        }

        html += '</div></div>';
        return html;
    }

    /**
     * 蟾･遞九＃縺ｨ縺ｫ濶ｲ繧貞牡繧雁ｽ薙※
     * @param {string} process
     * @returns {string}
     */
    function getProcessColor(process) {
        const colors = [
            '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
        ];
        const state = Store.getState();
        const idx = state.processes.indexOf(process);
        return colors[idx % colors.length];
    }

    /**
     * 繧､繝吶Φ繝医ワ繝ｳ繝峨Λ繧定ｨｭ螳・
     */
    function attachEventHandlers() {
        // 繝舌・縺ｮ繝峨Λ繝・げ
        const bars = ganttContainer.querySelectorAll('.gantt-bar');
        bars.forEach(bar => {
            bar.addEventListener('mousedown', handleBarMouseDown);
            bar.addEventListener('dblclick', handleBarDoubleClick);
        });

        // 譁ｰ隕剰ｿｽ蜉繝懊ち繝ｳ
        const btnAdd = document.getElementById('btnAddBar');
        if (btnAdd) {
            btnAdd.addEventListener('click', openAddModal);
        }

        // 繧ｰ繝ｭ繝ｼ繝舌Ν繝槭え繧ｹ繧､繝吶Φ繝・
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * 繝舌・縺ｮ繝槭え繧ｹ繝繧ｦ繝ｳ・医ラ繝ｩ繝・げ髢句ｧ具ｼ・
     * @param {MouseEvent} e
     */
    function handleBarMouseDown(e) {
        const bar = e.target.closest('.gantt-bar');
        if (!bar) return;

        e.preventDefault();

        const rowContent = bar.parentElement;
        const rect = rowContent.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();

        // 繝ｪ繧ｵ繧､繧ｺ蛻､螳夲ｼ育ｫｯ10px莉･蜀・ｼ・
        const isLeftResize = e.clientX - barRect.left < 10;
        const isRightResize = barRect.right - e.clientX < 10;

        dragState = {
            bar,
            id: bar.dataset.id,
            originalWorker: bar.dataset.worker,
            startX: e.clientX,
            startY: e.clientY,
            barLeft: barRect.left - rect.left,
            barWidth: barRect.width,
            rowWidth: rect.width,
            mode: isLeftResize ? 'resize-left' : isRightResize ? 'resize-right' : 'move'
        };

        bar.classList.add('dragging');
    }

    /**
     * 繝槭え繧ｹ遘ｻ蜍・
     * @param {MouseEvent} e
     */
    function handleMouseMove(e) {
        if (!dragState) return;

        const deltaX = e.clientX - dragState.startX;
        const config = Rules.getConfig();
        const totalMinutes = Model.timeToMinutes(config.businessEnd) - Model.timeToMinutes(config.businessStart);
        const pxPerMinute = dragState.rowWidth / totalMinutes;

        if (dragState.mode === 'move') {
            const newLeft = Math.max(0, Math.min(dragState.rowWidth - dragState.barWidth, dragState.barLeft + deltaX));
            dragState.bar.style.left = `${(newLeft / dragState.rowWidth) * 100}%`;
        } else if (dragState.mode === 'resize-right') {
            const newWidth = Math.max(pxPerMinute * config.timeStep, dragState.barWidth + deltaX);
            dragState.bar.style.width = `${(newWidth / dragState.rowWidth) * 100}%`;
        } else if (dragState.mode === 'resize-left') {
            const newLeft = Math.max(0, dragState.barLeft + deltaX);
            const widthDelta = dragState.barLeft - newLeft;
            const newWidth = Math.max(pxPerMinute * config.timeStep, dragState.barWidth + widthDelta);
            dragState.bar.style.left = `${(newLeft / dragState.rowWidth) * 100}%`;
            dragState.bar.style.width = `${(newWidth / dragState.rowWidth) * 100}%`;
        }
    }

    /**
     * 繝槭え繧ｹ繧｢繝・・・医ラ繝ｩ繝・げ邨ゆｺ・ｼ・
     * @param {MouseEvent} e
     */
    function handleMouseUp(e) {
        if (!dragState) return;

        dragState.bar.classList.remove('dragging');

        // 譁ｰ縺励＞譎る俣繧定ｨ育ｮ・
        const config = Rules.getConfig();
        const totalMinutes = Model.timeToMinutes(config.businessEnd) - Model.timeToMinutes(config.businessStart);
        const startOffset = Model.timeToMinutes(config.businessStart);

        const barRect = dragState.bar.getBoundingClientRect();
        const rowContent = dragState.bar.parentElement;
        const rowRect = rowContent.getBoundingClientRect();

        const leftPct = (barRect.left - rowRect.left) / rowRect.width;
        const widthPct = barRect.width / rowRect.width;

        let newStartMin = Math.round((leftPct * totalMinutes + startOffset) / config.timeStep) * config.timeStep;
        let newEndMin = Math.round(((leftPct + widthPct) * totalMinutes + startOffset) / config.timeStep) * config.timeStep;

        // 蝟ｶ讌ｭ譎る俣蜀・↓蜿弱ａ繧・
        newStartMin = Math.max(Model.timeToMinutes(config.businessStart), newStartMin);
        newEndMin = Math.min(Model.timeToMinutes(config.businessEnd), newEndMin);

        if (newStartMin >= newEndMin) {
            newEndMin = newStartMin + config.timeStep;
        }

        const newStart = Model.minutesToTime(newStartMin);
        const newEnd = Model.minutesToTime(newEndMin);

        // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
        const state = Store.getState();
        const record = state.byId.get(dragState.id);
        if (record) {
            const updatedRecord = { ...record, start: newStart, end: newEnd };
            const validation = Rules.validateRecord(updatedRecord, dragState.id);

            if (!validation.valid) {
                UI.showToast(validation.errors[0], 'error');
                render(); // 蜈・↓謌ｻ縺・
            } else {
                Store.updateRecord(dragState.id, { start: newStart, end: newEnd });
                UI.showToast(`${newStart} - ${newEnd} 縺ｫ螟画峩縺励∪縺励◆`, 'success');
            }
        }

        dragState = null;
    }

    /**
     * 繝舌・繝繝悶Ν繧ｯ繝ｪ繝・け・亥炎髯､遒ｺ隱搾ｼ・
     * @param {MouseEvent} e
     */
    async function handleBarDoubleClick(e) {
        const bar = e.target.closest('.gantt-bar');
        if (!bar) return;

        const id = bar.dataset.id;
        const process = bar.dataset.process;
        const worker = bar.dataset.worker;

        const confirmed = await UI.confirm(
            `${worker}さんの「${process}」を削除しますか？`
        );

        if (confirmed) {
            Store.deleteRecord(id);
            UI.showToast('蜑企勁縺励∪縺励◆', 'success');
        }
    }

    /**
     * 譁ｰ隕剰ｿｽ蜉繝｢繝ｼ繝繝ｫ繧帝幕縺・
     */
    function openAddModal() {
        const state = Store.getState();
        const config = Rules.getConfig();

        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '1rem';

        // 菴懈･ｭ閠・∈謚・
        const workerGroup = createSelectGroup('作業者', 'newWorker', state.workers);
        container.appendChild(workerGroup);

        // 蟾･遞矩∈謚・
        const processGroup = createSelectGroup('工程', 'newProcess', state.processes);
        container.appendChild(processGroup);

        // 譎る俣蜈･蜉・
        const timeGroup = document.createElement('div');
        timeGroup.style.display = 'flex';
        timeGroup.style.gap = '1rem';

        const startGroup = createTimeInput('開始', 'newStart', config.businessStart);
        const endGroup = createTimeInput('終了', 'newEnd', config.businessEnd);

        timeGroup.appendChild(startGroup);
        timeGroup.appendChild(endGroup);
        container.appendChild(timeGroup);

        UI.openModal('譁ｰ隕剰ｿｽ蜉', container, () => {
            const worker = document.getElementById('newWorker').value;
            const process = document.getElementById('newProcess').value;
            const start = document.getElementById('newStart').value;
            const end = document.getElementById('newEnd').value;

            if (!worker || !process) {
                UI.showToast('菴懈･ｭ閠・→蟾･遞九ｒ驕ｸ謚槭＠縺ｦ縺上□縺輔＞', 'error');
                return;
            }

            const ganttDate = state.ui.ganttDate;
            const newRecord = {
                id: Model.generateId(ganttDate, worker, process, start, end),
                date: ganttDate,
                worker,
                process,
                start,
                end,
                note: ''
            };

            const validation = Rules.validateRecord(newRecord);
            if (!validation.valid) {
                UI.showToast(validation.errors[0], 'error');
                return;
            }

            Store.addRecord(newRecord);
            UI.showToast('霑ｽ蜉縺励∪縺励◆', 'success');
            UI.closeModal();
        });
    }

    /**
     * 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ繧ｰ繝ｫ繝ｼ繝励ｒ菴懈・
     */
    function createSelectGroup(label, id, options) {
        const group = document.createElement('div');
        group.className = 'control-group';
        group.style.flexDirection = 'column';
        group.style.alignItems = 'flex-start';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.htmlFor = id;

        const select = document.createElement('select');
        select.id = id;
        select.style.width = '100%';
        select.style.padding = '0.5rem';

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            select.appendChild(option);
        });

        group.appendChild(labelEl);
        group.appendChild(select);
        return group;
    }

    /**
     * 譎る俣蜈･蜉帙げ繝ｫ繝ｼ繝励ｒ菴懈・
     */
    function createTimeInput(label, id, defaultValue) {
        const group = document.createElement('div');
        group.className = 'control-group';
        group.style.flexDirection = 'column';
        group.style.alignItems = 'flex-start';
        group.style.flex = '1';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.htmlFor = id;

        const input = document.createElement('input');
        input.type = 'time';
        input.id = id;
        input.value = defaultValue;
        input.style.width = '100%';
        input.style.padding = '0.5rem';

        group.appendChild(labelEl);
        group.appendChild(input);
        return group;
    }

    /**
     * HTML繧ｨ繧ｹ繧ｱ繝ｼ繝・
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * 螻樊ｧ蛟､繧ｨ繧ｹ繧ｱ繝ｼ繝・
     */
    function escapeAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    return {
        render
    };
})();
