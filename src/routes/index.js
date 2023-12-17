const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const uWS = require('uWebSockets.js');
const { walkDir } = require('../util/os');

/** @param {uWS.HttpResponse} res */
const redirect = (res, to = '/') => {
    res.writeStatus('302');
    res.writeHeader('location', to);
    res.end();
};

module.exports = class Server {
    /** @param {import("../app")} app */
    constructor(app) {
        this.app = app;
        this.closed = false;

        /** @type {Map<string, { mime: string, buffer: Buffer }>} */
        this.buffers = new Map();
    }

    async reloadStaticFiles() {
        this.buffers.clear();

        const publicRoot = this.options.public_dir
            ? path.resolve(__dirname, '..', '..', this.options.public_dir)
            : path.resolve(__dirname, '..', '..', 'public');

        const dir = walkDir(publicRoot).map(f =>
            f.replace(publicRoot, '').replace(/\\/g, '/'),
        );

        let bytes = 0;
        await Promise.all(
            dir.map(async f => {
                const name = f.replace(/\.html$/, '').replace(/\/index$/, '') || '/';
                this.buffers.set(name, {
                    mime: mime.lookup(f),
                    buffer: await fs.readFile(
                        path.resolve(publicRoot, ...f.split(path.sep)),
                    ),
                });
            }),
        );

        if (!this.buffers.has('/')) {
            console.warn('Main page NOT FOUND');
            this.buffers.set('/', { buffer: 'Allmind' });
        }

        for (const f of this.buffers.values())
            bytes += f.buffer.byteLength || f.buffer.length;
        console.log(`Loaded static assets (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
    }

    get options() {
        return this.app.options;
    }

    getCORSHeader(origin = '') {
        if (origin.startsWith('http://localhost')) return origin;
        return this.options.domain || origin;
    }

    optionMiddleware(options = 'GET, OPTIONS') {
        /**
         * @param {uWS.HttpResponse} res
         * @param {uWS.HttpResponse} req
         */
        return (res, req) => {
            res.writeHeader(
                'Access-Control-Allow-Origin',
                this.getCORSHeader(req.getHeader('origin')),
            );
            res.writeHeader('Access-Control-Allow-Methods', options);
            res.writeHeader('Access-Control-Allow-Headers', 'mind-auth').end();
        };
    }

    open() {
        if (this.socket) return console.warn('Server already open');
        this.reloadStaticFiles();

        return new Promise((resolve, reject) => {
            this.ws = uWS
                .App()
                .any('*', this.logAccess.bind(this))
                .get('/*', this.staticFiles.bind(this))
                .listen(this.options.host, this.options.port, us_listen_socket => {
                    this.socket = us_listen_socket;
                    us_listen_socket
                        ? resolve(this.onOpen())
                        : reject('Server failed to listen on port ' + this.options.port);
                });
        });
    }

    /**
     * @param {uWS.HttpResponse} res
     * @param {uWS.HttpRequest} req
     */
    staticFiles(res, req) {
        const url = req.getUrl();
        if (this.buffers.has(url)) {
            const { mime, buffer } = this.buffers.get(url);
            if (mime) res.writeHeader('content-type', mime);

            // res.writeHeader(
            //     'Access-Control-Allow-Origin',
            //     this.getCORSHeader(req.getHeader('origin')),
            // );
            // res.writeHeader('Cross-Origin-Opener-Policy', 'same-origin');
            // res.writeHeader('Cross-Origin-Embedder-Policy', 'require-corp');

            if (mime === 'text/html') {
                res.writeHeader('cache-control', 's-maxage=0,max-age=60');
            } else {
                res.writeHeader('cache-control', 's-maxage=86400,max-age=86400');
            }
            res.end(buffer);
        } else redirect(res);
    }

    onOpen() {}

    /**
     * @param {uWS.HttpResponse} res
     * @param {uWS.HttpRequest} req
     */
    logAccess(res, req) {
        if (this.options.access_log) {
            const now = new Date();
            console.log(
                `${prettyLogTime(now)} ${this.app.getIP(req, res)} ${req.getUrl()}`,
            );
        }
        req.setYield(true);
    }

    close() {
        this.closed = true;
        if (!this.socket) return console.warn('Server is not open');
        uWS.us_listen_socket_close(this.socket);
        this.socket = null;
    }
};
