interface WebServerOptions {
    host: string;
    port: number;
    domain?: string;
    ssl_key: string;
    ssl_cert: string;
    public_dir?: string;
    access_log: boolean;
}

interface OAuth2Options {
    oauth2_redirect: string;

    discord_app_id: string;
    discord_secret: string;

    google_app_id: string;
    google_secret: string;

    facebook_app_id: string;
    facebook_secret: string;
}

interface BotOptions {
    owner_id: string;
    bot_token: string;
}

type AppOptions = WebServerOptions & OAuth2Options & BotOptions;

type AC6PartBase = {
    readonly id: number;
    readonly name: string;
};

type AC6Part = AC6PartBase & {
    readonly weight: number;
    readonly en: number;
};

type AC6PartFrame = AC6Part & {
    readonly ap: number;
    readonly def: [number, number, number];
};

type HasStability = {
    readonly stability: number;
};

type HasLoad = {
    readonly load: number;
};

type AC6PartHead = AC6PartFrame &
    HasStability & {
        readonly recovery: number;
        readonly scan: [number, number, number];
    };

type AC6PartCore = AC6PartFrame &
    HasStability & {
        readonly booster: number;
        readonly output: number;
        readonly supply: number;
    };

type AC6PartArms = AC6PartFrame &
    HasLoad & {
        readonly recoil: number;
        readonly firearm: number;
        readonly tracking: number;
        readonly melee: number;
    };

type AC6PartLegs = AC6PartFrame &
    HasStability &
    HasLoad & { type: 1 | 2 | 3 | 4 } & (
        | {
              readonly jump: [number, number];
          }
        | { readonly params: number[] }
    );

type AC6PartBooster = AC6Part & {
    readonly params: [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
    ];
};

type AC6PartFCS = AC6Part & {
    readonly params: [number, number, number, number, number];
};

type AC6PartGenerator = Omit<AC6Part, 'en'> & {
    readonly params: [number, number, number, number, number];
    readonly output: number;
};

type AC6PartExpansion = AC6PartBase & {
    readonly params: number[];
};

interface InteractionRecord {
    readonly id: string;
    state: number;
    readonly data: AC6Data;
    update_at: number;
    readonly create_at: number;
}

interface AC6Data {
    editing:
        | 'r_arm'
        | 'l_arm'
        | 'r_back'
        | 'l_back'
        | 'head'
        | 'core'
        | 'arms'
        | 'legs'
        | 'booster'
        | 'FCS'
        | 'generator'
        | 'expansion'
        | null;
    preview: number | null;
    r_arm: number;
    l_arm: number;
    r_back: number;
    l_back: number;
    r_swap?: boolean;
    l_swap?: boolean;
    head: number;
    core: number;
    arms: number;
    legs: number;
    booster: number;
    FCS: number;
    generator: number;
    expansion: number;
}

type RenderResult = import('discord.js').MessageEditOptions;
type Transition = Promise<[GarageState, string | null]>;
interface GarageState {
    readonly id: number;
    render: RenderResult | ((data: Readonly<AC6Data>) => RenderResult);
    onButton(data: AC6Data, id: string): Transition;
    onSelect(data: AC6Data, id: string, values: string[]): Transition;
}
