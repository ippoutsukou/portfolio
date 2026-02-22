/**
 * rules.js - ビジネスルール・制約検証
 */

const Rules = (() => {
    // 設定
    const config = {
        businessStart: '08:30',
        businessEnd: '18:30',
        timeStep: 30, // 分単位
        allowOverlap: false,
        roundMode: 'floor' // 'floor' | 'ceil' | 'round'
    };

    /**
     * 設定を取得
     */
    function getConfig() {
        return { ...config };
    }

    /**
     * 営業時間内かチェック
     * @param {string} start - HH:MM
     * @param {string} end - HH:MM
     * @returns {{valid: boolean, message: string}}
     */
    function checkBusinessHours(start, end) {
        const startMin = Model.timeToMinutes(start);
        const endMin = Model.timeToMinutes(end);
        const businessStartMin = Model.timeToMinutes(config.businessStart);
        const businessEndMin = Model.timeToMinutes(config.businessEnd);

        if (startMin < businessStartMin) {
            return {
                valid: false,
                message: `開始時刻が営業時間外です（${config.businessStart}以降にしてください）`
            };
        }

        if (endMin > businessEndMin) {
            return {
                valid: false,
                message: `終了時刻が営業時間外です（${config.businessEnd}以前にしてください）`
            };
        }

        return { valid: true, message: '' };
    }

    /**
     * 時間を刻みに丸める
     * @param {string} time - HH:MM
     * @returns {string}
     */
    function roundToStep(time) {
        const minutes = Model.timeToMinutes(time);
        let rounded;

        switch (config.roundMode) {
            case 'ceil':
                rounded = Math.ceil(minutes / config.timeStep) * config.timeStep;
                break;
            case 'round':
                rounded = Math.round(minutes / config.timeStep) * config.timeStep;
                break;
            case 'floor':
            default:
                rounded = Math.floor(minutes / config.timeStep) * config.timeStep;
        }

        // 営業時間内に収める
        const businessStartMin = Model.timeToMinutes(config.businessStart);
        const businessEndMin = Model.timeToMinutes(config.businessEnd);
        rounded = Math.max(businessStartMin, Math.min(businessEndMin, rounded));

        return Model.minutesToTime(rounded);
    }

    /**
     * 2つの時間帯が重なるかチェック
     * @param {string} start1
     * @param {string} end1
     * @param {string} start2
     * @param {string} end2
     * @returns {boolean}
     */
    function isOverlapping(start1, end1, start2, end2) {
        const s1 = Model.timeToMinutes(start1);
        const e1 = Model.timeToMinutes(end1);
        const s2 = Model.timeToMinutes(start2);
        const e2 = Model.timeToMinutes(end2);

        return s1 < e2 && s2 < e1;
    }

    /**
     * 同一作業者の重なりをチェック
     * @param {ScheduleRecord} record - チェック対象レコード
     * @param {string} [excludeId] - 除外するレコードID（更新時用）
     * @returns {{valid: boolean, message: string, conflictRecord?: ScheduleRecord}}
     */
    function checkWorkerOverlap(record, excludeId = null) {
        if (config.allowOverlap) {
            return { valid: true, message: '' };
        }

        const existingRecords = Store.getRecordsByWorkerDate(record.worker, record.date);

        for (const existing of existingRecords) {
            if (excludeId && existing.id === excludeId) continue;
            if (existing.id === record.id) continue;

            if (isOverlapping(record.start, record.end, existing.start, existing.end)) {
                return {
                    valid: false,
                    message: `${record.worker}さんの ${existing.start}-${existing.end} (${existing.process}) と重複します`,
                    conflictRecord: existing
                };
            }
        }

        return { valid: true, message: '' };
    }

    /**
     * レコードの追加・更新前に全制約をチェック
     * @param {ScheduleRecord} record
     * @param {string} [excludeId]
     * @returns {{valid: boolean, errors: string[]}}
     */
    function validateRecord(record, excludeId = null) {
        const errors = [];

        // 営業時間チェック
        const hoursCheck = checkBusinessHours(record.start, record.end);
        if (!hoursCheck.valid) {
            errors.push(hoursCheck.message);
        }

        // start < end チェック
        if (Model.timeToMinutes(record.start) >= Model.timeToMinutes(record.end)) {
            errors.push('開始時刻が終了時刻以降になっています');
        }

        // 重なりチェック
        const overlapCheck = checkWorkerOverlap(record, excludeId);
        if (!overlapCheck.valid) {
            errors.push(overlapCheck.message);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 全レコードをバリデーション
     * @param {ScheduleRecord[]} records
     * @returns {{valid: boolean, errors: string[]}}
     */
    function validateAll(records) {
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];

            // 営業時間チェック
            const hoursCheck = checkBusinessHours(record.start, record.end);
            if (!hoursCheck.valid) {
                errors.push(`ID ${record.id}: ${hoursCheck.message}`);
            }

            // start < end
            if (Model.timeToMinutes(record.start) >= Model.timeToMinutes(record.end)) {
                errors.push(`ID ${record.id}: 開始時刻が終了時刻以降です`);
            }

            // 重なりチェック（同一worker/date内の他レコードと比較）
            for (let j = i + 1; j < records.length; j++) {
                const other = records[j];
                if (record.worker === other.worker && record.date === other.date) {
                    if (isOverlapping(record.start, record.end, other.start, other.end)) {
                        errors.push(`ID ${record.id} と ID ${other.id}: ${record.worker}さんの時間が重複しています`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    return {
        getConfig,
        checkBusinessHours,
        roundToStep,
        isOverlapping,
        checkWorkerOverlap,
        validateRecord,
        validateAll
    };
})();
