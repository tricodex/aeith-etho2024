// src/components/Web3AuthProvider.tsx
'use client';

import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { tssLib } from "@toruslabs/tss-dkls-lib";
import { CHAIN_NAMESPACES, type IProvider } from "@web3auth/base";
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
import {
  COREKIT_STATUS,
  type JWTLoginParams,
  makeEthereumSigner,
  parseToken,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
  type UserInfo,
} from "@web3auth/mpc-core-kit";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Environment variables for Web3Auth and Firebase configuration
const web3AuthClientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID!;
const verifier = "grandhard-firebase"; // Verifier name as per your Web3Auth configuration

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Ethereum chain configuration
const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Ethereum Mainnet
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorer: "https://etherscan.io/",
  ticker: "ETH",
  tickerName: "Ethereum",
};

// Define the shape of our Web3Auth context
type Web3AuthContextType = {
  coreKitInstance: Web3AuthMPCCoreKit | null;
  provider: IProvider | null;
  isLoading: boolean;
  user: UserInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getUserInfo: () => Promise<UserInfo | null>;
};

// Create the context
const Web3AuthContext = createContext<Web3AuthContextType | null>(null);

// Custom hook to use the Web3Auth context
export function useWeb3Auth() {
  const context = useContext(Web3AuthContext);
  if (!context) {
    throw new Error("useWeb3Auth must be used within a Web3AuthProvider");
  }
  return context;
}

// Type for parsed token
interface ParsedToken {
  sub: string;
  [key: string]: unknown;
}

// Wrapper function to ensure init() returns a Promise
const initCoreKit = async (coreKit: Web3AuthMPCCoreKit): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    try {
      void coreKit.init().then(() => resolve());
    } catch (error) {
      reject(new Error("Failed to initialize Core Kit", { cause: error }));
    }
  });
};

// Wrapper function to ensure setupProvider() returns a Promise
const setupEthereumProvider = async (
  evmProvider: EthereumSigningProvider,
  signer: ReturnType<typeof makeEthereumSigner>
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    try {
      void evmProvider.setupProvider(signer).then(() => resolve());
    } catch (error) {
      reject(new Error("Failed to setup Ethereum provider", { cause: error }));
    }
  });
};

// Wrapper function to ensure getUserInfo() returns a Promise
const getUserInfoWrapper = async (coreKit: Web3AuthMPCCoreKit): Promise<UserInfo> => {
  return new Promise<UserInfo>((resolve, reject) => {
    try {
      const userInfo = coreKit.getUserInfo();
      resolve(userInfo);
    } catch (error) {
      reject(new Error("Failed to get user info", { cause: error }));
    }
  });
};

// Web3Auth Provider component
export function Web3AuthProvider({ children }: { children: ReactNode }) {
  const [coreKitInstance, setCoreKitInstance] = useState<Web3AuthMPCCoreKit | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Web3Auth on component mount
  useEffect(() => {
    const init = async () => {
      try {
        const coreKit = new Web3AuthMPCCoreKit({
          web3AuthClientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.DEVNET, // Use Sapphire Devnet as per your configuration
          tssLib: tssLib,
          manualSync: true,
          // Custom storage implementation compatible with both client and server
          storage: {
            getItem: (key: string) => {
              if (typeof window !== 'undefined') {
                return window.localStorage.getItem(key);
              }
              return null;
            },
            setItem: (key: string, value: string) => {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
              }
            },
          },
        });

        // Use the wrapper function to ensure init() returns a Promise
        await initCoreKit(coreKit);
        setCoreKitInstance(coreKit);

        // Check if user is already logged in
        if (coreKit.status === COREKIT_STATUS.LOGGED_IN) {
          const userInfo = await getUserInfoWrapper(coreKit);
          setUser(userInfo);
        }
      } catch (error) {
        console.error("Failed to initialize Web3Auth MPC Core Kit", error);
      }
    };

    void init();
  }, []);

  // Login function
  const login = async () => {
    if (!coreKitInstance) {
      throw new Error("Core Kit not initialized");
    }

    setIsLoading(true);
    try {
      // Initialize Firebase and authenticate with Google
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const googleProvider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken(true);
      
      // Ensure parseToken returns a properly typed object
      const parsedToken: ParsedToken = parseToken(idToken) as ParsedToken;

      // Prepare login params for Web3Auth
      const loginParams: JWTLoginParams = {
        verifier,
        verifierId: parsedToken.sub,
        idToken,
      };

      // Login with Web3Auth
      await coreKitInstance.loginWithJWT(loginParams);
      if (coreKitInstance.status === COREKIT_STATUS.LOGGED_IN) {
        await coreKitInstance.commitChanges();
      }

      // Fetch and set user info using the wrapper function
      const userInfo = await getUserInfoWrapper(coreKitInstance);
      setUser(userInfo);

      // Setup provider for EVM Chain
      const evmProvider = new EthereumSigningProvider({ config: { chainConfig } });
      // Use the wrapper function to ensure setupProvider returns a Promise
      await setupEthereumProvider(evmProvider, makeEthereumSigner(coreKitInstance));
      setProvider(evmProvider);
    } catch (error) {
      console.error("Login failed", error);
      // Handle login error (e.g., show error message to user)
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    if (!coreKitInstance) {
      throw new Error("Core Kit not initialized");
    }

    setIsLoading(true);
    try {
      await coreKitInstance.logout();
      setUser(null);
      setProvider(null);
    } catch (error) {
      console.error("Logout failed", error);
      // Handle logout error
    } finally {
      setIsLoading(false);
    }
  };

  // Get user info function
  const getUserInfo = async () => {
    if (!coreKitInstance) {
      throw new Error("Core Kit not initialized");
    }

    try {
      // Use the wrapper function to ensure getUserInfo returns a Promise
      const userInfo = await getUserInfoWrapper(coreKitInstance);
      return userInfo;
    } catch (error) {
      console.error("Error fetching user info:", error);
      return null;
    }
  };

  // Create the context value
  const value: Web3AuthContextType = {
    coreKitInstance,
    provider,
    user,
    isLoading,
    login,
    logout,
    getUserInfo,
  };

  // Provide the Web3Auth context to children components
  return <Web3AuthContext.Provider value={value}>{children}</Web3AuthContext.Provider>;
}