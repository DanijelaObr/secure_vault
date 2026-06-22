import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { vaultService } from "../services/vaultService";
import { authService } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import {
  decryptSecret,
  reEncryptKeyForRecipient,
} from "../services/cryptoService";
import type { Secret } from "../types";
import "../styles/ViewSecretPage.css";

const ViewSecretPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { privateKey, vaultUnlocked } = useAuth();

  const [secret, setSecret] = useState<Secret | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // share UI
  const [shareEmail, setShareEmail] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadSecret();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, privateKey]);

  const loadSecret = async () => {
    if (!id) return;
    try {
      const data = await vaultService.getSecretById(id);
      setSecret(data);

      if (!vaultUnlocked || !privateKey) {
        setError("Vault je zaključan. Prijavi se ponovo master lozinkom.");
        return;
      }
      if (!data.encryptedKey) {
        setError("Nedostaje ključ za dešifrovanje ove tajne.");
        return;
      }

      // DEŠIFROVANJE NA KLIJENTU
      const plaintext = await decryptSecret(
        data.encryptedData,
        data.encryptedKey,
        privateKey,
      );
      setDecryptedData(JSON.parse(plaintext));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load secret");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareMsg("");
    if (!id || !secret?.encryptedKey || !privateKey) {
      setShareMsg("Vault zaključan ili ključ nedostupan.");
      return;
    }
    setSharing(true);
    try {
      // Dohvati javni ključ primaoca, pa re-enkriptuj AES ključ NA KLIJENTU.
      const { publicKey: recipientPub } =
        await authService.getPublicKey(shareEmail);
      const encryptedKeyForRecipient = await reEncryptKeyForRecipient(
        secret.encryptedKey,
        privateKey,
        recipientPub,
      );

      await vaultService.shareSecret(id, {
        sharedWithEmail: shareEmail,
        encryptedKey: encryptedKeyForRecipient,
        permission: "read",
      });

      setShareMsg(`Podijeljeno sa ${shareEmail}`);
      setShareEmail("");
    } catch (err: any) {
      setShareMsg(err.response?.data?.message || "Dijeljenje nije uspjelo");
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this secret?")) return;
    try {
      await vaultService.deleteSecret(id);
      navigate("/dashboard");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete secret");
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!secret) return <div className="error-message">Secret not found</div>;

  return (
    <div className="page-wrapper">
      <div className="view-secret-container">
        <h1>{secret.title}</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="secret-field">
          <strong>Type:</strong> {secret.type}
        </div>

        {secret.url && (
          <div className="secret-field">
            <strong>URL:</strong> {secret.url}
          </div>
        )}

        {secret.username && (
          <div className="secret-field">
            <strong>Username:</strong> {secret.username}
          </div>
        )}

        {decryptedData && (
          <>
            {decryptedData.password !== undefined && (
              <div className="secret-field">
                <strong>Password:</strong>{" "}
                {showPassword ? decryptedData.password : "••••••••"}
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="btn-small"
                  style={{ marginLeft: "0.5rem" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            )}
            {decryptedData.notes && (
              <div className="secret-field">
                <strong>Notes:</strong> {decryptedData.notes}
              </div>
            )}
          </>
        )}

        <div className="form-actions" style={{ marginTop: "1rem" }}>
          <button onClick={() => navigate("/dashboard")} className="btn-cancel">
            Back
          </button>
          <button
            onClick={() => navigate(`/vault/edit/${id}`)}
            className="btn-small btn-edit"
          >
            Edit
          </button>
          <button onClick={handleDelete} className="btn-small btn-delete">
            Delete
          </button>
        </div>

        {/* Dijeljenje tajne */}
        <div className="share-section" style={{ marginTop: "2rem" }}>
          <h3>Share secret</h3>
          <form onSubmit={handleShare}>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="recipient@example.com"
              required
            />
            <button type="submit" disabled={sharing} className="btn-submit">
              {sharing ? "Sharing..." : "Share"}
            </button>
          </form>
          {shareMsg && <p>{shareMsg}</p>}
        </div>
      </div>
    </div>
  );
};

export default ViewSecretPage;
