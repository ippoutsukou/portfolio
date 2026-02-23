/**
 * Simple Kanban Board
 * Main Logic with Archive support + Export/Import
 */

// --- Constants & Config ---
const STORAGE_KEY = 'simple_kanban_data_v2';
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const CSV_FORMULA_RE = /^[\t\r ]*[=+\-@]/;

const DEFAULT_DATA = {
    version: 2,
    boards: [
        {
            id: 'board-1',
            name: 'My Board',
            columns: [
                { id: 'col-todo', name: 'To Do', order: 1 },
                { id: 'col-doing', name: 'Doing', order: 2 },
                { id: 'col-done', name: 'Done', order: 3 }
            ],
            cards: [
                {
                    id: 'card-welcome',
                    columnId: 'col-todo',
                    title: 'Welcome to Kanban!',
                    description: 'Try dragging this card to another column.',
                    priority: 'low',
                    assignee: 'Admin',
                    project: 'Demo',
                    startDate: new Date().toISOString().split('T')[0],
                    order: 1,
                    createdAt: new Date().toISOString(),
                    archived: false
                }
            ]
        }
    ]
};

// --- State Management ---
let appState = { ...DEFAULT_DATA };
let currentFilters = {
    assignee: '',
    project: '',
    dueDate: ''
};

// ガントビュー専用の選択プロジェクト配列
let ganttSelectedProjects = [];

function ensureValidState(state) {
    if (!state || !Array.isArray(state.boards) || state.boards.length === 0) {
        return { ...DEFAULT_DATA };
    }
    const board = state.boards[0];
    if (!board.columns || board.columns.length === 0) {
        return { ...DEFAULT_DATA };
    }
    if (!Array.isArray(board.cards)) {
        board.cards = [];
    }
    board.cards = board.cards.map(c => {
        const fallbackDate = (c.dueDate && c.dueDate) || (c.createdAt && c.createdAt.split('T')[0]) || new Date().toISOString().split('T')[0];
        return {
            archived: false,
            startDate: c.startDate || fallbackDate,
            ganttOrder: typeof c.ganttOrder === 'number' ? c.ganttOrder : null,
            ...c
        };
    });
    return state;
}

function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            appState = ensureValidState(parsed);
        } catch (e) {
            console.error('Failed to parse local storage data', e);
            appState = { ...DEFAULT_DATA };
        }
    } else {
        appState = { ...DEFAULT_DATA };
        saveState();
    }

    saveState();
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function getBoard() {
    return appState.boards[0];
}

function getCardsByColumn(columnId) {
    let cards = getBoard().cards.filter(c => c.columnId === columnId && !c.archived);

    if (currentFilters.assignee) {
        cards = cards.filter(c => c.assignee === currentFilters.assignee);
    }
    if (currentFilters.project) {
        cards = cards.filter(c => c.project === currentFilters.project);
    }
    if (currentFilters.dueDate) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        if (currentFilters.dueDate === 'overdue') {
            cards = cards.filter(c => c.dueDate && c.dueDate < today);
        } else if (currentFilters.dueDate === 'today') {
            cards = cards.filter(c => c.dueDate === today);
        } else if (currentFilters.dueDate === 'tomorrow') {
            cards = cards.filter(c => c.dueDate === tomorrow);
        }
    }

    return cards.sort((a, b) => (a.order || 0) - (b.order || 0));
}

// --- DOM Elements ---
const boardEl = document.getElementById('board');

const filterAssigneeEl = document.getElementById('filter-assignee');
const filterProjectEl = document.getElementById('filter-project');
const filterDueDateEl = document.getElementById('filter-due-date');

const cardModalEl = document.getElementById('card-modal');
const cardForm = document.getElementById('card-form');
const deleteCardBtn = document.getElementById('delete-card-btn');
const archiveCardBtn = document.getElementById('archive-card-btn');

const columnModalEl = document.getElementById('column-modal');
const columnForm = document.getElementById('column-form');
const deleteColumnBtn = document.getElementById('delete-column-btn');

const detailModalEl = document.getElementById('column-detail-modal');
const detailTitleEl = document.getElementById('detail-column-title');
const detailTableBody = document.getElementById('detail-table-body');
const detailAddCardBtn = document.getElementById('detail-add-card-btn');

const archivedModalEl = document.getElementById('archived-modal');
const archivedTableBody = document.getElementById('archived-table-body');

const resetBtn = document.getElementById('reset-btn');
const archivedBtn = document.getElementById('archived-btn');
const tabKanbanBtn = document.getElementById('tab-kanban');
const tabGanttBtn = document.getElementById('tab-gantt');
const kanbanView = document.getElementById('kanban-view');
const ganttView = document.getElementById('gantt-view');
const ganttChartEl = document.getElementById('gantt-chart');
const ganttProjectFilter = document.getElementById('gantt-project-filter');
const ganttRangeSelect = document.getElementById('gantt-range-select');
const ganttRangeSlider = document.getElementById('gantt-range-slider');
const ganttAxisEl = document.getElementById('gantt-axis');

// 追加：エクスポート／インポート用要素
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');
const csvExportBtn = document.getElementById('csv-export-btn');
const csvImportBtn = document.getElementById('csv-import-btn');
const csvImportFileInput = document.getElementById('csv-import-file-input');

// --- Rendering ---

function renderFilters() {
    const board = getBoard();
    const cards = board.cards.filter(c => !c.archived);

    const assignees = [...new Set(cards.map(c => c.assignee).filter(Boolean))].sort();
    const projects = [...new Set(cards.map(c => c.project).filter(Boolean))].sort();

    const currentAssignee = filterAssigneeEl.value;
    const currentProject = filterProjectEl.value;

    filterAssigneeEl.innerHTML = '<option value="">すべて</option>';
    assignees.forEach(a => {
        const option = document.createElement('option');
        option.value = a;
        option.textContent = a;
        filterAssigneeEl.appendChild(option);
    });
    filterAssigneeEl.value = currentAssignee;

    filterProjectEl.innerHTML = '<option value="">すべて</option>';
    projects.forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        option.textContent = p;
        filterProjectEl.appendChild(option);
    });
    filterProjectEl.value = currentProject;
}

