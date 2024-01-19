const sidChars = '0123456789abcdefghijklmnopqrstuvwxyz';
const rngChar = _ => sidChars[~~(Math.random() * sidChars.length)];

module.exports.sid = (length = 10) => Array.from({ length }, rngChar).join('');

/** @param {string} token */
module.exports.parseJwt = token =>
    JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

/** @param {number} bps */
module.exports.bps2str = bps => {
    if (bps < 1000) return `${bps}b`;
    if (bps < 1000 * 1000) return `${Math.floor(bps / 1000)}Kb`;
    if (bps < 1000 * 1000 * 1000) return `${Math.floor(bps / 1000 / 1000)}Mb`;
    return `${(bps / 1000 / 1000 / 1000).toFixed(2)}Gb`;
};

/**
 * @template T
 * @param {ArrayLike<T>} arr
 */
module.exports.pick = arr => arr[~~(Math.random() * arr.length)];

module.exports.warn = (msg = 'error') => `⚠️ **${msg}** ⚠️`;
