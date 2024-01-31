const os = require('os');

let last = os.cpus();

module.exports = () => {
    const curr = os.cpus();

    const usage = new Float64Array(curr.length);
    for (let i = 0; i < curr.length; i++) {
        const usr = curr[i].times.user - last[i].times.user;
        const sys = curr[i].times.sys - last[i].times.sys;
        const idl = curr[i].times.idle - last[i].times.idle;
        usage[i] = 1 - idl / (usr + sys + idl);
    }

    last = curr;

    return {
        cpu: Array.from({ length: curr.length }, (_, i) => ({
            usage: usage[i],
            speed: curr[i].speed,
        })),
        totalMem: os.totalmem(),
        mem: os.totalmem() - os.freemem(),
    };
};
