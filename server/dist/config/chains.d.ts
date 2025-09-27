export declare const CHAIN_IDS: {
    readonly POLYGON_AMOY: 80002;
};
export declare const DEFAULT_RPC_URL = "https://rpc-amoy.polygon.technology/";
export declare const POLYGON_AMOY: {
    blockExplorers: {
        readonly default: {
            readonly name: "PolygonScan";
            readonly url: "https://amoy.polygonscan.com/";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: import("viem").ChainContract | {
            [sourceId: number]: import("viem").ChainContract | undefined;
        } | undefined;
        ensRegistry?: import("viem").ChainContract | undefined;
        ensUniversalResolver?: import("viem").ChainContract | undefined;
        multicall3?: import("viem").ChainContract | undefined;
        universalSignatureVerifier?: import("viem").ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 80002;
    name: "Polygon Amoy Testnet";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "Polygon";
        readonly symbol: "POL";
    };
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc-amoy.polygon.technology/"];
        };
        readonly public: {
            readonly http: readonly ["https://rpc-amoy.polygon.technology/"];
        };
    };
    sourceId?: number | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    fees?: import("viem").ChainFees<undefined> | undefined;
    formatters?: undefined;
    serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
    readonly network: "polygon-amoy";
};
export declare const DEFAULT_CHAIN: {
    blockExplorers: {
        readonly default: {
            readonly name: "PolygonScan";
            readonly url: "https://amoy.polygonscan.com/";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: import("viem").ChainContract | {
            [sourceId: number]: import("viem").ChainContract | undefined;
        } | undefined;
        ensRegistry?: import("viem").ChainContract | undefined;
        ensUniversalResolver?: import("viem").ChainContract | undefined;
        multicall3?: import("viem").ChainContract | undefined;
        universalSignatureVerifier?: import("viem").ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 80002;
    name: "Polygon Amoy Testnet";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "Polygon";
        readonly symbol: "POL";
    };
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc-amoy.polygon.technology/"];
        };
        readonly public: {
            readonly http: readonly ["https://rpc-amoy.polygon.technology/"];
        };
    };
    sourceId?: number | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    fees?: import("viem").ChainFees<undefined> | undefined;
    formatters?: undefined;
    serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
    readonly network: "polygon-amoy";
};
export declare const DEFAULT_CHAIN_ID: 80002;
export declare const SUPPORTED_CHAINS: 80002[];
export declare const CHAIN_NAMES: Record<number, string>;
export declare const RPC_URLS: Record<number, string>;
export declare const NATIVE_CURRENCIES: Record<number, {
    name: string;
    symbol: string;
    decimals: number;
}>;
export declare const USDC_CONTRACT_ADDRESS = "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582";
//# sourceMappingURL=chains.d.ts.map