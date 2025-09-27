export type Network = {
  name: string;
  chainId: number;
  network: string;
  explorerUrl: string;
  logo: string;
  rpcUrl: string;
  testnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: {
    name: string;
    url: string;
  };
  tokens: Array<{
    symbol: string;
    name: string;
    address: string;
  }>;
};
