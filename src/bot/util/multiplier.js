/** @param {number} w */
const getBoostSpeedMulti = w => {
    if (w <= 40000) return 1;
    if (w <= 62500) return 1 - (w - 40000) * ((10 / 3) * 1e-6);
    if (w <= 75000) return 0.925 - (w - 62500) * 0.000006;
    if (w <= 80000) return 0.85 - (w - 75000) * 0.000015;
    if (w <= 120000) return 0.775 - (w - 80000) * 0.000003125;
    return 0.65;
};

/** @param {number} w */
const getQBSpeedMulti = w => {
    if (w <= 40000) return 1;
    if (w <= 62500) return 1 - (w - 40000) * ((40 / 9) * 1e-6);
    if (w <= 75000) return 0.9 - (w - 62500) * 0.000004;
    if (w <= 80000) return 0.85 - (w - 75000) * 0.00001;
    if (w <= 120000) return 0.8 - (w - 80000) * 0.0000025;
    return 0.7;
};

/** @param {number} dw */
const getQBReloadMulti = dw => {
    if (dw <= 0) return 1;
    if (dw <= 5000) return 1 + dw * 0.00002;
    if (dw <= 10000) return 1.1 + (dw - 5000) * 0.00004;
    if (dw <= 30000) return 1.3 + (dw - 10000) * 0.000085;
    if (dw <= 50000) return 3 + (dw - 30000) * 0.000025;
    return 3.5;
};

/** @param {number} w */
const getABSpeedMulti = w => {
    if (w <= 40000) return 1;
    if (w <= 50000) return 1 - (w - 40000) * 0.000005;
    if (w <= 75000) return 0.95 - (w - 50000) * 0.000002;
    if (w <= 100000) return 0.9 - (w - 75000) * 0.000008;
    if (w <= 150000) return 0.7 - (w - 100000) * 0.000003;
    return 0.55;
};

/** @param {number} w */
const getMLSpeedMulti = w => {
    if (w <= 40000) return 1;
    if (w <= 62500) return 1 - (w - 40000) * ((20 / 9) * 1e-6);
    if (w <= 75000) return 0.95 - (w - 62500) * 0.000008;
    if (w <= 80000) return 0.85 - (w - 75000) * 0.00002;
    if (w <= 120000) return 0.75 - (w - 80000) * 0.0000025;
    return 0.65;
};

/** @param {number} w */
const getTankBoostSpeedMulti = w => {
    if (w <= 50000) return 1;
    if (w <= 75000) return 1 - (w - 50000) * 0.000004;
    if (w <= 100000) return 0.9 - (w - 75000) * 0.000002;
    if (w <= 110000) return 0.85 - (w - 100000) * 0.0000025;
    if (w <= 120000) return 0.8 - (w - 110000) * 0.000005;
    return 0.7;
};

/** @param {number} w */
const getAttitudeRecovery = w => {
    if (w <= 40000) return 1.5;
    if (w <= 60000) return 1.5 - (w - 40000) * 0.000015;
    if (w <= 80000) return 1.2 - (w - 60000) * 0.000015;
    if (w <= 110000) return 0.9 - (w - 80000) * 0.00001;
    if (w <= 140000) return 0.6 - (w - 110000) * 0.000001;
    return 0.57;
};

/** @param {number} r */
const overburdenPenalty = r => {
    if (r <= 1) return 1;
    if (r <= 1.05) return 2 - r;
    if (r <= 1.1) return 0.95 - (r - 1.05) * 3;
    if (r <= 1.3) return 0.8 - (r - 1.1) * 0.25;
    if (r <= 1.5) return 0.75 - (r - 1.3) * 0.25;
    return 0.7;
};

module.exports = {
    getQBReloadMulti,
    getBoostSpeedMulti,
    getQBSpeedMulti,
    getABSpeedMulti,
    getMLSpeedMulti,
    getAttitudeRecovery,
    getTankBoostSpeedMulti,
    overburdenPenalty,
};
