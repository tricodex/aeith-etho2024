'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Web3AuthMPCCoreKit, WEB3AUTH_NETWORK } from "@web3auth/mpc-core-kit";
import { tssLib } from "@toruslabs/tss-dkls-lib";
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
import { CHAIN_NAMESPACES, CustomChainConfig } from "@web3auth/base";

const chainConfig: CustomChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Ethereum mainnet
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorer: "https://etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
};

interface Web3AuthContextType {
  web3auth: Web3AuthMPCCoreKit | null;
  provider: EthereumSigningProvider | null;
  user: any;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const Web3AuthContext = createContext<Web3AuthContextType>({
  web3auth: null,
  provider: null,
  user: null,
  isLoading: false,
  login: async () => {},
  logout: async () => {},
});

export const useWeb3Auth = () => useContext(Web3AuthContext);

export const Web3AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [web3auth, setWeb3auth] = useState<Web3AuthMPCCoreKit | null>(null);
  const [provider, setProvider] = useState<EthereumSigningProvider | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const web3auth = new Web3AuthMPCCoreKit({
          web3AuthClientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID!,
          web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
          tssLib: tssLib,
          storage: window.localStorage,
          manualSync: true,
        });

        await web3auth.init();

        const ethereumProvider = new EthereumSigningProvider({ config: { chainConfig } });
        ethereumProvider.setupProvider(web3auth.provider);

        setWeb3auth(web3auth);
        setProvider(ethereumProvider);
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const login = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    setIsLoading(true);
    try {
      const web3authProvider = await web3auth.connect();
      setProvider(web3authProvider);
      const user = await web3auth.getUserInfo();
      setUser(user);
    } catch (error) {
      console.error("Error during login:", error);
    }
    setIsLoading(false);
  };

  const logout = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    setIsLoading(true);
    await web3auth.logout();
    setProvider(null);
    setUser(null);
    setIsLoading(false);
  };

  const value = {
    web3auth,
    provider,
    user,
    isLoading,
    login,
    logout,
  };

  return <Web3AuthContext.Provider value={value}>{children}</Web3AuthContext.Provider>;
};