function renderBoard() {
    boardEl.innerHTML = '';
    const board = getBoard();
    const columns = [...board.columns].sort((a, b) => a.order - b.order);

    columns.forEach(col => {
        const colEl = document.createElement('div');
        colEl.className = 'column';
        colEl.dataset.columnId = col.id;

        const headerEl = document.createElement('div');
        headerEl.className = 'column-header';
        const cardsInCol = getCardsByColumn(col.id);

        headerEl.innerHTML = `
            <div class="column-title-group">
                <span>${escapeHtml(col.name)}</span>
                <span class="card-count">${cardsInCol.length}</span>
            </div>
            <div class="column-actions">
                <button class="btn-icon expand-column-btn" title="Expand View">⤢</button>
                <button class="btn-icon edit-column-btn" title="Edit Column">✏️</button>
            </div>
        `;

        headerEl.querySelector('.edit-column-btn').addEventListener('click', () => openColumnModal(col));
        headerEl.querySelector('.expand-column-btn').addEventListener('click', () => openColumnDetail(col));

        const listEl = document.createElement('div');
        listEl.className = 'card-list';
        listEl.dataset.columnId = col.id;

        listEl.addEventListener('dragover', handleDragOver);
        listEl.addEventListener('drop', handleDrop);
        listEl.addEventListener('dragenter', handleDragEnter);
        listEl.addEventListener('dragleave', handleDragLeave);

        cardsInCol.forEach(card => {
            const cardEl = createCardElement(card);
            listEl.appendChild(cardEl);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'add-card-btn';
        addBtn.innerHTML = `+ Add Card`;
        addBtn.onclick = () => openCardModal(null, col.id);

        colEl.appendChild(headerEl);
        colEl.appendChild(listEl);
        colEl.appendChild(addBtn);

        boardEl.appendChild(colEl);
    });

    const addColContainer = document.createElement('div');
    addColContainer.className = 'add-column-container';
    const addColBtn = document.createElement('button');
    addColBtn.className = 'add-column-btn';
    addColBtn.innerHTML = `<span>+</span> Add Column`;
    addColBtn.onclick = () => openColumnModal(null);
    addColContainer.appendChild(addColBtn);

    boardEl.appendChild(addColContainer);

    renderGantt();
}

function renderGantt() {
    if (!ganttChartEl) return;
    const board = getBoard();
    let cards = board.cards.filter(c => !c.archived);

    if (currentFilters.assignee) {
        cards = cards.filter(c => c.assignee === currentFilters.assignee);
    }
    if (currentFilters.project) {
        cards = cards.filter(c => c.project === currentFilters.project);
    }
    if (currentFilters.dueDate) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        if (currentFilters.dueDate === 'overdue') {
            cards = cards.filter(c => c.dueDate && c.dueDate < today);
        } else if (currentFilters.dueDate === 'today') {
            cards = cards.filter(c => c.dueDate === today);
        } else if (currentFilters.dueDate === 'tomorrow') {
            cards = cards.filter(c => c.dueDate === tomorrow);
        }
    }

    const projects = [...new Set(cards.map(c => c.project).filter(Boolean))].sort();
    if (ganttProjectFilter) {
        ganttProjectFilter.innerHTML = '<option value=\"\">すべて</option>';
        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p;
            option.textContent = p;
            if (ganttSelectedProjects.includes(p)) {
                option.selected = true;
            }
            ganttProjectFilter.appendChild(option);
        });
    } else {
        // フィルタUIがない場合は常に全プロジェクトを対象
        ganttSelectedProjects = [];
    }

    const targetCards = cards
        .filter(c => (ganttSelectedProjects.length === 0 || ganttSelectedProjects.includes(c.project)))
        .filter(c => (c.startDate || c.dueDate || c.createdAt));

    ganttChartEl.innerHTML = '';

    if (targetCards.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'gantt-empty';
        empty.textContent = 'ガント表示できるカードがありません（プロジェクトと期日/開始日を設定してください）。';
        ganttChartEl.appendChild(empty);
        return;
    }

    const datePairs = [];
    targetCards.forEach(c => {
        const startStr = c.startDate || c.dueDate || c.createdAt;
        const endStr = c.dueDate || c.startDate || c.createdAt;
        const start = parseDateSafe(startStr);
        const end = parseDateSafe(endStr);
        if (!start || !end) return;
        const normalizedStart = start;
        const normalizedEnd = end.getTime() < start.getTime() ? start : end;
        datePairs.push([normalizedStart, normalizedEnd]);
    });

    if (datePairs.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'gantt-empty';
        empty.textContent = '日付が解釈できるカードがありません。';
        ganttChartEl.appendChild(empty);
        return;
    }

    const minDate = new Date(Math.min(...datePairs.map(([s]) => s.getTime())));
    const maxDate = new Date(Math.max(...datePairs.map(([, e]) => e.getTime())));
    const dayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.round((maxDate - minDate) / dayMs) + 1);

    ganttTimelineMinDate = minDate;
    ganttTotalDays = totalDays;

    const viewDays = getGanttViewDays(totalDays);
    ganttViewDaysCache = viewDays;
    const maxStart = Math.max(0, totalDays - viewDays);

    if (!ganttUserAdjusted) {
        ganttViewStartDay = initDefaultGanttStart(minDate, maxDate, totalDays, viewDays);
    }
    if (ganttViewMode === 'all') {
        ganttViewStartDay = 0;
    }
    if (ganttViewStartDay > maxStart) {
        ganttViewStartDay = maxStart;
    }

    updateGanttSlider(maxStart);
    renderGanttAxis(minDate, viewDays);

    const projectMap = new Map();
    targetCards.forEach(c => {
        const key = c.project || '未設定';
        if (!projectMap.has(key)) projectMap.set(key, []);
        projectMap.get(key).push(c);
    });

    projectMap.forEach((cardsInProject, projectName) => {
        const projectBlock = document.createElement('div');
        projectBlock.className = 'gantt-project';

        const header = document.createElement('div');
        header.className = 'gantt-project-header';

        const label = document.createElement('div');
        label.className = 'gantt-row-label';
        label.textContent = projectName || '未設定';

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'gantt-add-btn';
        addBtn.textContent = '+ Add Card';
        addBtn.addEventListener('click', () => handleGanttAddCard(projectName));

        header.appendChild(label);
        header.appendChild(addBtn);
        projectBlock.appendChild(header);

        const rowsWrap = document.createElement('div');
        rowsWrap.className = 'gantt-rows';

        const sortedCards = cardsInProject
            .slice()
            .sort((a, b) => {
                const aOrder = Number.isFinite(a.ganttOrder) ? a.ganttOrder : Infinity;
                const bOrder = Number.isFinite(b.ganttOrder) ? b.ganttOrder : Infinity;
                if (aOrder !== bOrder) return aOrder - bOrder;
                const aStart = parseDateSafe(a.startDate || a.dueDate || a.createdAt) || new Date(0);
                const bStart = parseDateSafe(b.startDate || b.dueDate || b.createdAt) || new Date(0);
                return aStart - bStart;
            });

        sortedCards.forEach(card => {
                const startStr = card.startDate || card.dueDate || card.createdAt;
                const endStr = card.dueDate || card.startDate || card.createdAt;
                const start = parseDateSafe(startStr);
                const end = parseDateSafe(endStr);
                if (!start || !end) return;
                const safeStart = start;
                const safeEnd = end.getTime() < start.getTime() ? start : end;
                const startDay = Math.floor((safeStart - minDate) / dayMs);
                const endDay = Math.floor((safeEnd - minDate) / dayMs);

                const windowStart = ganttViewStartDay;
                const windowEnd = ganttViewStartDay + viewDays - 1;

                if (endDay < windowStart || startDay > windowEnd) {
                    return;
                }

                const clampedStart = Math.max(startDay, windowStart);
                const clampedEnd = Math.min(endDay, windowEnd);

                const offsetDays = clampedStart - windowStart;
                const durationDays = Math.max(1, clampedEnd - clampedStart + 1);

                const cardRow = document.createElement('div');
                cardRow.className = 'gantt-card-row';
                cardRow.draggable = false;
                cardRow.dataset.cardId = card.id;
                cardRow.dataset.project = projectName || '';
                cardRow.addEventListener('dragover', handleGanttRowDragOver);
                cardRow.addEventListener('drop', handleGanttRowDrop);

                const title = document.createElement('div');
                title.className = 'gantt-card-title';
                title.draggable = true;
                title.textContent = card.title;
                title.addEventListener('click', (e) => {
                    if (ganttRowDragging) return;
                    e.stopPropagation();
                    openCardModal(card);
                });
                title.addEventListener('dragstart', (e) => handleGanttRowDragStart(e, card));
                title.addEventListener('dragend', handleGanttRowDragEnd);

                const track = document.createElement('div');
                track.className = 'gantt-row-track';

                const bar = document.createElement('div');
                const col = board.columns.find(c => c.id === card.columnId);
                const isDone = col && col.name.toLowerCase().includes('done');
                const safePriority = sanitizePriority(card.priority);
                bar.className = `gantt-bar priority-${safePriority}${isDone ? ' gantt-bar-done' : ''}`;
                bar.draggable = false;
                bar.dataset.cardId = card.id;
                bar.dataset.project = projectName || '';
                bar.dataset.startDay = startDay;
                bar.dataset.endDay = endDay;
                bar.addEventListener('mousedown', handleGanttBarMouseDown);
                bar.style.left = `${(offsetDays / viewDays) * 100}%`;
                bar.style.width = `${(durationDays / viewDays) * 100}%`;
                bar.title = `${card.title} (${projectName})`;

                const leftHandle = document.createElement('span');
                leftHandle.className = 'gantt-handle left';
                leftHandle.dataset.handle = 'left';
                const rightHandle = document.createElement('span');
                rightHandle.className = 'gantt-handle right';
                rightHandle.dataset.handle = 'right';

                const barLabel = document.createElement('span');
                barLabel.className = 'gantt-bar-label';
                barLabel.textContent = card.title;
                bar.appendChild(leftHandle);
                bar.appendChild(rightHandle);
                bar.appendChild(barLabel);

                track.appendChild(bar);
                cardRow.appendChild(title);
                cardRow.appendChild(track);
                rowsWrap.appendChild(cardRow);
            });

        projectBlock.appendChild(rowsWrap);
        ganttChartEl.appendChild(projectBlock);
    });
}

