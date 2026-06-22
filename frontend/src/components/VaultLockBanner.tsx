import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "../styles/VaultLockBanner.css";

/**
 * Prikazuje se kada je korisnik prijavljen ali je vault zaključan
 * (npr. poslije refresh-a, jer privatni ključ živi samo u memoriji).
 * Traži master password i otključava vault na klijentu.
 */
const VaultLockBanner: React.FC = () => {
  const { user, vaultUnlocked, unlockVault } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Ne prikazuj ako nema korisnika ili je vault već otključan.
  if (!user || vaultUnlocked) return null;

  // Nalozi bez inicijalizovanog vault-a (npr. Google) — ne nudimo unlock ovdje.
  if (user.vaultInitialized === false) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await unlockVault(password);
      setPassword("");
    } catch (err: any) {
      setError("Pogrešna master lozinka ili vault nije inicijalizovan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vault-lock-banner">
      <div className="vault-lock-inner">
        <span className="vault-lock-icon">🔒</span>
        <span className="vault-lock-text">
          Vault je zaključan. Unesi master lozinku da dešifruješ tajne.
        </span>
        <form onSubmit={handleUnlock} className="vault-lock-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Master password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "..." : "Unlock"}
          </button>
        </form>
        {error && <span className="vault-lock-error">{error}</span>}
      </div>
    </div>
  );
};

export default VaultLockBanner;
