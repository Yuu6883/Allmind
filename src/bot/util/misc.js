const sidChars = '0123456789abcdefghijklmnopqrstuvwxyz';
const rngChar = _ => sidChars[~~(Math.random() * sidChars.length)];

module.exports.sid = (length = 10) => Array.from({ length }, rngChar).join('');

/** @param {string} token */
module.exports.parseJwt = token =>
    JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