function getGanttViewDays(totalDays) {
    if (ganttViewMode === '90d') return Math.min(totalDays, 90);
    if (ganttViewMode === '30d') return Math.min(totalDays, 30);
    if (ganttViewMode === '14d') return Math.min(totalDays, 14);
    return totalDays;
}

function getInboxColumnId(board) {
    if (!board || !Array.isArray(board.columns)) return null;
    const inboxCol = board.columns.find(c => typeof c.name === 'string' && c.name.toLowerCase().includes('inbox'));
    if (inboxCol) return inboxCol.id;
    return board.columns[0] ? board.columns[0].id : null;
}

function handleGanttAddCard(projectName) {
    const board = getBoard();
    const columnId = getInboxColumnId(board);
    if (!columnId) {
        alert('追加先のカラムが見つかりません。');
        return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    openCardModal(null, columnId, { project: projectName || '', startDate: todayStr });
}

function initDefaultGanttStart(minDate, maxDate, totalDays, viewDays) {
    if (ganttViewMode === 'all') return 0;
    const today = parseDateSafe(new Date().toISOString().split('T')[0]);
    const movableDays = Math.max(0, totalDays - viewDays);

    if (today && today >= minDate && today <= maxDate) {
        const targetStart = addDays(today, -3);
        const offset = diffDays(minDate, targetStart);
        return clamp(offset, 0, movableDays);
    }

    if (today && today > maxDate) {
        const targetStart = addDays(maxDate, -(viewDays - 1));
        const offset = diffDays(minDate, targetStart);
        return clamp(offset, 0, movableDays);
    }

    return 0;
}

function updateGanttSlider(maxStart) {
    if (!ganttRangeSlider) return;
    if (ganttViewMode === 'all') {
        ganttRangeSlider.disabled = true;
        ganttRangeSlider.value = 0;
        return;
    }
    ganttRangeSlider.disabled = false;
    const ratio = maxStart === 0 ? 0 : Math.round((ganttViewStartDay / maxStart) * 100);
    ganttRangeSlider.value = ratio;
}

function renderGanttAxis(minDate, viewDays) {
    if (!ganttAxisEl) return;
    ganttAxisEl.innerHTML = '';
    if (viewDays <= 0) return;

    const start = addDays(minDate, ganttViewStartDay);
    const chartWidthPx = ganttAxisEl.clientWidth || 800;
    const pxPerDay = chartWidthPx / viewDays;
    const MIN_LABEL_PX = 40;
    let step = Math.ceil(MIN_LABEL_PX / pxPerDay);
    if (step < 1) step = 1;

    for (let i = 0; i <= viewDays; i += step) {
        const currentDate = addDays(start, i);
        const label = document.createElement('div');
        label.className = 'gantt-tick';
        label.style.left = `${(i / viewDays) * 100}%`;
        label.textContent = formatDateLabel(currentDate, viewDays);
        ganttAxisEl.appendChild(label);
    }
}

function createCardElement(card) {
    const el = document.createElement('div');
    el.className = 'card';
    el.draggable = true;
    el.dataset.cardId = card.id;

    const safePriority = sanitizePriority(card.priority);
    const priorityLabel = {
        low: 'Low',
        medium: 'Medium',
        high: 'High'
    }[safePriority];

    const priorityClass = `priority-${safePriority}`;

    let dateHtml = '';
    const safeDueDate = sanitizeDateText(card.dueDate);
    if (safeDueDate) {
        const today = new Date().toISOString().split('T')[0];
        let dateClass = '';
        if (safeDueDate < today) {
            dateClass = 'date-overdue';
        } else if (safeDueDate === today) {
            dateClass = 'date-due-soon';
        }
        dateHtml = `<span class="meta-item ${dateClass}">&#128197; ${escapeHtml(safeDueDate)}</span>`;
    }

    let assigneeHtml = '';
    if (card.assignee) {
        assigneeHtml = `<span class="meta-item badge-assignee">&#128100; ${escapeHtml(card.assignee)}</span>`;
    }

    let projectHtml = '';
    if (card.project) {
        projectHtml = `<span class="meta-item badge-project">&#128193; ${escapeHtml(card.project)}</span>`;
    }

    el.innerHTML = `
        <div class="card-title">${escapeHtml(card.title)}</div>
        <div class="card-badges">
            ${assigneeHtml}
            ${projectHtml}
        </div>
        <div class="card-meta">
            <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
            ${dateHtml}
        </div>
    `;

    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragend', handleDragEnd);
    el.addEventListener('click', () => openCardModal(card));

    return el;
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function sanitizePriority(value) {
    const normalized = String(value || '').toLowerCase();
    return VALID_PRIORITIES.has(normalized) ? normalized : 'medium';
}

function sanitizeDateText(value) {
    const dateText = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return '';
    return parseDateSafe(dateText) ? dateText : '';
}

function toDateOnlyString(value) {
    if (!value) return '';
    return String(value).split('T')[0];
}

function parseDateSafe(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function diffDays(a, b) {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.floor((b - a) / dayMs);
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
}

function formatDateLabel(date, viewDays) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    if (viewDays > 120) {
        return `${m}月`;
    }
    return `${m}/${d}`;
}

// --- Modal Logic (Card) ---
let currentEditingCardId = null;
let currentAddingColumnId = null;

function openCardModal(card, columnId = null, defaults = {}) {
    cardModalEl.classList.remove('hidden');

    if (card) {
        currentEditingCardId = card.id;
        currentAddingColumnId = null;
        document.getElementById('modal-title').textContent = 'カード編集';
        document.getElementById('input-title').value = card.title;
        document.getElementById('input-desc').value = card.description || '';
        document.getElementById('input-priority').value = card.priority || 'medium';
        document.getElementById('input-start-date').value = card.startDate || card.dueDate || '';
        document.getElementById('input-date').value = card.dueDate || '';
        document.getElementById('input-assignee').value = card.assignee || '';
        document.getElementById('input-project').value = card.project || '';
        deleteCardBtn.style.display = 'block';
        archiveCardBtn.style.display = 'block';
        archiveCardBtn.textContent = card.archived ? '復元する' : 'アーカイブ';
    } else {
        currentEditingCardId = null;
        currentAddingColumnId = columnId;
        document.getElementById('modal-title').textContent = '新規カード';
        cardForm.reset();
        document.getElementById('input-priority').value = 'medium';
        const todayStr = new Date().toISOString().split('T')[0];
        document.getElementById('input-start-date').value = defaults.startDate || todayStr;
        if (defaults.project) {
            document.getElementById('input-project').value = defaults.project;
        }
        deleteCardBtn.style.display = 'none';
        archiveCardBtn.style.display = 'none';
    }
}

function closeCardModal() {
    cardModalEl.classList.add('hidden');
    currentEditingCardId = null;
    currentAddingColumnId = null;
}

// --- Modal Logic (Column) ---
let currentEditingColumnId = null;

function openColumnModal(column) {
    columnModalEl.classList.remove('hidden');

    if (column) {
        currentEditingColumnId = column.id;
        document.getElementById('column-modal-title').textContent = 'カラム編集';
        document.getElementById('input-column-name').value = column.name;
        deleteColumnBtn.style.display = 'block';
    } else {
        currentEditingColumnId = null;
        document.getElementById('column-modal-title').textContent = '新規カラム';
        columnForm.reset();
        deleteColumnBtn.style.display = 'none';
    }
}

function closeColumnModal() {
    columnModalEl.classList.add('hidden');
    currentEditingColumnId = null;
}

// --- Modal Logic (Detail View) ---
let currentDetailColumnId = null;

function openColumnDetail(column) {
    currentDetailColumnId = column.id;
    detailTitleEl.textContent = `${column.name} - Details`;
    renderColumnDetail(column);
    detailModalEl.classList.remove('hidden');
}

function closeColumnDetail() {
    detailModalEl.classList.add('hidden');
    currentDetailColumnId = null;
}

function renderColumnDetail(column) {
    detailTableBody.innerHTML = '';
    const cards = getCardsByColumn(column.id);

    cards.forEach(card => {
        const tr = document.createElement('tr');

        const safePriority = sanitizePriority(card.priority);
        const priorityLabel = {
            low: 'Low',
            medium: 'Medium',
            high: 'High'
        }[safePriority];

        const priorityClass = `priority-${safePriority}`;

        const safeDueDate = sanitizeDateText(card.dueDate);
        let dateClass = '';
        if (safeDueDate) {
            const today = new Date().toISOString().split('T')[0];
            if (safeDueDate < today) {
                dateClass = 'date-overdue';
            } else if (safeDueDate === today) {
                dateClass = 'date-due-soon';
            }
        }

        tr.innerHTML = `
            <td><strong>${escapeHtml(card.title)}</strong></td>
            <td>${escapeHtml(card.assignee || '-')}</td>
            <td>${escapeHtml(card.project || '-')}</td>
            <td><span class="priority-badge ${priorityClass}">${priorityLabel}</span></td>
            <td class="${dateClass}">${escapeHtml(safeDueDate || '-')}</td>
            <td><button class="btn btn-danger-outline btn-compact detail-delete-btn">削除</button></td>
            <td><button class="btn btn-secondary btn-compact detail-archive-btn">アーカイブ</button></td>
        `;

        tr.addEventListener('click', () => {
            openCardModal(card);
        });

        tr.querySelector('.detail-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteCardById(card.id);
        });

        tr.querySelector('.detail-archive-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            archiveCardById(card.id);
        });

        detailTableBody.appendChild(tr);
    });
}

