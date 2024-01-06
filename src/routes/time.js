const { performance } = require('perf_hooks');
const { HTTP_200 } = require('../bot/util/http');

/** @type {APIEndpointHandler} */
module.exports = function (res, req) {
    const origin = this.server.getCORSHeader(req.getHeader('origin'));
    res.writeStatus(HTTP_200)
        .writeHeader('Timing-Allow-Origin', origin)
        .writeHeader('Access-Control-Allow-Origin', origin)
        .writeHeader('Cache-Control', 'no-cache')
        .end((performance.timeOrigin + performance.now()).toString());
};
