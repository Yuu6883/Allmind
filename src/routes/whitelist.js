const { HTTP_401, HTTP_200, HTTP_500, HTTP_404 } = require('../bot/util/http');

/** @type {APIEndpointHandler} */
module.exports.whitelist = async function (res, req) {
    const token = req.getParameter(0);
    const origin = req.getHeader('origin');
    const ip = this.server.getIP(req, res);

    let aborted = false;
    res.onAborted(() => (aborted = true));

    const user = this.bot.pal.pending.get(token);

    if (!user)
        return res
            .writeStatus(HTTP_404)
            .writeHeader('Access-Control-Allow-Origin', this.server.getCORSHeader(origin))
            .end();

    this.bot.pal.pending.delete(token);

    if (!this.bot.pal.members.get(user.id))
        return res
            .writeStatus(HTTP_401)
            .writeHeader('Access-Control-Allow-Origin', this.server.getCORSHeader(origin))
            .end();

    const success = await this.bot.pal.whitelist(ip, user.id);
    if (aborted) return;

    res.cork(() => {
        if (success) {
            res.writeStatus(HTTP_200)
                .writeHeader(
                    'Access-Control-Allow-Origin',
                    this.server.getCORSHeader(origin),
                )
                .end(
                    JSON.stringify({
                        pfp: user.displayAvatarURL({ size: 512 }),
                        name: user.displayName,
                    }),
                );
        } else {
            res.writeStatus(HTTP_500)
                .writeHeader(
                    'Access-Control-Allow-Origin',
                    this.server.getCORSHeader(origin),
                )
                .end();
        }
    });
};
