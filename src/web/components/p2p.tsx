import { createContext, useContext, useEffect } from 'react';
import Style from '../style/p2p.module.css';

import { computed, makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import Writer from '../util/writer';
import Reader from '../util/reader';
import { sid } from '../../bot/util/misc';
import { frame } from '../util/misc';

enum OP {
    PING = 0,
    PONG = 1,
    DL = 2,
    DL_RES = 3,
    UL = 4,
    UL_RES = 5,
    TEST = 6,
    PROGRESS = 7,
}

class P2PHandle {
    private readonly endpoint: string;
    private readonly id: string;
    private sse: EventSource;

    @observable
    public peerName: string;
    @observable
    public peerProf: string;
    @observable
    public state: 'loading' | 'waiting' | 'negotiating' | 'test' | 'finished' | 'error' =
        'loading';
    @observable
    public error: string;
    @observable
    public readonly _progress: [number, number] = [0, 0];

    get progress() {
        return this._progress[0];
    }

    set progress(value: number) {
        runInAction(() => {
            this._progress[0] = value;
            this.syncProgress();
        });
    }

    @computed
    public get totalProgress() {
        return (this._progress[0] + this._progress[1]) * 0.5;
    }

    private pc: RTCPeerConnection;

    private udp: RTCDataChannel;
    private tcp: RTCDataChannel;

    private polite = false;
    private makingOffer = false;
    private ignoreOffer = false;

    private serverTimeOrigin: number;
    private serverTimestamp: number;

    private readonly PINGS = 1000;
    private readonly pingBuf = new Float64Array(this.PINGS).fill(-1);
    private readonly packetMap = new Map<string, [number, number]>();
    private readonly resolveMap = new Map<string, Function>();

    constructor(id: string) {
        this.endpoint = origin.includes(':8080')
            ? origin.replace('8080', '3000')
            : origin;
        this.id = id;
        makeObservable(this);
    }

    now(curr = performance.now()) {
        return curr - this.serverTimeOrigin + this.serverTimestamp;
    }

    async syncTime() {
        const perfList: PerformanceEntryList = [];
        const observer = new PerformanceObserver(list => {
            perfList.push(...list.getEntriesByType('resource'));
        });
        observer.observe({ entryTypes: ['resource'] });

        const timeURL = `${this.endpoint}/api/time`;
        const res = await fetch(timeURL);
        const serverTimestamp = Number(await res.text());

        perfList.push(...observer.takeRecords());
        observer.disconnect();

        const timingRec = perfList.find(
            r => r.name === timeURL,
        ) as PerformanceResourceTiming;
        const timePing = timingRec.responseStart - timingRec.requestStart;
        const halfPing = timePing * 0.5;
        this.serverTimestamp = serverTimestamp - halfPing;
        this.serverTimeOrigin = timingRec.responseStart - halfPing;

        console.log(
            `time diff: ${performance.now() + performance.timeOrigin - this.now()}ms`,
        );
    }

    async connect() {
        await this.syncTime();

        this.sse = new EventSource(`${this.endpoint}/api/p2p/${this.id}`);
        this.sse.onopen = () => runInAction(() => (this.state = 'waiting'));
        this.sse.onmessage = (e: MessageEvent<string>) =>
            runInAction(() => {
                this.onSignal(JSON.parse(e.data)).catch(e => {
                    runInAction(() => {
                        this.state = 'error';
                        this.error = String(e);
                    });
                });
            });
        this.sse.onerror = () => {
            if (this.sse.readyState === EventSource.CLOSED) {
                runInAction(() => {
                    if (this.state !== 'finished') this.state = 'error';
                });
            } else if (this.sse.readyState === EventSource.CONNECTING) {
                runInAction(() => {
                    if (this.state !== 'finished') {
                        this.state = 'error';
                        this.error = this.error || 'Can not reach server';
                    }
                });
                this.sse.close();
            }
            this.sse = null;
        };
    }

    async onSignal(
        signal: Partial<{
            pfp: string;
            name: string;
            done: boolean;
            error: string;
            polite: boolean;
            sdp: string;
            ice: string;
            type: RTCSdpType;
        }>,
    ) {
        const { pfp, name, error, polite, done } = signal;
        if (pfp) this.peerProf = pfp;
        if (name) this.peerName = name;
        if (error) this.error = error;
        if (polite) this.polite = polite;

        if (done) {
            this.state = 'finished';
            this.udp?.close();
            this.tcp?.close();
            return;
        }

        const { pc, makingOffer } = this;
        if (!pc && !error) return this.initPC();

        const description =
            signal.sdp &&
            new RTCSessionDescription({ type: signal.type, sdp: signal.sdp });
        const iceCandidates: RTCIceCandidateInit[] = signal.ice && JSON.parse(signal.ice);

        if (description) {
            this.state = 'negotiating';
            // stuck on smth, reset
            // setTimeout(() => this.state === 'negotiating' && location.reload(), 2000);

            const offerCollision =
                description.type === 'offer' &&
                (makingOffer || pc.signalingState !== 'stable');

            this.ignoreOffer = !this.polite && offerCollision;
            if (this.ignoreOffer) return;

            await pc.setRemoteDescription(description);
            if (description.type === 'offer') {
                await pc.setLocalDescription();
                await this.sendDesc(pc.localDescription);
            }
        }
        if (iceCandidates) {
            try {
                await Promise.all(iceCandidates.map(cand => pc.addIceCandidate(cand)));
            } catch (err) {
                if (!this.ignoreOffer) throw err;
            }
        }
    }

    async sendDesc(desc: RTCSessionDescription) {
        await fetch(`${this.endpoint}/api/p2p/${this.id}/${desc.type}`, {
            method: 'POST',
            body: desc.sdp,
        }).catch(_ => _);
    }

    async sendICE(candidates: RTCIceCandidate[]) {
        const body = candidates.map(
            ({ candidate, sdpMid, sdpMLineIndex, usernameFragment }) => ({
                candidate,
                sdpMid,
                sdpMLineIndex,
                usernameFragment,
            }),
        );
        await fetch(`${this.endpoint}/api/p2p/${this.id}/ice`, {
            method: 'POST',
            body: JSON.stringify(body),
        }).catch(_ => _);
    }

    async sendResult(result: Object) {
        await fetch(`${this.endpoint}/api/p2p/${this.id}/result`, {
            method: 'PUT',
            body: JSON.stringify(result),
        }).catch(_ => _);
    }

    syncProgress() {
        const { udp, progress } = this;
        if (udp.readyState !== 'open') return;

        const w = new Writer();
        w.u8(OP.PROGRESS);
        w.f64(progress);
        udp.send(w.buf());
    }

    initPC() {
        const pc = (this.pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: [
                        'stun:stun.l.google.com:19302',
                        'stun:stun1.l.google.com:19302',
                        // 'stun:stun2.l.google.com:19302',
                        // 'stun:stun3.l.google.com:19302',
                    ],
                },
            ],
        }));

        pc.onnegotiationneeded = async () => {
            try {
                this.makingOffer = true;
                await pc.setLocalDescription();
                await this.sendDesc(pc.localDescription);
            } catch (err) {
                console.error(err);
            } finally {
                this.makingOffer = false;
            }
        };
        const iceCandidates: RTCIceCandidate[] = [];
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) iceCandidates.push(candidate);
            if (pc.iceGatheringState === 'complete')
                this.sendICE(iceCandidates.splice(0, iceCandidates.length));
        };
        pc.oniceconnectionstatechange = () =>
            pc.iceConnectionState === 'failed' && pc.restartIce();
        pc.ondatachannel = ({ channel }) => {
            console.log('got channel: ', channel);
        };

        const init = () => {
            const udp = (this.udp = pc.createDataChannel('udp', {
                id: 0,
                maxRetransmits: 0,
                negotiated: true,
                ordered: false,
            }));

            const tcp = (this.tcp = pc.createDataChannel('tcp', {
                id: 1,
                negotiated: true,
                maxRetransmits: 4,
            }));

            tcp.binaryType = udp.binaryType = 'arraybuffer';
            udp.onopen = () => console.log('udp channel opened');

            tcp.onopen = () => {
                runInAction(() => (this.state = 'test'));
                if (this.polite) this.test(true);
            };

            udp.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
                const r = new Reader(new DataView(data));
                const op = r.u8();
                if (op === OP.PING) {
                    new Uint8Array(data)[0] = OP.PONG;
                    tcp.send(data);
                    console.log('got ping');
                } else if (op === OP.PROGRESS) {
                    runInAction(() => (this._progress[1] = r.f64()));
                } else {
                    console.log(`received unknown op in udp: ${op}`);
                }
            };

            tcp.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
                const timestamp = this.now();
                const w = new Writer();
                const r = new Reader(new DataView(data));
                const op = r.u8();

                if (op === OP.PONG) {
                    const id = r.utf8();
                    const entry = this.packetMap.get(id);
                    if (!entry) return console.error(`ping id not found: ${entry}`);
                    const [index, t0] = entry;
                    this.pingBuf[index] = timestamp - t0;

                    if (index === this.PINGS - 1) this.resolveMap.get('ping')?.();
                    console.log('got pong');
                } else if (op === OP.DL) {
                    const size = r.u32();
                    const id = r.utf8();
                    w.u8(OP.DL_RES);
                    w.f64(timestamp);
                    w.utf8(id);
                    w.skip(size);
                    const buf = w.buf();
                    tcp.send(buf);

                    // console.log(
                    //     `got dl req: ${size} ${id.slice(0, 6)}`,
                    //     tcp.bufferedAmount,
                    //     tcp.readyState,
                    // );
                } else if (op === OP.DL_RES) {
                    const t0 = r.f64();
                    const id = r.utf8();
                    this.resolveMap.get(id)?.(timestamp - t0);

                    // console.log(`got dl res: ${id}`, tcp.bufferedAmount, tcp.readyState);
                } else if (op === OP.UL) {
                    const id = r.utf8();
                    w.u8(OP.UL_RES);
                    w.f64(timestamp);
                    w.utf8(id);
                    tcp.send(w.buf());

                    // console.log(
                    //     `got ul req: ${r.length} ${id.slice(0, 6)}`,
                    //     tcp.bufferedAmount,
                    //     tcp.readyState,
                    // );
                } else if (op === OP.UL_RES) {
                    const t0 = r.f64();
                    const id = r.utf8();
                    this.resolveMap.get(id)?.(timestamp - t0);

                    // console.log(
                    //     `got ul res: ${id.slice(0, 6)}`,
                    //     tcp.bufferedAmount,
                    //     tcp.readyState,
                    // );
                } else if (op === OP.TEST) {
                    this.test();
                } else {
                    console.log(`received unknown op in tcp: ${op}`);
                }
            };

            tcp.onerror = e =>
                runInAction(() => {
                    console.error(e);
                    this.state = 'error';
                    this.error = 'Connection lost - refreshing in 5 seconds';
                    setTimeout(() => location.reload(), 5000);
                });
            udp.onerror = e => console.error(e);
        };

        init();
    }

    async test(recurr = false) {
        const { tcp, udp } = this;

        const result = {
            avgPing: -1,
            packetLoss: -1,
            jitter: -1,
            pings: this.PINGS,
            dl: {} as { [key: number]: number[] },
            ul: {} as { [key: number]: number[] },
        };

        // 1000 ping packets
        const w = new Writer();
        for (let i = 0; i < this.PINGS; i++) {
            const id = sid(32);
            w.u8(OP.PING);
            w.utf8(id);
            const buf = w.buf();
            w.reset();
            const timestamp = this.now();
            udp.send(buf);
            this.packetMap.set(id, [i, timestamp]);
            // wait for 1 frame per 5 packets
            if (i % 5) continue;
            runInAction(() => (this.progress = 0.2 * ((i + 1) / this.PINGS)));
            await frame();
        }

        await new Promise<void>(resolve => {
            this.resolveMap.set('ping', resolve);
            setTimeout(resolve, 5000);
        });

        {
            let sum = 0;
            let n = 0;
            for (let i = 0; i < this.PINGS; i++) {
                const p = this.pingBuf[i];
                if (p < 0) continue;
                n++;
                sum += p;
            }
            result.avgPing = sum / n;
            result.packetLoss = this.PINGS - n;
        }

        {
            let sum = 0;
            let n = 0;
            for (let i = 0; i < this.PINGS; i++) {
                const p = this.pingBuf[i];
                if (p < 0) continue;
                n++;
                sum += Math.pow(p - result.avgPing, 2);
            }
            result.jitter = Math.sqrt(sum / n);
        }

        console.log(`
avg ping = ${result.avgPing.toFixed(2)}ms
packet loss = ${((result.packetLoss / this.PINGS) * 100).toFixed(2)}%
jitter = ${result.jitter.toFixed(2)}ms`);

        const Kb = 1000;

        // download test, timeout in seconds
        const dl = async (
            packets: number,
            size: number,
            timeout: number,
            incre: number,
        ) => {
            const curr = this.progress;
            const arr = new Array<number>(packets).fill(-1);

            for (let i = 0; i < packets; i++) {
                const id = sid(32);
                w.u8(OP.DL);
                w.u32(size);
                w.utf8(id);
                const buf = w.buf();
                w.reset();
                const t0 = this.now();
                // console.log(`requesting ${size} dl`);
                tcp.send(buf);

                let time = await new Promise<number>(resolve => {
                    this.resolveMap.set(id, resolve);
                    setTimeout(() => resolve(NaN), timeout * 1000);
                });
                if (time < 3) time = this.now() - t0;
                arr[i] = Math.round(((size * 8) / time) * 1000);
                // console.log(`dl time: ${time.toFixed(2)}ms`);
                runInAction(() => (this.progress = curr + ((i + 1) / packets) * incre));
            }

            console.log(`download test [packets = ${packets}, size = ${size}] done!`);
            result.dl[size] = arr;
        };

        await dl(32, Kb, 5, 0.1);
        await dl(16, 4 * Kb, 5, 0.1);
        await dl(8, 32 * Kb, 5, 0.1);
        await dl(4, 128 * Kb, 5, 0.1);

        // upload test, timeout in seconds
        const ul = async (
            packets: number,
            size: number,
            timeout: number,
            incre: number,
        ) => {
            const curr = this.progress;
            const arr = new Array<number>(packets).fill(-1);

            for (let i = 0; i < packets; i++) {
                const id = sid(32);
                w.u8(OP.UL);
                w.utf8(id);
                w.skip(size);
                const buf = w.buf();
                w.reset();
                // console.log(`requesting ${size} ul`);

                const t0 = this.now();
                tcp.send(buf);

                let time = await new Promise<number>(resolve => {
                    this.resolveMap.set(id, resolve);
                    setTimeout(() => resolve(NaN), timeout * 1000);
                });
                if (time < 3) time = this.now() - t0;
                arr[i] = Math.round(((size * 8) / time) * 1000);
                // console.log(`ul time: ${time.toFixed(2)}ms`);
                runInAction(() => (this.progress = curr + ((i + 1) / packets) * incre));
            }

            console.log(`upload test [packets = ${packets}, size = ${size}] done!`);
            result.ul[size] = arr;
        };

        await ul(32, Kb, 2, 0.1);
        await ul(16, 4 * Kb, 4, 0.1);
        await ul(8, 32 * Kb, 5, 0.1);
        await ul(4, 128 * Kb, 5, 0.1);

        await this.sendResult(result);

        if (!recurr) return;
        w.reset();
        w.u8(OP.TEST);
        tcp.send(w.buf());
    }
}

