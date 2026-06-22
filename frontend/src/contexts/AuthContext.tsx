import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, RegisterRequest } from "../types";
import api from "../services/api";
import { authService } from "../services/authService";
import {
  deriveMasterKey,
  unwrapPrivateKey,
  generateKeyPair,
  generateSalt,
  wrapPrivateKey,
} from "../services/cryptoService";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Otključani privatni ključ (u memoriji, nestaje na refresh). null = vault zaključan. */
  privateKey: CryptoKey | null;
  /** Moj javni ključ (za enkripciju sopstvenih tajni). */
  publicKey: string | null;
  vaultUnlocked: boolean;
  login: (
    email: string,
    password: string,
    mfaCode?: string,
  ) => Promise<{ success?: boolean; requireMfa?: boolean; user?: User }>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    role: "admin" | "team_lead" | "developer";
  }) => Promise<{ success: boolean }>;
  /** Ponovno otključavanje vault-a master passwordom (npr. posle refresh-a). */
  unlockVault: (masterPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUser = async () => {
    try {
      // Cookie se šalje automatski (withCredentials). Ako nije validan -> 401.
      const response = await api.get("/auth/profile");
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /** Iz master passworda + materijala servera otključava privatni ključ U MEMORIJI. */
  const unlockWithMaterial = async (
    masterPassword: string,
    salt: string,
    encryptedPrivateKey: string,
    pubKey: string,
  ) => {
    const masterKey = await deriveMasterKey(masterPassword, salt);
    const priv = await unwrapPrivateKey(encryptedPrivateKey, masterKey);
    setPrivateKey(priv);
    setPublicKey(pubKey);
  };

  const login = async (email: string, password: string, mfaCode?: string) => {
    const data = await authService.login({ email, password, mfaCode });

    if (data.requiresMfa) {
      return { requireMfa: true };
    }

    const loggedUser = data.user;
    setUser(loggedUser);

    // Otključaj vault u browseru (ako nalog ima kripto materijal)
    if (
      loggedUser.salt &&
      loggedUser.encryptedPrivateKey &&
      loggedUser.publicKey
    ) {
      try {
        await unlockWithMaterial(
          password,
          loggedUser.salt,
          loggedUser.encryptedPrivateKey,
          loggedUser.publicKey,
        );
      } catch {
        // master password ne otključava ključ — ne rušimo login, ali vault ostaje zaključan
        console.warn("Vault unlock failed (wrong master password?)");
      }
    }

    return { success: true, user: loggedUser };
  };

  const register = async (data: {
    email: string;
    username: string;
    password: string;
    role: "admin" | "team_lead" | "developer";
  }) => {
    // ZERO-KNOWLEDGE: ključeve generiše KLIJENT prije slanja.
    const salt = generateSalt();
    const masterKey = await deriveMasterKey(data.password, salt);
    const { publicKey: pub, privateKey: priv } = await generateKeyPair();
    const encryptedPrivateKey = await wrapPrivateKey(priv, masterKey);

    const payload: RegisterRequest = {
      email: data.email,
      username: data.username,
      password: data.password,
      role: data.role,
      publicKey: pub,
      encryptedPrivateKey,
      salt,
    };

    await authService.register(payload);

    // Posle registracije korisnik se loguje (dobija cookie + otključava vault)
    await login(data.email, data.password);

    return { success: true };
  };

  const unlockVault = async (masterPassword: string) => {
    const material = await authService.getCryptoMaterial();
    if (!material.salt) {
      throw new Error("Vault not initialized");
    }
    await unlockWithMaterial(
      masterPassword,
      material.salt,
      material.encryptedPrivateKey,
      material.publicKey,
    );
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setPrivateKey(null);
      setPublicKey(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        privateKey,
        publicKey,
        vaultUnlocked: privateKey !== null,
        login,
        register,
        unlockVault,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
