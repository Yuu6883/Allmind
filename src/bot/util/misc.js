const sidChars = '0123456789abcdefghijklmnopqrstuvwxyz';
const rngChar = _ => sidChars[~~(Math.random() * sidChars.length)];

module.exports.sid = (length = 10) => Array.from({ length }, rngChar).join('');

/** @param {string} token */
module.exports.parseJwt = token =>
    JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

/** @param {number} bps */
module.exports.bits2str = (bps, prec = 2) => {
    if (bps < 1000) return `${bps}b`;
    if (bps < 1000 * 1000) return `${Math.floor(bps / 1000)}Kb`;
    if (bps < 1000 * 1000 * 1000) return `${Math.floor(bps / 1000 / 1000)}Mb`;
    return `${(bps / 1000 / 1000 / 1000).toFixed(prec)}Gb`;
};

/** @param {number} bps */
module.exports.byte2str = (bps, prec = 2) => {
    if (bps < 1024) return `${bps}B`;
    if (bps < 1024 * 1024) return `${Math.floor(bps / 1024)}KB`;
    if (bps < 1024 * 1024 * 1024) return `${Math.floor(bps / 1024 / 1024)}MB`;
    return `${(bps / 1024 / 1024 / 1024).toFixed(prec)}GB`;
};

/**
 * @template T
 * @param {ArrayLike<T>} arr
 */
module.exports.pick = arr => arr[~~(Math.random() * arr.length)];

module.exports.warn = (msg = 'error') => `⚠️ **${msg}** ⚠️`;
