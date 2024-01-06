const sidChars = '0123456789abcdefghijklmnopqrstuvwxyz';
const rngChar = _ => sidChars[~~(Math.random() * sidChars.length)];

module.exports.sid = (length = 10) => Array.from({ length }, rngChar).join('');

/** @param {string} token */
module.exports.parseJwt = token =>
    JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

/** @param {number} bps */
module.exports.bps2str = bps => {
    if (bps < 1000) return `${bps}b`;
    if (bps < 1000 * 1000) return `${Math.round(bps / 1000)}Kb`;
    if (bps < 1000 * 1000 * 1000) return `${Math.round(bps / 1000 / 1000)}Mb`;
    return `${Math.round(bps / 1000 / 1000 / 1000)}Gb`;
};