function refreshDetailView() {
    if (!currentDetailColumnId) return;
    const board = getBoard();
    const col = board.columns.find(c => c.id === currentDetailColumnId);
    if (col) renderColumnDetail(col);
}

function renderArchivedTable() {
    const board = getBoard();
    const archivedCards = board.cards.filter(c => c.archived).sort((a, b) => {
        const timeA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
        const timeB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
        return timeB - timeA;
    });

    archivedTableBody.innerHTML = '';

    if (archivedCards.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.textContent = 'アーカイブ済みのカードはありません';
        td.style.color = '#6B7280';
        td.style.textAlign = 'center';
        tr.appendChild(td);
        archivedTableBody.appendChild(tr);
        return;
    }

    archivedCards.forEach(card => {
        const tr = document.createElement('tr');
        const col = board.columns.find(c => c.id === card.columnId);
        tr.innerHTML = `
            <td><strong>${escapeHtml(card.title)}</strong></td>
            <td>${escapeHtml(card.assignee || '-')}</td>
            <td>${escapeHtml(card.project || '-')}</td>
            <td>${escapeHtml(col ? col.name : '-')}</td>
            <td>${escapeHtml(sanitizeDateText(card.dueDate) || '-')}</td>
            <td><button class="btn btn-secondary btn-restore">復元</button></td>
        `;

        tr.querySelector('.btn-restore').addEventListener('click', () => restoreCard(card.id));

        archivedTableBody.appendChild(tr);
    });
}

