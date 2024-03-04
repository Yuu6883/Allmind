const fs = require('fs/promises');
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

const link = require('./link');
const callback = require('./callback');
const { p2p, p2pDesc, p2pICE, p2pResult } = require('./p2p');
const time = require('./time');
const { whitelist } = require('./whitelist');
const { HTTP_404 } = require('../bot/util/http');

module.exports = class Server {
    /** @param {App} app */
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
                    buffer: await fs.readFile(path.resolve(publicRoot, ...f.split('/'))),
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

    optionMiddleware(options = 'GET, OPTIONS', auth = false) {
        /**
         * @param {uWS.HttpResponse} res
         * @param {uWS.HttpResponse} req
         */
        return (res, req) => {
            res.writeHeader(
                'Access-Control-Allow-Origin',
                this.getCORSHeader(req.getHeader('origin')),
            );
            auth && res.writeHeader('Access-Control-Allow-Headers', 'mind-auth');
            res.writeHeader('Access-Control-Allow-Methods', options).end();
        };
    }

    open() {
        if (this.socket) return console.warn('Server already open');
        this.reloadStaticFiles();

        return new Promise((resolve, reject) => {
            uWS.App()
                .any('/*', this.logAccess.bind(this))
                .get('/api/time', time.bind(this.app))
                .get('/api/link/:provider', link.bind(this.app))
                .get('/api/auth/callback', callback.bind(this.app))
                .get('/api/p2p/:id', p2p.bind(this.app))
                .options('/api/p2p/:id/result', this.optionMiddleware('PUT, OPTIONS'))
                .post('/api/p2p/:id/ice', p2pICE.bind(this.app))
                .post('/api/p2p/:id/:desc', p2pDesc.bind(this.app))
                .put('/api/p2p/:id/result', p2pResult.bind(this.app))
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
            if (mime === 'text/html') {
                res.writeHeader('cache-control', 's-maxage=0,max-age=60');
            } else {
                res.writeHeader('cache-control', 's-maxage=86400,max-age=0');
            }
            res.end(buffer);
        } else redirect(res);
    }

    onOpen() {
        if (!this.options.access?.port) return;
        uWS.SSLApp({
            key_file_name: this.options.access.key_file_name,
            cert_file_name: this.options.access.cert_file_name,
        })
            .get('/:token', whitelist.bind(this.app))
            .any('/*', (res, _) => res.writeStatus(HTTP_404).end())
            .listen(this.options.host, this.options.access.port, us_listen_socket => {
                this.socket2 = us_listen_socket;

                us_listen_socket ||
                    console.error(
                        'Access whitelist server failed to listen on port ' +
                            this.options.access.port,
                    );
            });
    }

    /**
     * @param {uWS.HttpResponse} res
     * @param {uWS.HttpRequest} req
     */
    logAccess(res, req) {
        if (this.options.access_log)
            console.log(`${this.getIP(req, res)} ${req.getMethod()} ${req.getUrl()}`);
        req.setYield(true);
    }

    close() {
        this.closed = true;
        if (!this.socket) return console.warn('Server is not open');
        uWS.us_listen_socket_close(this.socket);
        if (this.socket2) uWS.us_listen_socket_close(this.socket2);
        this.socket = null;
        this.socket2 = null;
    }

    /**
     * @param {uWSReq} req
     * @param {uWSRes} res
     */
    getIP(req, res) {
        return (
            req.getHeader('cf-connecting-ip') ||
            Buffer.from(res.getRemoteAddressAsText()).toString()
        );
    }
};
