export function fromHex(h: string): string {
    let s = ''
    for (let i = 0; i < h.length; i += 2) {
        s += String.fromCharCode(parseInt(h.substr(i, 2), 16))
    }
    return decodeURIComponent(escape(s))
}

export function isNullish(h: string | number | boolean | null | undefined): boolean {
    return h === null || h === undefined;
}