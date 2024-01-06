const { HTTP_200 } = require('./http');

/** @param {uWSRes} res */
const resWrapper = (res, origin = '') => {
    res.onAborted(() => (res.finished = true));
    /**
     * @param {string} status
     * @param {?string} type
     * @param {?import("uWebSockets.js").RecognizedString} data
     * @param {?string} cache
     */
    return (status, type, data, cache) => {
        if (res.finished) return;
        res.finished = true;
        res.writeStatus(status).writeHeader('Access-Control-Allow-Origin', origin);
        if (type) res.writeHeader('Content-Type', type);
        if (cache && status === HTTP_200) res.writeHeader('cache-control', cache);
        res.end(data);
    };
};

/**
 * @param {uWSRes} res
 * @param {string} length
 * @param {?number} limit
 * @returns {() => Promise<Uint8Array | number>}
 */
const bodyParser = (res, length, limit, maxTime = 5000) => {
    const result = /^\d+$/.exec(length);
    if (!result || ~~result[0] != result[0]) return () => Promise.resolve(-1);
    const contentLength = ~~result[0];
    if (contentLength <= 0) return () => Promise.resolve(-1);
    if (contentLength >= limit) return () => Promise.resolve(-2);

    let offset = 0;
    let done = false;
    let cb = null;
    let pool = new Uint8Array(contentLength);

    const timeout = setTimeout(() => {
        if (!res.finished) res.close();
        if (cb) cb(null);
        else pool = null;
    }, maxTime);

    res.onData((chunk, isLast) => {
        if (res.finished || offset + chunk.byteLength > contentLength) return;

        pool.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;

        if (isLast) {
            clearTimeout(timeout);
            if (cb) cb(pool);
            else done = true;
        }
    });

    return () => new Promise(resolve => (done ? resolve(pool) : (cb = resolve)));
};

module.exports = { resWrapper, bodyParser };
