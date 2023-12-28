const { uid2id } = require('../bot/util/cache');
const { parseJwt } = require('../bot/util/misc');
const OAuthStateDB = require('../database/oauth');
const LinkDB = require('../database/link');

/** @type {APIEndpointHandler} */
module.exports = async function (res, req) {
    const stateStr = req.getQuery('state');
    const code = req.getQuery('code');
    const ip = this.server.getIP(req, res);

    let aborted = false;
    res.onAborted(() => (aborted = true));

    const state = await OAuthStateDB.pop(stateStr);

    if (
        !state ||
        state.ip !== ip ||
        state.expire < Date.now() ||
        !Object.hasOwn(this.auth, state.provider)
    ) {
        console.error('state error', state, ip);
        aborted || res.cork(() => res.writeStatus('400').end('Invalid State'));
        return;
    }

    const auth = await this.auth[state.provider].exchange(code, false);
    if (!auth || auth.error) {
        console.error('oauth error', auth);
        aborted ||
            res.cork(() => res.writeStatus('500').res.end('OAuth2 Exchange Error'));
        return;
    }

    if (state.provider === 'challonge') {
        const { user } = parseJwt(auth.access_token);
        const id = await uid2id(state.data.uid);
        const result = await LinkDB.add(id, 'challonge', user).catch(_ => null);

        aborted || res.cork(() => res.end(result?.changes ? 'Success' : 'Error'));
        return;
    }

    aborted || res.cork(() => res.writeStatus('404').end('Not Found'));
};