const P2PCtx = createContext<P2PHandle>(null);

const Panel = observer(() => {
    const p2p = useContext(P2PCtx);

    useEffect(() => {
        document.title = 'P2P Test';
        p2p.connect();
    }, []);

    const waiting = p2p.state === 'waiting';
    const testing = p2p.state === 'test';
    const negotiating = p2p.state === 'negotiating';
    const error = p2p.state === 'error';
    const loaded = p2p.state !== 'loading';
    const finished = p2p.state === 'finished';

    // const percent = finished ? 100 : 100 * p2p.totalProgress;
    const percent = 100 * p2p.totalProgress;
    const dashArr = `${Math.ceil(percent)} ${100 - Math.ceil(percent)}`;

    return (
        <div className={Style.panel}>
            {loaded && !error && (
                <div className={Style.pfpDiv}>
                    <div className={Style.pfpContainer}>
                        {waiting && <div className={Style.spin}></div>}
                        {(testing || finished || error) && (
                            <svg
                                className={Style.progress}
                                data-done={finished}
                                viewBox="0 0 42 42"
                                version="1.1"
                                xmlns="http://www.w3.org/2000/svg"
                                xmlnsXlink="http://www.w3.org/1999/xlink"
                            >
                                <circle
                                    cx="21"
                                    cy="21"
                                    r="15.91549430918954"
                                    fill="transparent"
                                    stroke={error ? 'rgb(255, 58, 58)' : '#9ac2e3'}
                                    strokeWidth="8"
                                    strokeDasharray={dashArr}
                                    strokeDashoffset={25}
                                ></circle>
                                <g id="dev-server-stats"></g>
                            </svg>
                        )}
                        <img
                            data-loading={waiting}
                            className={Style.pfp}
                            src={p2p.peerProf}
                        />
                    </div>
                </div>
            )}
            <div className={Style.statusPanel}>
                {!loaded && <p>Connecting...</p>}
                {waiting && (
                    <p>
                        Waiting for <span className={Style.peerName}>{p2p.peerName}</span>{' '}
                        to connect
                    </p>
                )}
                {negotiating && <p>Negotiating p2p</p>}
                {testing && (
                    <p>
                        Testing connection to{' '}
                        <span className={Style.peerName}>{p2p.peerName}</span>
                    </p>
                )}
                {finished && (
                    <>
                        <p>
                            Completed <br />
                            Check Discord for result <br />
                            You can close this tab now
                        </p>
                    </>
                )}
                {error && <p className={Style.error}>{p2p.error || 'unknown error'}</p>}
            </div>
        </div>
    );
});

export const P2P = ({ p2pID }: { p2pID: string }) => {
    return (
        <P2PCtx.Provider value={new P2PHandle(p2pID)}>
            <Panel />
        </P2PCtx.Provider>
    );
};
