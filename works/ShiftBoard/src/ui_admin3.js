/**
 * ui_admin3.js - 管理画面3（週次ガント: 縦=日付, 横=時間）
 */

const UIAdmin3 = (() => {
    const container = document.getElementById('admin3Container');

    let dragState = null;
    let globalMouseHandlersBound = false;

    function render() {
        const state = Store.getState();

        if (state.records.length === 0) {
            container.innerHTML = '<p class="placeholder-text">CSVファイルを読み込んでください</p>';
            return;
        }

        if (!state.ui.admin3Worker) {
            container.innerHTML = '<p class="placeholder-text">作業者を選択してください</p>';
            return;
        }

        const data = Transform.generateAdmin3WeekData(state.ui.admin3Date, state.ui.admin3Worker);
        const timeSlots = Transform.generateTimeSlots();

        container.innerHTML = buildWeeklyGanttHTML(data, timeSlots);
        attachEventHandlers();
    }

    function buildWeeklyGanttHTML(data, timeSlots) {
        const config = Rules.getConfig();
        const totalMinutes = Model.timeToMinutes(config.businessEnd) - Model.timeToMinutes(config.businessStart);
        const { dates, eventsByDate, worker } = data;

        let html = '<div class="gantt-wrapper admin3-wrapper">';

        html += '<div class="gantt-time-header gantt-row">';
        html += '<div class="gantt-row-header">日付</div>';
        html += '<div class="gantt-time-slots">';
        for (const slot of timeSlots) {
            html += `<div class="gantt-time-slot">${slot}</div>`;
        }
        html += '</div>';
        html += '</div>';

        for (const date of dates) {
            const events = eventsByDate.get(date) || [];
            html += buildDateRowHTML(date, worker, events, totalMinutes, config);
        }

        html += '</div>';

        html += '<div class="admin3-actions"><button class="btn btn-primary" id="btnAddAdmin3Bar">+ 工程追加</button></div>';

        return html;
    }

    function buildDateRowHTML(date, worker, events, totalMinutes, config) {
        const startOffset = Model.timeToMinutes(config.businessStart);
        const dateLabel = Transform.formatDateHeader(date);

        let html = '<div class="gantt-row">';
        html += `<div class="gantt-row-header" data-date="${escapeAttr(date)}">${escapeHtml(dateLabel)}</div>`;
        html += `<div class="gantt-row-content admin3-row-content" data-date="${escapeAttr(date)}" data-worker="${escapeAttr(worker)}">`;

        for (const event of events) {
            const eventStart = Model.timeToMinutes(event.start) - startOffset;
            const eventEnd = Model.timeToMinutes(event.end) - startOffset;
            const left = (eventStart / totalMinutes) * 100;
            const width = ((eventEnd - eventStart) / totalMinutes) * 100;
            const color = event.color || getProcessColor(event.process);

            html += `<div class="gantt-bar admin3-bar"
                data-id="${event.id}"
                data-date="${escapeAttr(event.date)}"
                data-worker="${escapeAttr(event.worker)}"
                data-process="${escapeAttr(event.process)}"
                data-start="${event.start}"
                data-end="${event.end}"
                style="left:${left}%; width:${width}%; background:${color};"
                title="${escapeAttr(`${event.process} (${event.start}-${event.end})`)}"
            >${escapeHtml(event.process)}</div>`;
        }

        html += '</div>';
        html += '</div>';

        return html;
    }

    function getProcessColor(process) {
        const colors = [
            '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
        ];

        const state = Store.getState();
        const idx = state.processes.indexOf(process);
        return colors[(idx < 0 ? 0 : idx) % colors.length];
    }

    function attachEventHandlers() {
        const bars = container.querySelectorAll('.admin3-bar');
        bars.forEach(bar => {
            bar.addEventListener('mousedown', handleBarMouseDown);
            bar.addEventListener('dblclick', handleBarDoubleClick);
        });

        const addBtn = document.getElementById('btnAddAdmin3Bar');
        if (addBtn) {
            addBtn.addEventListener('click', openAddModal);
        }

        if (!globalMouseHandlersBound) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            globalMouseHandlersBound = true;
        }
    }

    function handleBarMouseDown(e) {
        const bar = e.target.closest('.admin3-bar');
        if (!bar) return;

        e.preventDefault();

        const rowContent = bar.parentElement;
        const rowRect = rowContent.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();

        const isLeftResize = e.clientX - barRect.left < 10;
        const isRightResize = barRect.right - e.clientX < 10;

        dragState = {
            bar,
            id: bar.dataset.id,
            originalDate: bar.dataset.date,
            worker: bar.dataset.worker,
            startX: e.clientX,
            barLeft: barRect.left - rowRect.left,
            barWidth: barRect.width,
            rowWidth: rowRect.width,
            mode: isLeftResize ? 'resize-left' : (isRightResize ? 'resize-right' : 'move')
        };

        bar.classList.add('dragging');
    }

    function handleMouseMove(e) {
        if (!dragState) return;

        const deltaX = e.clientX - dragState.startX;
        const config = Rules.getConfig();
        const totalMinutes = Model.timeToMinutes(config.businessEnd) - Model.timeToMinutes(config.businessStart);
        const pxPerMinute = dragState.rowWidth / totalMinutes;

        if (dragState.mode === 'move') {
            const newLeft = Math.max(0, Math.min(dragState.rowWidth - dragState.barWidth, dragState.barLeft + deltaX));
            dragState.bar.style.left = `${(newLeft / dragState.rowWidth) * 100}%`;
            return;
        }

        if (dragState.mode === 'resize-right') {
            const minWidth = pxPerMinute * config.timeStep;
            const newWidth = Math.max(minWidth, dragState.barWidth + deltaX);
            dragState.bar.style.width = `${(newWidth / dragState.rowWidth) * 100}%`;
            return;
        }

        const newLeft = Math.max(0, dragState.barLeft + deltaX);
        const widthDelta = dragState.barLeft - newLeft;
        const minWidth = pxPerMinute * config.timeStep;
        const newWidth = Math.max(minWidth, dragState.barWidth + widthDelta);
        dragState.bar.style.left = `${(newLeft / dragState.rowWidth) * 100}%`;
        dragState.bar.style.width = `${(newWidth / dragState.rowWidth) * 100}%`;
    }

    function handleMouseUp(e) {
        if (!dragState) return;

        dragState.bar.classList.remove('dragging');

        const config = Rules.getConfig();
        const totalMinutes = Model.timeToMinutes(config.businessEnd) - Model.timeToMinutes(config.businessStart);
        const startOffset = Model.timeToMinutes(config.businessStart);

        const rowContent = dragState.bar.parentElement;
        const rowRect = rowContent.getBoundingClientRect();
        const barRect = dragState.bar.getBoundingClientRect();

        const leftPct = (barRect.left - rowRect.left) / rowRect.width;
        const widthPct = barRect.width / rowRect.width;

        let newStartMin = Math.round((leftPct * totalMinutes + startOffset) / config.timeStep) * config.timeStep;
        let newEndMin = Math.round(((leftPct + widthPct) * totalMinutes + startOffset) / config.timeStep) * config.timeStep;

        newStartMin = Math.max(Model.timeToMinutes(config.businessStart), newStartMin);
        newEndMin = Math.min(Model.timeToMinutes(config.businessEnd), newEndMin);

        if (newStartMin >= newEndMin) {
            newEndMin = newStartMin + config.timeStep;
        }

        const targetDate = resolveDropDate(e, dragState.originalDate);
        const newStart = Model.minutesToTime(newStartMin);
        const newEnd = Model.minutesToTime(newEndMin);

        const state = Store.getState();
        const record = state.byId.get(dragState.id);
        if (!record) {
            dragState = null;
            return;
        }

        const updatedRecord = {
            ...record,
            date: targetDate,
            start: newStart,
            end: newEnd
        };

        const validation = Rules.validateRecord(updatedRecord, dragState.id);
        if (!validation.valid) {
            UI.showToast(validation.errors[0], 'error');
            render();
            dragState = null;
            return;
        }

        Store.updateRecord(dragState.id, {
            date: targetDate,
            start: newStart,
            end: newEnd
        });

        UI.showToast(`${newStart}-${newEnd} に更新しました`, 'success');
        dragState = null;
    }

    function resolveDropDate(e, fallbackDate) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const row = el ? el.closest('.admin3-row-content') : null;
        if (!row || !row.dataset.date) {
            return fallbackDate;
        }
        return row.dataset.date;
    }

    async function handleBarDoubleClick(e) {
        const bar = e.target.closest('.admin3-bar');
        if (!bar) return;

        const process = bar.dataset.process;
        const date = bar.dataset.date;
        const confirmed = await UI.confirm(`${Transform.formatDateHeader(date)} の「${process}」を削除しますか？`);
        if (!confirmed) return;

        Store.deleteRecord(bar.dataset.id);
        UI.showToast('削除しました', 'success');
    }

    function openAddModal() {
        const state = Store.getState();
        const worker = state.ui.admin3Worker;
        if (!worker) {
            UI.showToast('作業者を選択してください', 'error');
            return;
        }

        const config = Rules.getConfig();
        const weekDates = Transform.generateDates(state.ui.admin3Date, 'week');
        const defaultEnd = Model.minutesToTime(Math.min(
            Model.timeToMinutes(config.businessEnd),
            Model.timeToMinutes(config.businessStart) + config.timeStep
        ));

        const modalContainer = document.createElement('div');
        modalContainer.style.display = 'flex';
        modalContainer.style.flexDirection = 'column';
        modalContainer.style.gap = '1rem';

        modalContainer.appendChild(createSelectGroup('日付', 'admin3NewDate', weekDates));
        modalContainer.appendChild(createSelectGroup('工程', 'admin3NewProcess', state.processes));

        const timeRow = document.createElement('div');
        timeRow.style.display = 'flex';
        timeRow.style.gap = '1rem';
        timeRow.appendChild(createTimeInput('開始', 'admin3NewStart', config.businessStart));
        timeRow.appendChild(createTimeInput('終了', 'admin3NewEnd', defaultEnd));
        modalContainer.appendChild(timeRow);

        UI.openModal('工程追加', modalContainer, () => {
            const date = document.getElementById('admin3NewDate').value;
            const process = document.getElementById('admin3NewProcess').value;
            const start = document.getElementById('admin3NewStart').value;
            const end = document.getElementById('admin3NewEnd').value;

            if (!date || !process || !start || !end) {
                UI.showToast('必須項目を入力してください', 'error');
                return;
            }

            const newRecord = {
                id: Model.generateId(date, worker, process, start, end),
                date,
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
            UI.closeModal();
            UI.showToast('追加しました', 'success');
        });
    }

    function createSelectGroup(labelText, id, options) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-group';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'flex-start';

        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = labelText;

        const select = document.createElement('select');
        select.id = id;
        select.style.width = '100%';
        select.style.padding = '0.5rem';

        for (const optionText of options) {
            const option = document.createElement('option');
            option.value = optionText;
            option.textContent = labelText === '日付' ? Transform.formatDateHeader(optionText) : optionText;
            select.appendChild(option);
        }

        wrapper.appendChild(label);
        wrapper.appendChild(select);
        return wrapper;
    }

    function createTimeInput(labelText, id, defaultValue) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-group';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'flex-start';
        wrapper.style.flex = '1';

        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = labelText;

        const input = document.createElement('input');
        input.type = 'time';
        input.id = id;
        input.value = defaultValue;
        input.style.width = '100%';
        input.style.padding = '0.5rem';

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        return wrapper;
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
        render
    };
})();
