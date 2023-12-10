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
    id: number;
    name: string;
};

type AC6Part = AC6PartBase & {
    weight: number;
    en: number;
};

type AC6PartFrame = AC6Part & {
    ap: number;
    def: [number, number, number];
};

type HasStability = {
    stability: number;
};

type HasLoad = {
    load: number;
};

type AC6PartHead = AC6PartFrame &
    HasStability & {
        recovery: number;
        scan: [number, number, number];
    };

type AC6PartCore = AC6PartFrame &
    HasStability & {
        booster: number;
        output: number;
        supply: number;
    };

type AC6PartArms = AC6PartFrame &
    HasLoad & {
        recoil: number;
        firearm: number;
        melee: number;
    };

type AC6PartLegs = AC6PartFrame &
    HasStability &
    HasLoad & {
        jump: [number, number];
    };

type AC6PartBooster = AC6Part & {
    params: [
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
    params: [number, number, number, number, number];
};

type AC6PartGenerator = Omit<AC6Part, 'en'> & {
    params: [number, number, number, number, number];
    output: number;
};

type AC6PartExpansion = AC6PartBase & {
    params: number[];
};

interface InteractionRecord {
    id: string;
    step: number;
    data: AC6Data;
    update_at: number;
    create_at: number;
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
    page: number | null;
    r_arm: number;
    l_arm: number;
    r_back: number;
    l_back: number;
    head: number;
    core: number;
    arms: number;
    legs: number;
    booster: number;
    FCS: number;
    generator: number;
    expansion: number;
}
