const Palworld = require('../bot/access/pal');
const Terraria = require('../bot/access/terra');
const { HTTP_401, HTTP_200, HTTP_500, HTTP_404 } = require('../bot/util/http');

/** @type {APIEndpointHandler} */
module.exports.whitelist = async function (res, req) {
    const token = req.getParameter(0);
    const origin = req.getHeader('origin');
    const ip = this.server.getIP(req, res);

    let aborted = false;
    res.onAborted(() => (aborted = true));

    const opt = this.bot.access.pending.get(token);

    if (!opt || !['palworld', 'terraria'].includes(opt.type))
        return res
            .writeStatus(HTTP_404)
            .writeHeader('Access-Control-Allow-Origin', this.server.getCORSHeader(origin))
            .end();

    this.bot.access.pending.delete(token);
    /** @type {Palworld | Terraria} */
    const mod = { palworld: this.bot.pal, terraria: this.bot.terra }[opt.type];

    if (!mod.members.has(user.id))
        return res
            .writeStatus(HTTP_401)
            .writeHeader('Access-Control-Allow-Origin', this.server.getCORSHeader(origin))
            .end();

    const success = await mod.whitelist(ip, user.id);
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
