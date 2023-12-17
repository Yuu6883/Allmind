const fs = require('fs');

/** @param {string} dir */
const walkDir = dir => {
    /** @type {string[]} */
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            /* Recurse into a subdirectory */
            results = results.concat(walkDir(file));
        } else {
            /* Is a file */
            results.push(file);
        }
    });
    return results;
};

module.exports = { walkDir };
