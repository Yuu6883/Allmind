export const delay = (ms: number) =>
    ~~ms > 0 && new Promise<void>(res => setTimeout(res, ~~ms));

export const frame = () =>
    new Promise<void>(res => {
        // whichever resolve first
        requestAnimationFrame(() => res());
        setTimeout(() => res(), 1000 / 60); // 60 fps
        if (document.hidden) res();
    });