function openArchivedModal() {
    renderArchivedTable();
    archivedModalEl.classList.remove('hidden');
}

function closeArchivedModal() {
    archivedModalEl.classList.add('hidden');
}

// --- CRUD Operations (Card) ---

function deleteCardById(cardId, { closeModal = false } = {}) {
    const board = getBoard();
    const hasTarget = board.cards.some(c => c.id === cardId);
    if (!hasTarget) return;

    if (!confirm('このカードを削除しますか？')) {
        return;
    }

    board.cards = board.cards.filter(c => c.id !== cardId);

    saveState();
    renderFilters();
    renderBoard();
    refreshDetailView();
    renderArchivedTable();

    if (closeModal) {
        closeCardModal();
    }
}

function archiveCardById(cardId, { closeModal = false } = {}) {
    const board = getBoard();
    const card = board.cards.find(c => c.id === cardId);
    if (!card) return;

    if (card.archived) {
        restoreCard(cardId);
        if (closeModal) {
            closeCardModal();
        }
        return;
    }

    card.archived = true;
    card.archivedAt = new Date().toISOString();

    saveState();
    renderFilters();
    renderBoard();
    refreshDetailView();
    renderArchivedTable();

    if (closeModal) {
        closeCardModal();
    }
}

function handleSaveCard(e) {
    e.preventDefault();

    const title = document.getElementById('input-title').value;
    const desc = document.getElementById('input-desc').value;
    const priority = sanitizePriority(document.getElementById('input-priority').value);
    const startDate = sanitizeDateText(document.getElementById('input-start-date').value);
    const dueDate = sanitizeDateText(document.getElementById('input-date').value);
    const assignee = document.getElementById('input-assignee').value.trim();
    const project = document.getElementById('input-project').value.trim();

    const board = getBoard();

    if (currentEditingCardId) {
        const card = board.cards.find(c => c.id === currentEditingCardId);
        if (card) {
            card.title = title;
            card.description = desc;
            card.priority = priority;
            card.startDate = startDate || card.startDate || dueDate;
            card.dueDate = dueDate;
            card.assignee = assignee;
            card.project = project;
            card.updatedAt = new Date().toISOString();
        }
    } else if (currentAddingColumnId) {
        const newCard = {
            id: 'card-' + Date.now(),
            columnId: currentAddingColumnId,
            title: title,
            description: desc,
            priority: priority,
            startDate: startDate || dueDate || new Date().toISOString().split('T')[0],
            dueDate: dueDate,
            assignee: assignee,
            project: project,
            order: getCardsByColumn(currentAddingColumnId).length + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            archived: false
        };
        board.cards.push(newCard);
    }

    saveState();
    renderFilters();
    renderBoard();

    refreshDetailView();

    closeCardModal();
}

function handleDeleteCard() {
    if (!currentEditingCardId) return;

    deleteCardById(currentEditingCardId, { closeModal: true });
}

function handleArchiveCard() {
    if (!currentEditingCardId) return;

    archiveCardById(currentEditingCardId, { closeModal: true });
}

function restoreCard(cardId) {
    const board = getBoard();
    const card = board.cards.find(c => c.id === cardId);
    if (!card) return;

    card.archived = false;
    const cardsInCol = board.cards.filter(c => c.columnId === card.columnId && !c.archived && c.id !== card.id);
    const maxOrder = cardsInCol.length > 0 ? Math.max(...cardsInCol.map(c => c.order || 0)) : 0;
    card.order = maxOrder + 1;

    saveState();
    renderFilters();
    renderBoard();

    refreshDetailView();

    renderArchivedTable();
}

// --- CRUD Operations (Column) ---

function handleSaveColumn(e) {
    e.preventDefault();
    const name = document.getElementById('input-column-name').value;
    const board = getBoard();

    if (currentEditingColumnId) {
        const col = board.columns.find(c => c.id === currentEditingColumnId);
        if (col) {
            col.name = name;
        }
    } else {
        const newCol = {
            id: 'col-' + Date.now(),
            name: name,
            order: board.columns.length + 1
        };
        board.columns.push(newCol);
    }

    saveState();
    renderBoard();
    closeColumnModal();
}

function handleDeleteColumn() {
    if (!currentEditingColumnId) return;

    const board = getBoard();
    const hasCards = board.cards.some(c => c.columnId === currentEditingColumnId && !c.archived);

    if (hasCards) {
        alert('カードが残っているカラムは削除できません。先に移動または削除してください。');
        return;
    }

    if (confirm('このカラムを削除しますか？')) {
        board.columns = board.columns.filter(c => c.id !== currentEditingColumnId);
        saveState();
        renderBoard();
        closeColumnModal();
    }
}

