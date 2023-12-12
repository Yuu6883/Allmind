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

type AuthProvider = 'discord';

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
    folder: number;
    data_name: string;
    ac_name: string;
}

interface AC6Data {
    owner: string;
    ac_name: string;
    icon?: string;

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
    noEmbed?: boolean;
    extra?: string;
}

type GarageRenderResult = import('discord.js').MessageEditOptions['components'];
type GarageEventResult = [
    GarageState,
    string | null,
    { modal?: import('discord.js').ModalBuilder },
];

type MsgCompInt = import('discord.js').MessageComponentInteraction;

type SMProcessable = import('discord.js').ChatInputCommandInteraction | MsgCompInt;

type GarageInteraction = import('discord.js').ModalSubmitInteraction | MsgCompInt;

interface GarageState {
    readAccount?: boolean;
    render:
        | GarageRenderResult
        | ((
              data: Readonly<AC6Data>,
              acc: Readonly<AC6Account>,
          ) => Promise<GarageRenderResult>);
    onButton(data: AC6Data, id: string): Promise<GarageEventResult>;
    onSelect(data: AC6Data, id: string, values: string[]): Promise<GarageEventResult>;
    onModal(
        data: AC6Data,
        id: string,
        fields: import('discord.js').ModalSubmitFields,
    ): Promise<GarageEventResult>;
}
