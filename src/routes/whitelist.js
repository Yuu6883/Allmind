const { HTTP_400, HTTP_401, HTTP_200, HTTP_500 } = require('../bot/util/http');

/** @type {APIEndpointHandler} */
module.exports.whitelist = async function (res, req) {
    const token = req.getParameter(0);
    const origin = req.getHeader('origin');
    const ip = this.server.getIP(req, res);

    let aborted = false;
    res.onAborted(() => (aborted = true));

    const user = this.pal?.pending.get(token);

    if (!user)
        return res
            .writeStatus(HTTP_400)
            .writeHeader('Access-Control-Allow-Origin', this.server.getCORSHeader(origin))
            .end();

    this.pal.pending.delete(token);

    if (!this.pal.guild.members.cache.get(user.id))
        return res
            .writeStatus(HTTP_401)
            .writeHeader('Access-Control-Allow-Origin', this.server.getCORSHeader(origin))
            .end();

    const success = await this.pal.whitelist(ip, user.id);
    if (aborted) return;

    if (success) {
        res.writeStatus(HTTP_200)
            .writeHeader('Access-Control-Allow-Origin', this.server.getCORSHeader(origin))
            .end(
                JSON.stringify({
                    pfp: user.displayAvatarURL({ size: 512 }),
                    name: user.displayName,
                }),
            );
    } else {
        res.writeStatus(HTTP_500)
            .writeHeader('Access-Control-Allow-Origin', this.server.getCORSHeader(origin))
            .end();
    }
};