function handleReset() {
    if (confirm('すべてのデータを初期化しますか？この操作は元に戻せません。')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

// --- Filter Logic ---
function handleFilterChange() {
    currentFilters.assignee = filterAssigneeEl.value;
    currentFilters.project = filterProjectEl.value;
    currentFilters.dueDate = filterDueDateEl.value;
    renderBoard();
    renderGantt();
}

function handleGanttProjectFilterChange() {
    if (!ganttProjectFilter) return;
    // 選択されたオプションの値を配列として取得
    const selectedOptions = Array.from(ganttProjectFilter.selectedOptions);
    ganttSelectedProjects = selectedOptions.map(option => option.value).filter(value => value !== '');
    renderGantt();
}

function handleGanttRangeChange() {
    if (!ganttRangeSelect) return;
    ganttViewMode = ganttRangeSelect.value;
    ganttUserAdjusted = false;
    if (ganttViewMode === 'all') {
        ganttViewStartDay = 0;
    }
    renderGantt();
}

function handleGanttSliderChange() {
    if (!ganttRangeSlider || ganttViewMode === 'all') return;
    ganttUserAdjusted = true;
    const ratio = Number(ganttRangeSlider.value) / 100;
    const board = getBoard();
    let cards = board.cards.filter(c => !c.archived);
    if (currentFilters.assignee) {
        cards = cards.filter(c => c.assignee === currentFilters.assignee);
    }
    if (ganttSelectedProjects.length > 0) {
        cards = cards.filter(c => ganttSelectedProjects.includes(c.project));
    }
    if (currentFilters.dueDate) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        if (currentFilters.dueDate === 'overdue') {
            cards = cards.filter(c => c.dueDate && c.dueDate < today);
        } else if (currentFilters.dueDate === 'today') {
            cards = cards.filter(c => c.dueDate === today);
        } else if (currentFilters.dueDate === 'tomorrow') {
            cards = cards.filter(c => c.dueDate === tomorrow);
        }
    }

    const dates = [];
    cards.forEach(c => {
        const s = parseDateSafe(c.startDate || c.dueDate || c.createdAt);
        const e = parseDateSafe(c.dueDate || c.startDate || c.createdAt);
        if (s) dates.push(s);
        if (e) dates.push(e);
    });
    if (dates.length === 0) return;
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const totalDays = Math.max(1, Math.round((maxDate - minDate) / (24 * 60 * 60 * 1000)) + 1);
    const viewDays = getGanttViewDays(totalDays);
    const maxStart = Math.max(0, totalDays - viewDays);
    ganttViewStartDay = Math.round(maxStart * ratio);
    renderGantt();
}

function switchView(view) {
    if (!tabKanbanBtn || !tabGanttBtn || !kanbanView || !ganttView) return;
    if (view === 'gantt') {
        tabGanttBtn.classList.add('active');
        tabKanbanBtn.classList.remove('active');
        kanbanView.classList.add('hidden');
        ganttView.classList.remove('hidden');
        renderGantt();
    } else {
        tabKanbanBtn.classList.add('active');
        tabGanttBtn.classList.remove('active');
        kanbanView.classList.remove('hidden');
        ganttView.classList.add('hidden');
    }
}

// Event Listeners for Filters
filterAssigneeEl.addEventListener('change', handleFilterChange);
filterProjectEl.addEventListener('change', handleFilterChange);
filterDueDateEl.addEventListener('change', handleFilterChange);

// --- Drag and Drop Logic ---
let draggedCardId = null;
let ganttDraggedCardId = null;
let ganttDraggedProject = null;
let ganttViewMode = 'all';
let ganttViewStartDay = 0;
let ganttUserAdjusted = false;
let ganttTimelineMinDate = null;
let ganttTotalDays = 0;
let ganttViewDaysCache = 0;
let ganttBarDragState = null;
let ganttRowDragId = null;
let ganttRowDragProject = null;
let ganttRowDragging = false;

function handleDragStart(e) {
    draggedCardId = this.dataset.cardId;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedCardId);
}

