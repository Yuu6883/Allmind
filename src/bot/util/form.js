const {
    ButtonBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonStyle,
} = require('discord.js');

/**
 * @param {string} id
 * @param {string} label
 */
const B = (
    id,
    label,
    opt = {
        style: ButtonStyle.Primary,
        disabled: false,
        emoji: null,
    },
) => {
    const b = new ButtonBuilder()
        .setCustomId(id)
        .setDisabled(opt.disabled || false)
        .setStyle(opt.style || ButtonStyle.Primary);
    if (label) b.setLabel(label);
    if (opt.emoji) b.setEmoji(opt.emoji);
    return b;
};

/** @param {import('discord.js').RestOrArray<ComponentType>} comp */
const R = (...comp) => new ActionRowBuilder().addComponents(...comp);

/** @param {string} id */
const S = (id, options) =>
    new StringSelectMenuBuilder()
        .setCustomId(id)
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(options);

/** @param {import('discord.js').SelectMenuComponentOptionData | import('discord.js').APISelectMenuOption} arg */
const O = arg => new StringSelectMenuOptionBuilder(arg);

module.exports = { B, R, S, O };
