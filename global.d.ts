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

    challonge_app_id: string;
    challonge_secret: string;
    challonge_api_key: string;
}

interface BotOptions {
    owner_id: string;
    bot_token: string;
}

type AppOptions = WebServerOptions & OAuth2Options & BotOptions;

type AuthProvider = 'discord' | 'challonge';
type uWSRes = import('uWebSockets.js').HttpResponse & {
    finished?: boolean;
};
type uWSReq = import('uWebSockets.js').HttpRequest;

interface AC6Account {
    id: number;
    provider: AuthProvider;
    uid: string;
    acc_token: string;
    ref_token: string;
    auth_ip: string;
    auth_time: number;
    coam: number;
    update_at: number;
    create_at: number;
}

type AC6PartBase = {
    readonly id: number;
    readonly name: string;
    readonly short?: string;
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

interface GarageRecord {
    readonly id: string;
    readonly link: string;
    readonly state: string;
    readonly data: AC6Data;
    readonly update_at: number;
}

interface SaveData {
    id: number;
    owner: number;
    folder: number;
    data_name: string;
    ac_name: string;
}

interface BaseData {
    data_name: string;
    ac_name: string;
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

type MappedData = {
    r_arm: AC6Part;
    l_arm: AC6Part;
    r_back: AC6Part;
    l_back: AC6Part;
    head: AC6PartHead;
    core: AC6PartCore;
    arms: AC6PartArms;
    legs: AC6PartLegs;
    booster?: AC6PartBooster;
    FCS: AC6PartFCS;
    generator: AC6PartGenerator;
    expansion: AC6PartExpansion;
} & { [key: string]: AC6Part };

type AC6Data = BaseData & {
    owner: string;
    icon?: string;
    overwrite?: number; // save id to prompt overwrite
    staging?: Partial<BaseData> & { [key: string]: number };
    extra?: string;
    settings: {
        autoEquip: boolean;
        longName: boolean;
    };
};

type GarageRenderResult = import('discord.js').MessageEditOptions['components'];
type GarageEventResult = [
    GarageState,
    string | null,
    {
        exit?: boolean;
        modal?: import('discord.js').ModalBuilder;
    },
];

type MsgCompInt = import('discord.js').MessageComponentInteraction;

type SMProcessable = import('discord.js').ChatInputCommandInteraction | MsgCompInt;

type GarageInteraction = import('discord.js').ModalSubmitInteraction | MsgCompInt;

interface GarageState {
    readonly noEmbed?: boolean;
    render:
        | GarageRenderResult
        | ((data: Readonly<AC6Data>) => Promise<GarageRenderResult>);
    onButton(data: AC6Data, id: string): Promise<GarageEventResult>;
    onSelect(data: AC6Data, id: string, values: string[]): Promise<GarageEventResult>;
    onModal(
        data: AC6Data,
        id: string,
        fields: import('discord.js').ModalSubmitFields,
    ): Promise<GarageEventResult>;
}

interface News {
    id: string;
    title: string;
    date: number;
    desc: string;
    image: string;
    url: string;
}
interface ChallongeAuthorization {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    create_at: number;
}

type App = import('./src/app');

type APIEndpointHandler = (this: App, res: uWSRes, req: uWSReq) => void;

interface P2PResult {
    avgPing: number;
    packetLoss: number;
    jitter: number;
    pings: number;
    dl: { [key: string]: number };
    ul: { [key: string]: number };
}

declare module '*.svg' {
    const content: any;
    export default content;
}

declare module '*.module.css' {
    const classes: { readonly [key: string]: string };
    export default classes;
}
