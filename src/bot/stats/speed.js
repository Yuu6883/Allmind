const { MessageFlags } = require('discord.js');
const { EMOTES } = require('../constants');
const { PATCHED_BOOSTERS } = require('../garage/parts');
const {
    getBoostSpeedMulti,
    getQBSpeedMulti,
    getABSpeedMulti,
} = require('../util/multiplier');

module.exports = class SpeedStats {
    /** @param {import("discord.js").ChatInputCommandInteraction} curr */
    static async handle(curr) {
        const boosterID = ~~curr.options.getString('booster');
        const weight = curr.options.getInteger('weight');

        if (weight < 30000 || weight > 150000)
            return await curr.reply({
                content: 'Invalid weight',
                flags: MessageFlags.Ephemeral,
            });

        const booster = PATCHED_BOOSTERS.find(b => b.id === boosterID);
        const bs = Math.floor(booster.params[0] * 0.06 * getBoostSpeedMulti(weight));
        const qb = Math.floor(booster.params[3] * 0.02 * getQBSpeedMulti(weight));
        const ab = Math.floor(booster.params[8] * 0.06 * getABSpeedMulti(weight));

        const emote = EMOTES.get('booster', boosterID);
        await curr.reply(
            `${emote} ${
                /(\(.+\))/.exec(booster.short ?? booster.name)?.[1] ?? ''
            } BS: **${bs}** QB: **${qb}** AB: **${ab}** [weight=${weight}]`,
        );
    }
};
