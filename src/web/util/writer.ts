export default class Writer {
    static BufferPool = new DataView(new ArrayBuffer(32 * 1024 * 1024)); // 32 mb
    offset: number;
    le: boolean;

    constructor(le = true) {
        this.offset = 0;
        this.le = le;
    }

    u8(a: number) {
        Writer.BufferPool.setUint8(this.offset++, a);
        return this;
    }

    /** @param {number} a */
    i8(a: number) {
        Writer.BufferPool.setInt8(this.offset++, a);
        return this;
    }

    u16(a: number) {
        Writer.BufferPool.setUint16(this.offset, a, this.le);
        this.offset += 2;
        return this;
    }

    i16(a: number) {
        Writer.BufferPool.setInt16(this.offset, a, this.le);
        this.offset += 2;
        return this;
    }

    u32(a: number) {
        Writer.BufferPool.setUint32(this.offset, a, this.le);
        this.offset += 4;
        return this;
    }

    i32(a: number) {
        Writer.BufferPool.setInt32(this.offset, a, this.le);
        this.offset += 4;
        return this;
    }

    f32(a: number) {
        Writer.BufferPool.setFloat32(this.offset, a, this.le);
        this.offset += 4;
        return this;
    }

    f64(a: number) {
        Writer.BufferPool.setFloat64(this.offset, a, this.le);
        this.offset += 8;
        return this;
    }

    i64(n: number) {
        Writer.BufferPool.setBigInt64(this.offset, BigInt(n), this.le);
        this.offset += 8;
        return this;
    }

    u64(n: number) {
        Writer.BufferPool.setBigUint64(this.offset, BigInt(n), this.le);
        this.offset += 8;
        return this;
    }

    utf8(a: string | Uint8Array, pad = true) {
        if (typeof a === 'string') {
            for (let i = 0; i < a.length; i++) this.u8(a.charCodeAt(i));
            pad && this.u8(0);
        } else if (a?.byteLength) {
            for (const i of a) this.u8(i);
        }
        return this;
    }

    skip(v = 0) {
        this.offset += v;
    }

    reset() {
        this.offset = 0;
    }

    buf() {
        return Writer.BufferPool.buffer.slice(0, this.offset);
    }
}
