export let tagColorMap : Map<string, number> = new Map();

export const randomHue = () => { return Math.random() * 360; };

export const primaryHSL = (input: number) => { return `hsl(${input}, 100%, 50%)`; };

export const complementHSL = (input: number) => {
    return `hsl(${(input + 180) % 360}, 100%, 50%)`;
}

export const makeUniqueTagHue = () => {
    let hue = randomHue();
    while ([...tagColorMap.values()].includes(hue)) {
        hue = randomHue();
    }

    return hue;
}
