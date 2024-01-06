export default class Reader {
    view: DataView;
    le: boolean;
    offset = 0;

    constructor(view: DataView, le = true) {
        this.view = view;
        this.le = le;
    }

    get length() {
        return this.view.byteLength;
    }
    get EOF() {
        return this.offset === this.view.byteLength;
    }

    u8() {
        return this.view.getUint8(this.offset++);
    }

    i8() {
        return this.view.getInt8(this.offset++);
    }

    u16() {
        const a = this.view.getUint16(this.offset, this.le);
        this.offset += 2;
        return a;
    }

    i16() {
        const a = this.view.getInt16(this.offset, this.le);
        this.offset += 2;
        return a;
    }

    u32() {
        const a = this.view.getUint32(this.offset, this.le);
        this.offset += 4;
        return a;
    }

    i32() {
        const a = this.view.getInt32(this.offset, this.le);
        this.offset += 4;
        return a;
    }

    u64() {
        const a = this.view.getBigUint64(this.offset, this.le);
        this.offset += 8;
        return a;
    }

    i64() {
        const a = this.view.getBigInt64(this.offset, this.le);
        this.offset += 8;
        return a;
    }

    f32() {
        const a = this.view.getFloat32(this.offset, this.le);
        this.offset += 4;
        return a;
    }

    f64() {
        const a = this.view.getFloat64(this.offset, this.le);
        this.offset += 8;
        return a;
    }

    utf8(maxLength = 0) {
        const chars: string[] = [];
        while (this.offset < this.view.byteLength) {
            const ch = this.u8();
            if (!ch) break;
            chars.push(String.fromCharCode(ch));
            if (maxLength && chars.length >= maxLength) break;
        }
        return chars.join('');
    }

    skip(bytes: number) {
        this.offset += bytes;
    }

    raw(length = 0) {
        const buffer = this.view.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return buffer;
    }
}
