const OAuthStateDB = require('../database/oauth');

/** @type {APIEndpointHandler} */
module.exports = async function (res, req) {
    /** @type {AuthProvider} */
    const provider = req.getParameter(0);

    if (!Object.hasOwn(this.auth, provider)) {
        return res.writeStatus('404').end('Not Found');
    }

    const data = {};

    if (provider === 'challonge') {
        const token = req.getQuery('token');
        const user = this.bot.link.pop(token);

        if (!user) {
            return res.writeStatus('400').end('Bad Request');
        }

        data.uid = user.id;
    }

    let aborted = false;
    res.onAborted(() => (aborted = true));

    const state = await OAuthStateDB.add(provider, this.server.getIP(req, res), data);

    if (aborted) return;
    res.cork(() => {
        if (state) {
            res.writeStatus('302');
            res.writeHeader('location', `${this.auth[provider].redirect}&state=${state}`);
            res.end();
        } else {
            res.writeStatus('500');
            res.end('Internal Error');
        }
    });
};
