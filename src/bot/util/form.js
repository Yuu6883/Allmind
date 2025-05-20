const {
    ButtonBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle: TS,
    ButtonStyle: BS,
    ContainerBuilder,
} = require('discord.js');

/**
 * @param {string} id
 * @param {string} label
 */
const B = (
    id,
    label,
    opt = {
        style: BS.Primary,
        disabled: false,
        emoji: null,
        url: null,
    },
) => {
    const b = new ButtonBuilder()
        .setDisabled(opt.disabled || false)
        .setStyle(opt.style || BS.Primary);
    if (label) b.setLabel(label);
    if (opt.emoji) b.setEmoji(opt.emoji);
    if (opt.url) {
        b.setURL(opt.url);
        b.setStyle(BS.Link);
    } else {
        b.setCustomId(id);
    }
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

/**
 * @param {string} id
 * @param {string} title
 */
const M = (id, title, comp = []) =>
    new ModalBuilder()
        .setCustomId(id)
        .setTitle(title)
        .setComponents(comp.map(c => R(c)));

/**
 * @param {string} id
 * @param {string} label
 */
const T = (
    id,
    label,
    opt = {
        min: 1,
        max: 16,
        value: '',
        style: TS.Short,
        required: true,
    },
) => {
    const text = new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setMinLength(opt.min ?? 1)
        .setMaxLength(opt.max ?? 16)
        .setStyle(opt.style ?? TS.Short)
        .setRequired(opt.required ?? true);
    if (opt.value) text.setValue(opt.value);
    return text;
};

const C = () => new ContainerBuilder();

module.exports = { B, R, S, O, M, T, C, BS, TS };
