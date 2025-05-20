const { MessageFlags } = require('discord.js');
const { R, S, O, C } = require('../util/form');

module.exports = class Test {
    /** @param {App} app */

    constructor(app) {
        this.app = app;
    }

    /**
     * @param {GarageInteraction} curr
     */
    async handle(curr) {
        const page = curr.options.getInteger('page');
        const rows = [];
        for (let i = 0; i < page; i++) {
            rows.push(
                R(
                    S(
                        `page-${i}`,
                        Array.from({ length: 25 }).map((_, j) =>
                            O({
                                label: `option-${j + 1}`,
                                value: j.toString(),
                            }),
                        ),
                    ).setPlaceholder(`Page ${i + 1}`),
                ),
            );
        }

        const components = [];
        while (rows.length)
            components.push(C().addActionRowComponents(...rows.splice(0, 5)));

        console.log(components);

        await curr.reply({
            flags: MessageFlags.IsComponentsV2,
            components,
        });
    }
};
