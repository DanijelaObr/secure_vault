import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { vaultService } from "../services/vaultService";
import { useAuth } from "../contexts/AuthContext";
import { decryptSecret, encryptSecret } from "../services/cryptoService";
import "../styles/CreateSecretPage.css";

const EditSecretPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { privateKey, publicKey, vaultUnlocked } = useAuth();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"password" | "note" | "card" | "identity">(
    "password",
  );
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSecret();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, privateKey]);

  const loadSecret = async () => {
    if (!id) return;
    try {
      const secret = await vaultService.getSecretById(id);

      setTitle(secret.title);
      setType(secret.type);
      setUrl(secret.url || "");
      setUsername(secret.username || "");
      setIsFavorite(secret.isFavorite || false);

      if (!vaultUnlocked || !privateKey) {
        setError("Vault je zaključan. Prijavi se ponovo master lozinkom.");
        return;
      }
      if (!secret.encryptedKey) {
        setError("Nedostaje ključ za dešifrovanje ove tajne.");
        return;
      }

      const plaintext = await decryptSecret(
        secret.encryptedData,
        secret.encryptedKey,
        privateKey,
      );
      const decrypted = JSON.parse(plaintext);
      setPassword(decrypted.password || "");
      setNotes(decrypted.notes || "");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load secret");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!id) return;

    if (!vaultUnlocked || !publicKey) {
      setError("Vault je zaključan. Prijavi se ponovo master lozinkom.");
      return;
    }

    setSaving(true);
    try {
      // Re-enkripcija na klijentu (novi AES ključ + novi encryptedKey).
      const plaintext = JSON.stringify({ password, notes });
      const { encryptedData, encryptedKey } = await encryptSecret(
        plaintext,
        publicKey,
      );

      await vaultService.updateSecret(id, {
        title,
        type,
        url: url || undefined,
        username: username || undefined,
        encryptedData,
        encryptedKey,
        isFavorite,
      });

      navigate(`/vault/view/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update secret");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-wrapper">
      <div className="create-secret-container">
        <h1>Edit Secret</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="password">Password</option>
              <option value="note">Secure Note</option>
              <option value="card">Credit Card</option>
              <option value="identity">Identity</option>
            </select>
          </div>

          {(type === "password" || type === "card") && (
            <div className="form-group">
              <label>URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          {type === "password" && (
            <>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="favorite"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
              />
              <label htmlFor="favorite">Add to favorites</label>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(`/vault/view/${id}`)}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-submit">
              {saving ? "Encrypting..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSecretPage;
