export const delay = (ms: number) =>
    ~~ms > 0 && new Promise<void>(res => setTimeout(res, ~~ms));

export const frame = () => new Promise<void>(res => requestAnimationFrame(() => res()));
