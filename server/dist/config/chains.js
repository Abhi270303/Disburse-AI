"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USDC_CONTRACT_ADDRESS = exports.NATIVE_CURRENCIES = exports.RPC_URLS = exports.CHAIN_NAMES = exports.SUPPORTED_CHAINS = exports.DEFAULT_CHAIN_ID = exports.DEFAULT_CHAIN = exports.POLYGON_AMOY = exports.DEFAULT_RPC_URL = exports.CHAIN_IDS = void 0;
const viem_1 = require("viem");
// Chain ID constants - Polygon Amoy Testnet
exports.CHAIN_IDS = {
    POLYGON_AMOY: 80002,
};
exports.DEFAULT_RPC_URL = "https://rpc-amoy.polygon.technology/";
// Define Polygon Amoy Testnet chain
exports.POLYGON_AMOY = (0, viem_1.defineChain)({
    id: exports.CHAIN_IDS.POLYGON_AMOY,
    name: 'Polygon Amoy Testnet',
    network: 'polygon-amoy',
    nativeCurrency: {
        decimals: 18,
        name: 'Polygon',
        symbol: 'POL',
    },
    rpcUrls: {
        default: {
            http: [exports.DEFAULT_RPC_URL],
        },
        public: {
            http: [exports.DEFAULT_RPC_URL],
        },
    },
    blockExplorers: {
        default: {
            name: 'PolygonScan',
            url: 'https://amoy.polygonscan.com/',
        },
    },
    testnet: true,
});
// Default chain configuration
exports.DEFAULT_CHAIN = exports.POLYGON_AMOY;
exports.DEFAULT_CHAIN_ID = exports.DEFAULT_CHAIN.id;
// Supported chains array - Polygon Amoy Testnet
exports.SUPPORTED_CHAINS = [exports.CHAIN_IDS.POLYGON_AMOY];
// Chain name mapping - Polygon Amoy Testnet
exports.CHAIN_NAMES = {
    [exports.CHAIN_IDS.POLYGON_AMOY]: 'Polygon Amoy Testnet',
};
// RPC URL mapping - Polygon Amoy Testnet
exports.RPC_URLS = {
    [exports.CHAIN_IDS.POLYGON_AMOY]: exports.DEFAULT_RPC_URL,
};
// Native currency mapping - Polygon Amoy Testnet
exports.NATIVE_CURRENCIES = {
    [exports.CHAIN_IDS.POLYGON_AMOY]: { name: 'Polygon', symbol: 'POL', decimals: 18 },
};
// USDC Contract address for Polygon Amoy Testnet
exports.USDC_CONTRACT_ADDRESS = '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582';
//# sourceMappingURL=chains.js.map