const lines = () => {
    const L = [];
    function acc(line = '') {
        L.push(line);
    }

    Object.defineProperty(acc, 'str', { get: () => L.join('\n') });
    return acc;
};

module.exports = {
    lines,
};