function handleDragEnd() {
    this.classList.remove('dragging');
    draggedCardId = null;

    document.querySelectorAll('.card-list').forEach(el => {
        el.style.background = '';
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this.classList.contains('card-list')) {
        this.style.background = 'rgba(0,0,0,0.02)';
    }
}

function handleDragLeave() {
    if (this.classList.contains('card-list')) {
        this.style.background = '';
    }
}

function handleDrop(e) {
    e.stopPropagation();

    const targetList = this.closest('.card-list');
    if (!targetList || !draggedCardId) return;

    const newColumnId = targetList.dataset.columnId;
    const board = getBoard();
    const card = board.cards.find(c => c.id === draggedCardId);

    if (card) {
        card.columnId = newColumnId;

        const afterElement = getDragAfterElement(targetList, e.clientY);

        const allCardsInCol = board.cards
            .filter(c => c.columnId === newColumnId && c.id !== draggedCardId && !c.archived)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        let newIndex;
        if (afterElement == null) {
            newIndex = allCardsInCol.length;
        } else {
            const afterCardId = afterElement.dataset.cardId;
            const afterCardIndex = allCardsInCol.findIndex(c => c.id === afterCardId);
            newIndex = afterCardIndex === -1 ? allCardsInCol.length : afterCardIndex;
        }

        allCardsInCol.splice(newIndex, 0, card);
        allCardsInCol.forEach((c, index) => {
            c.order = index + 1;
        });

        saveState();
        renderBoard();
    }

    return false;
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleGanttDragStart(e) {
    ganttDraggedCardId = this.dataset.cardId;
    ganttDraggedProject = this.dataset.project || '';
    this.classList.add('dragging');
}

function handleGanttDragEnd() {
    this.classList.remove('dragging');
    ganttDraggedCardId = null;
    ganttDraggedProject = null;
}

function handleGanttDragOver(e) {
    if (!ganttDraggedCardId) return;
    e.preventDefault();
}

function handleGanttDrop(e) {
    e.preventDefault();
    const container = this.closest('.gantt-rows');
    if (!container || !ganttDraggedCardId) return;

    const targetProject = this.dataset.project || '';
    if (targetProject !== ganttDraggedProject) return;

    const board = getBoard();
    const cardsInProject = board.cards.filter(c => !c.archived && (c.project || '') === targetProject);
    const sortedCards = cardsInProject
        .slice()
        .sort((a, b) => {
            const aOrder = Number.isFinite(a.ganttOrder) ? a.ganttOrder : Infinity;
            const bOrder = Number.isFinite(b.ganttOrder) ? b.ganttOrder : Infinity;
            if (aOrder !== bOrder) return aOrder - bOrder;
            const aStart = parseDateSafe(a.startDate || a.dueDate || a.createdAt) || new Date(0);
            const bStart = parseDateSafe(b.startDate || b.dueDate || b.createdAt) || new Date(0);
            return aStart - bStart;
        });

    const afterElement = getGanttDragAfterElement(container, e.clientY);

    const withoutDragged = sortedCards.filter(c => c.id !== ganttDraggedCardId);
    const draggedCard = board.cards.find(c => c.id === ganttDraggedCardId);
    if (!draggedCard) return;

    let newIndex;
    if (!afterElement) {
        newIndex = withoutDragged.length;
    } else {
        const afterId = afterElement.dataset.cardId;
        const idx = withoutDragged.findIndex(c => c.id === afterId);
        newIndex = idx === -1 ? withoutDragged.length : idx;
    }

    withoutDragged.splice(newIndex, 0, draggedCard);
    withoutDragged.forEach((c, idx) => {
        c.ganttOrder = idx + 1;
    });

    saveState();
    renderFilters();
    renderBoard();
}

function handleGanttBarMouseDown(e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const bar = e.currentTarget;
    const handle = e.target.dataset.handle;
    const mode = handle === 'left' ? 'resize-left' : handle === 'right' ? 'resize-right' : 'move';
    const cardId = bar.dataset.cardId;
    const startDay = Number(bar.dataset.startDay);
    const endDay = Number(bar.dataset.endDay);
    if (!cardId || !Number.isFinite(startDay) || !Number.isFinite(endDay)) return;
    const track = bar.parentElement;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    ganttBarDragState = {
        cardId,
        startDay,
        endDay,
        startX: e.clientX,
        trackWidth: rect.width,
        mode,
        newStartDay: startDay,
        newEndDay: endDay
    };
    document.addEventListener('mousemove', handleGanttBarMouseMove);
    document.addEventListener('mouseup', handleGanttBarMouseUp);
}

function handleGanttBarMouseMove(e) {
    if (!ganttBarDragState || !ganttTimelineMinDate || ganttViewDaysCache <= 0 || ganttTotalDays <= 0) return;
    e.preventDefault();
    const { startDay, endDay, startX, trackWidth, mode } = ganttBarDragState;
    const deltaPx = e.clientX - startX;
    const pxPerDay = trackWidth / ganttViewDaysCache;
    if (!Number.isFinite(pxPerDay) || pxPerDay === 0) return;
    const deltaDays = Math.round(deltaPx / pxPerDay);

    let newStart = startDay;
    let newEnd = endDay;
    const duration = endDay - startDay;

    if (mode === 'move') {
        newStart = clamp(startDay + deltaDays, 0, ganttTotalDays - 1);
        newEnd = newStart + duration;
        if (newEnd > ganttTotalDays - 1) {
            newEnd = ganttTotalDays - 1;
            newStart = Math.max(0, newEnd - duration);
        }
    } else if (mode === 'resize-left') {
        newStart = clamp(startDay + deltaDays, 0, endDay);
        if (newStart > newEnd) newStart = newEnd;
    } else if (mode === 'resize-right') {
        newEnd = clamp(endDay + deltaDays, startDay, ganttTotalDays - 1);
        if (newEnd < newStart) newEnd = newStart;
    }

    ganttBarDragState.newStartDay = newStart;
    ganttBarDragState.newEndDay = newEnd;
}

function handleGanttBarMouseUp(e) {
    if (!ganttBarDragState || !ganttTimelineMinDate || ganttViewDaysCache <= 0 || ganttTotalDays <= 0) return;
    const { cardId, startDay, endDay, startX, trackWidth, newStartDay, newEndDay, mode } = ganttBarDragState;
    ganttBarDragState = null;
    document.removeEventListener('mousemove', handleGanttBarMouseMove);
    document.removeEventListener('mouseup', handleGanttBarMouseUp);
    const deltaPx = e.clientX - startX;
    const pxPerDay = trackWidth / ganttViewDaysCache;
    if (!Number.isFinite(pxPerDay) || pxPerDay === 0) return;
    const deltaDays = Math.round(deltaPx / pxPerDay);
    const finalStart = Number.isFinite(newStartDay) ? newStartDay : startDay;
    const finalEnd = Number.isFinite(newEndDay) ? newEndDay : endDay;
    if (mode === 'move' && deltaDays === 0) return;
    if ((mode === 'resize-left' || mode === 'resize-right') && finalStart === startDay && finalEnd === endDay) return;

    const board = getBoard();
    const card = board.cards.find(c => c.id === cardId);
    if (!card) return;

    card.startDate = toDateOnlyString(addDays(ganttTimelineMinDate, finalStart).toISOString());
    card.dueDate = toDateOnlyString(addDays(ganttTimelineMinDate, finalEnd).toISOString());
    card.updatedAt = new Date().toISOString();

    saveState();
    renderFilters();
    renderBoard();
}

function handleGanttRowDragStart(e, card) {
    ganttRowDragging = true;
    ganttRowDragId = card.id;
    ganttRowDragProject = card.project || '';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
}

function handleGanttRowDragEnd() {
    ganttRowDragging = false;
    ganttRowDragId = null;
    ganttRowDragProject = null;
}

function handleGanttRowDragOver(e) {
    if (!ganttRowDragId) return;
    const targetProject = this.dataset.project || '';
    if (targetProject !== ganttRowDragProject) return;
    e.preventDefault();
}

function getGanttRowAfterElement(container, y) {
    const rows = [...container.querySelectorAll('.gantt-card-row')];
    return rows.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleGanttRowDrop(e) {
    if (!ganttRowDragId) return;
    const container = this.closest('.gantt-rows');
    if (!container) return;
    const targetProject = this.dataset.project || '';
    if (targetProject !== ganttRowDragProject) return;

    e.preventDefault();

    const board = getBoard();
    const cardsInProject = board.cards.filter(c => !c.archived && (c.project || '') === targetProject);
    const sortedCards = cardsInProject
        .slice()
        .sort((a, b) => {
            const aOrder = Number.isFinite(a.ganttOrder) ? a.ganttOrder : Infinity;
            const bOrder = Number.isFinite(b.ganttOrder) ? b.ganttOrder : Infinity;
            if (aOrder !== bOrder) return aOrder - bOrder;
            const aStart = parseDateSafe(a.startDate || a.dueDate || a.createdAt) || new Date(0);
            const bStart = parseDateSafe(b.startDate || b.dueDate || b.createdAt) || new Date(0);
            return aStart - bStart;
        });

    const afterElement = getGanttRowAfterElement(container, e.clientY);
    const withoutDragged = sortedCards.filter(c => c.id !== ganttRowDragId);
    const draggedCard = board.cards.find(c => c.id === ganttRowDragId);
    if (!draggedCard) return;

    let newIndex;
    if (!afterElement) {
        newIndex = withoutDragged.length;
    } else {
        const afterId = afterElement.dataset.cardId;
        const idx = withoutDragged.findIndex(c => c.id === afterId);
        newIndex = idx === -1 ? withoutDragged.length : idx;
    }

    withoutDragged.splice(newIndex, 0, draggedCard);
    withoutDragged.forEach((c, idx) => {
        c.ganttOrder = idx + 1;
    });

    saveState();
    renderFilters();
    renderBoard();
}

function getGanttDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.gantt-card-row:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --- Export / Import ---
function toCsvValue(value) {
    if (value === null || value === undefined) return '';
    let str = String(value);
    if (CSV_FORMULA_RE.test(str)) {
        str = `'${str}`;
    }
    str = str.replace(/"/g, '""');
    return /[",\n\r]/.test(str) ? `"${str}"` : str;
}

function parseCsv(text) {
    const rows = [];
    let current = '';
    let row = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') {
                i++;
            }
            row.push(current);
            rows.push(row);
            row = [];
            current = '';
        } else {
            current += char;
        }
    }

    if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
    }

    return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

// JSONとして現在の状態をダウンロード
function handleExportData() {
    const json = JSON.stringify(appState, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');

    a.href = url;
    a.download = `simple-kanban-backup-${yyyy}${mm}${dd}-${hh}${mi}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

function handleExportCsv() {
    const board = getBoard();
    const headers = ['id', 'columnName', 'title', 'description', 'priority', 'startDate', 'dueDate', 'assignee', 'project', 'order', 'archived', 'createdAt', 'updatedAt', 'archivedAt'];
    const rows = board.cards.map(card => {
        const col = board.columns.find(c => c.id === card.columnId);
        const columnName = col ? col.name : '';
        return headers.map(h => {
            if (h === 'columnName') return toCsvValue(columnName);
            return toCsvValue(card[h] ?? '');
        }).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');

    a.href = url;
    a.download = `simple-kanban-cards-${yyyy}${mm}${dd}-${hh}${mi}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

// JSONファイルから状態を復元
function handleImportFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            const imported = JSON.parse(text);

            if (!imported || typeof imported !== 'object' || !Array.isArray(imported.boards)) {
                alert('このJSONはSimple Kanbanのバックアップ形式ではありません。');
                return;
            }

            if (!confirm('インポートすると現在のデータはすべて上書きされます。よろしいですか？')) {
                return;
            }

            appState = ensureValidState(imported);
            saveState();
            renderFilters();
            renderBoard();
            renderArchivedTable();
            alert('インポートが完了しました。');
        } catch (err) {
            console.error(err);
            alert('JSONの読み込みに失敗しました。ファイル形式を確認してください。');
        }
    };
    reader.readAsText(file, 'utf-8');
}

function handleImportCsvChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            const rows = parseCsv(text);
            if (rows.length === 0) {
                alert('CSVにデータがありません。');
                return;
            }

            const headers = rows[0].map(h => h.trim());
            const board = getBoard();
            const defaultColumnId = board.columns[0] ? board.columns[0].id : null;

            const cards = [];
            rows.slice(1).forEach((cols, idx) => {
                if (cols.every(col => !String(col || '').trim())) return;

                const rowData = {};
                headers.forEach((h, i) => {
                    rowData[h] = cols[i] !== undefined ? cols[i] : '';
                });

                const title = (rowData.title || '').trim();
                if (!title) return;

                const rawColumnId = (rowData.columnId || rowData.columnid || '').trim();
                const rawColumnName = (rowData.columnName || rowData.columnname || '').trim();
                let columnId = rawColumnId;
                if (!columnId && rawColumnName) {
                    const match = board.columns.find(c => c.name === rawColumnName) ||
                        board.columns.find(c => c.name.toLowerCase() === rawColumnName.toLowerCase());
                    if (match) {
                        columnId = match.id;
                    }
                }
                if (!columnId) {
                    columnId = defaultColumnId;
                }
                if (!columnId) return;

                const orderNum = Number(rowData.order);
                const isArchived = String(rowData.archived).toLowerCase() === 'true';

                                const cardStart = (rowData.startDate || rowData.startdate || '').trim();
                const normalizedStart = sanitizeDateText(cardStart);
                const normalizedDue = sanitizeDateText(rowData.dueDate);
                const normalizedCreated = sanitizeDateText(toDateOnlyString(rowData.createdAt));
                const card = {
                    id: (rowData.id || '').trim() || `card-${Date.now()}-${idx}`,
                    columnId,
                    title,
                    description: rowData.description || '',
                    priority: sanitizePriority(rowData.priority),
                    startDate: normalizedStart || normalizedDue || normalizedCreated || new Date().toISOString().split('T')[0],
                    dueDate: normalizedDue,
                    assignee: (rowData.assignee || '').trim(),
                    project: (rowData.project || '').trim(),
                    order: Number.isFinite(orderNum) ? orderNum : cards.length + 1,
                    createdAt: rowData.createdAt || new Date().toISOString(),
                    updatedAt: rowData.updatedAt || new Date().toISOString(),
                    archived: isArchived
                };

                if (isArchived) {
                    card.archivedAt = rowData.archivedAt || new Date().toISOString();
                }

                cards.push(card);
            });

            if (cards.length === 0) {
                alert('有効なカード行が見つかりませんでした。タイトルは必須です。');
                return;
            }

            if (!confirm('CSVをインポートすると現在のカードをすべて上書きします。よろしいですか？')) {
                return;
            }

            board.cards = cards;
            saveState();
            renderFilters();
            renderBoard();
            renderArchivedTable();
            alert('CSVインポートが完了しました。');
        } catch (err) {
            console.error(err);
            alert('CSVの読み込みに失敗しました。形式を確認してください。');
        }
    };
    reader.readAsText(file, 'utf-8');
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    renderFilters();
    renderBoard();

    cardForm.addEventListener('submit', handleSaveCard);
    deleteCardBtn.addEventListener('click', handleDeleteCard);
    archiveCardBtn.addEventListener('click', handleArchiveCard);

    columnForm.addEventListener('submit', handleSaveColumn);
    deleteColumnBtn.addEventListener('click', handleDeleteColumn);

    resetBtn.addEventListener('click', handleReset);
    archivedBtn.addEventListener('click', openArchivedModal);

    filterAssigneeEl.addEventListener('change', handleFilterChange);
    filterProjectEl.addEventListener('change', handleFilterChange);
    if (ganttProjectFilter) {
        ganttProjectFilter.addEventListener('change', handleGanttProjectFilterChange);
    }

    detailAddCardBtn.addEventListener('click', () => {
        if (currentDetailColumnId) {
            openCardModal(null, currentDetailColumnId);
        }
    });

    // モーダルクローズ（×ボタン＆キャンセルボタンすべてに付ける）
    document.querySelectorAll('#card-modal .close-modal')
        .forEach(btn => btn.addEventListener('click', closeCardModal));

    document.querySelectorAll('#column-modal .close-modal')
        .forEach(btn => btn.addEventListener('click', closeColumnModal));

    document.querySelectorAll('#column-detail-modal .close-modal')
        .forEach(btn => btn.addEventListener('click', closeColumnDetail));

    document.querySelectorAll('#archived-modal .close-modal')
        .forEach(btn => btn.addEventListener('click', closeArchivedModal));

    cardModalEl.addEventListener('click', (e) => {
        if (e.target === cardModalEl) closeCardModal();
    });
    columnModalEl.addEventListener('click', (e) => {
        if (e.target === columnModalEl) closeColumnModal();
    });
    detailModalEl.addEventListener('click', (e) => {
        if (e.target === detailModalEl) closeColumnDetail();
    });
    archivedModalEl.addEventListener('click', (e) => {
        if (e.target === archivedModalEl) closeArchivedModal();
    });

    // 追加：エクスポート／インポートのイベント
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportData);
    }
    if (csvExportBtn) {
        csvExportBtn.addEventListener('click', handleExportCsv);
    }
    if (importBtn && importFileInput) {
        importBtn.addEventListener('click', () => {
            importFileInput.value = '';
            importFileInput.click();
        });
        importFileInput.addEventListener('change', handleImportFileChange);
    }
    if (csvImportBtn && csvImportFileInput) {
        csvImportBtn.addEventListener('click', () => {
            csvImportFileInput.value = '';
            csvImportFileInput.click();
        });
        csvImportFileInput.addEventListener('change', handleImportCsvChange);
    }

    if (ganttRangeSelect) {
        ganttRangeSelect.addEventListener('change', handleGanttRangeChange);
    }
    if (ganttRangeSlider) {
        ganttRangeSlider.addEventListener('input', handleGanttSliderChange);
    }

    if (tabKanbanBtn && tabGanttBtn) {
        tabKanbanBtn.addEventListener('click', () => switchView('kanban'));
        tabGanttBtn.addEventListener('click', () => switchView('gantt'));
    }

    // 初期表示はかんばんビュー
    switchView('kanban');
});










