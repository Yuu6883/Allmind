const {
    getBoostSpeedMulti,
    overburdenPenalty,
    getTankBoostSpeedMulti,
    getQBSpeedMulti,
    getAttitudeRecovery,
    getQBReloadMulti,
} = require('../util/multiplier');
const { LEG_TYPES } = require('./parts');

/** @param {MappedData} param */
const getStats = param => {
    const list = Object.values(param);
    const stats = {
        AP: 0,
        def0: 0,
        def1: 0,
        def2: 0,
        stability: 0,
        totalWeight: 0,
        enLoad: 0,
        armLoad: param.l_arm.weight + param.r_arm.weight,
        armLoadLimit: param.arms.load,
        legLoad: 0,
        legLoadLimit: param.legs.load,
        enCap: param.generator.params[0],
        enLoadLimit: Math.floor(param.core.output * 0.01 * param.generator.output),
        constraint: [false, false, false],
    };

    for (const part of list) {
        if (!part) continue;
        if (part.ap) stats.AP += part.ap;
        if (part.def) {
            stats.def0 += part.def[0];
            stats.def1 += part.def[1];
            stats.def2 += part.def[2];
        }
        if (part.stability) stats.stability += part.stability;
        if (part.weight) stats.totalWeight += part.weight;
        if (part.en) stats.enLoad += part.en;
    }

    /** @type {AC6PartLegs} */
    const legs = param.legs;
    stats.legLoad = stats.totalWeight - legs.weight;
    stats.tracking = stats.armLoad <= stats.armLoadLimit ? param.arms.tracking : 'TBD';

    const w = stats.totalWeight;
    stats.recovery = Math.floor(getAttitudeRecovery(w) * 100);
    stats.enRecharge =
        stats.enLoad > stats.enLoadLimit
            ? 100
            : Math.floor(1500 + (stats.enLoadLimit - stats.enLoad) * (25 / 6));

    const ob = overburdenPenalty(stats.legLoad / stats.legLoadLimit);
    const qbMulti = getQBSpeedMulti(w);

    if (LEG_TYPES[legs.type] === 'TANK') {
        stats.boostSpeed = Math.floor(
            legs.params[2] * 0.06 * getTankBoostSpeedMulti(w) * ob,
        );
        stats.qbSpeed = Math.floor(legs.params[5] * 0.02 * qbMulti * ob);

        stats.qbEN = Math.floor((200 - param.core.booster) * 0.01 * legs.params[7]);
        stats.qbReload = getQBReloadMulti(w - legs.params[9]) * legs.params[8];
    } else {
        /** @type {AC6PartBooster} */
        const booster = param.booster;
        // Normal boosters
        stats.boostSpeed = Math.floor(
            booster.params[0] * 0.06 * getBoostSpeedMulti(w) * ob,
        );
        stats.qbSpeed = Math.floor(booster.params[3] * 0.02 * qbMulti * ob);
        stats.qbEN = Math.floor((200 - param.core.booster) * 0.01 * booster.params[5]);
        stats.qbReload = getQBReloadMulti(w - booster.params[7]) * booster.params[6];
    }

    stats.qbReload = (Math.round(stats.qbReload * 100) * 0.01).toFixed(2);
    stats.enDelay = (
        ~~(((1000 - 10 * (param.core.supply - 100)) / param.generator.params[1]) * 100) *
        0.01
    ).toFixed(2);

    stats.constraint[0] = stats.armLoad > stats.armLoadLimit;
    stats.constraint[1] = stats.legLoad > stats.legLoadLimit;
    stats.constraint[2] = stats.enLoad > stats.enLoadLimit;

    return stats;
};

module.exports = getStats;
