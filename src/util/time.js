const { performance } = require('perf_hooks');

module.exports = {
    /**
     * @param {number} ms
     * @returns {Promise<void>}
     */
    delay: ms => ~~ms > 0 && new Promise(res => setTimeout(res, ~~ms)),

    /** @param {Promise<void>} p */
    timedAwait: async p => {
        const now = performance.now();
        await p;
        return performance.now() - now;
    },
};
