const { HTTP_200, HTTP_400, HTTP_404 } = require('../bot/util/http');
const { bodyParser } = require('../bot/util/rest');

/** @param {uWSRes} r */
const status = (s, r) =>
    r.finished || (r.cork(() => r.writeStatus(s).end()), (r.finished = true));
/** @param {uWSRes} r */
const send = (data, r) =>
    r.finished || r.cork(() => r.write(`data: ${JSON.stringify(data)}\n\n`));
/** @param {uWSRes} r */
const end = (data, r) =>
    r.finished ||
    r.cork(() => (r.end(`data: ${JSON.stringify(data)}\n\n`), (r.finished = true)));
/** @param {uWSRes} r */
const error = (msg, r) => end({ error: msg }, r);

/** @type {APIEndpointHandler} */
const p2p = async function (res, req) {
    res.onAborted(() => (res.finished = true));

    const p2pID = req.getParameter(0);

    res.writeStatus(HTTP_200);
    res.writeHeader('Content-type', 'text/event-stream');
    res.writeHeader('Connection', 'keep-alive');
    res.writeHeader('Cache-Control', 'no-cache');
    res.writeHeader(
        'Access-Control-Allow-Origin',
        this.server.getCORSHeader(req.getHeader('origin')),
    );

    const peer = this.bot.p2p.peers.get(p2pID);
    if (!peer) return error('not found or expired', res);
    const midx = peer.pids.indexOf(p2pID);
    if (midx < 0) return error('invalid P2P ID', res);
    const oidx = 1 - midx;

    const oUser = peer.users[oidx];
    const desc = peer.desc[oidx];
    const base = {
        pfp: oUser.displayAvatarURL({ size: 512 }),
        name: oUser.displayName,
    };

    if (peer.results[0] && peer.results[1])
        return end(Object.assign(base, { done: true }), res);

    send(
        Object.assign(base, {
            polite: !midx,
            ice: peer.cand[oidx],
            sdp: desc?.sdp,
            type: desc?.type,
        }),
        res,
    );

    peer.streams[midx] && error('new tab opened', peer.streams[midx]);
    peer.streams[midx] = res;

    // keep connection alive
    const interval = setInterval(
        () =>
            res.finished ? clearInterval(interval) : res.cork(() => res.write('\n\n')),
        5000,
    );
};

/** @type {APIEndpointHandler} */
const p2pDesc = async function (res, req) {
    const origin = this.server.getCORSHeader(req.getHeader('origin'));
    res.onAborted(() => (res.finished = true));

    const p2pID = req.getParameter(0);
    /** @type {RTCSdpType} */
    const type = req.getParameter(1);
    if (!['offer', 'answer'].includes(type)) return res.writeStatus(HTTP_400).end();

    const peer = this.bot.p2p.peers.get(p2pID);
    if (!peer) return res.writeStatus(HTTP_404).end();
    const midx = peer.pids.indexOf(p2pID);
    if (midx < 0) return res.writeStatus(HTTP_400).end();
    const oidx = 1 - midx;

    // 2 kb
    const getBody = bodyParser(res, req.getHeader('content-length'), 2 * 1024);
    const body = await getBody();
    if (typeof body === 'number') return status(HTTP_400, res);

    const sdp = Buffer.from(body).toString('utf8');
    if (type === 'offer') peer.desc[midx] = { type, sdp };
    if (peer.streams[oidx]) send({ type, sdp }, peer.streams[oidx]);
    // console.log(`${type}: ${peer.users[midx].displayName}`);

    res.writeHeader('Access-Control-Allow-Origin', origin);

    status(HTTP_200, res);
};

/** @type {APIEndpointHandler} */
const p2pICE = async function (res, req) {
    const origin = this.server.getCORSHeader(req.getHeader('origin'));
    res.onAborted(() => (res.finished = true));

    const p2pID = req.getParameter(0);

    const peer = this.bot.p2p.peers.get(p2pID);
    if (!peer) return res.writeStatus(HTTP_404).end();
    const midx = peer.pids.indexOf(p2pID);
    if (midx < 0) return res.writeStatus(HTTP_400).end();
    const oidx = 1 - midx;

    // 4 kb
    const getBody = bodyParser(res, req.getHeader('content-length'), 4 * 1024);
    const body = await getBody();
    if (typeof body === 'number') return status(HTTP_400, res);

    const ice = (peer.cand[midx] = Buffer.from(body).toString('utf8'));
    peer.streams[oidx] && send({ ice }, peer.streams[oidx]);
    // console.log(`got ice from ${peer.users[midx].displayName}`);

    res.writeHeader('Access-Control-Allow-Origin', origin);

    status(HTTP_200, res);
};

/** @type {APIEndpointHandler} */
const p2pResult = async function (res, req) {
    const origin = this.server.getCORSHeader(req.getHeader('origin'));
    res.onAborted(() => (res.finished = true));

    const p2pID = req.getParameter(0);

    const peer = this.bot.p2p.peers.get(p2pID);
    if (!peer) return res.writeStatus(HTTP_404).end();
    const midx = peer.pids.indexOf(p2pID);
    if (midx < 0) return res.writeStatus(HTTP_400).end();

    // 2 kb
    const getBody = bodyParser(res, req.getHeader('content-length'), 2 * 1024);
    const body = await getBody();
    if (typeof body === 'number') return status(HTTP_400, res);
    const oidx = 1 - midx;

    peer.results[midx] = Buffer.from(body).toString('utf8');
    if (peer.results[oidx]) {
        peer.streams[0] && end({ done: true }, peer.streams[0]);
        peer.streams[1] && end({ done: true }, peer.streams[1]);
    }
    this.bot.p2p.tryComplete(p2pID);
    // console.log(`got result from ${peer.users[midx].displayName}`);

    res.writeHeader('Access-Control-Allow-Origin', origin);

    status(HTTP_200, res);
};

module.exports = { p2p, p2pDesc, p2pICE, p2pResult };
