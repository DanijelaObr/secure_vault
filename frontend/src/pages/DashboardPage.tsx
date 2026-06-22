import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { vaultService } from "../services/vaultService";
import { decryptSecret } from "../services/cryptoService";
import type { Secret } from "../types";
import ConfirmModal from "../components/ConfirmModal";
import "../styles/DashboardPage.css";

const DashboardPage: React.FC = () => {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [sharedSecrets, setSharedSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [secretToDelete, setSecretToDelete] = useState<string | null>(null);

  // dekriptovan sadržaj deljene tajne (id -> readable string)
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealError, setRevealError] = useState<Record<string, string>>({});

  const { user, logout, privateKey, vaultUnlocked } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    try {
      const [mine, shared] = await Promise.all([
        vaultService.getAllSecrets(),
        vaultService.getSharedWithMe(),
      ]);
      setSecrets(mine);
      setSharedSecrets(shared);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load secrets");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const openDeleteModal = (id: string) => {
    setSecretToDelete(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setSecretToDelete(null);
    setDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!secretToDelete) return;
    try {
      await vaultService.deleteSecret(secretToDelete);
      setSecrets(secrets.filter((s) => s.id !== secretToDelete));
      closeDeleteModal();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete secret");
      closeDeleteModal();
    }
  };

  // Deljene tajne dekriptujemo OVDJE (View ruta radi samo za vlasnika).
  const revealShared = async (secret: Secret) => {
    setRevealError((prev) => ({ ...prev, [secret.id]: "" }));

    if (!vaultUnlocked || !privateKey) {
      setRevealError((prev) => ({
        ...prev,
        [secret.id]: "Vault je zaključan. Prijavi se ponovo master lozinkom.",
      }));
      return;
    }
    if (!secret.encryptedKey) {
      setRevealError((prev) => ({
        ...prev,
        [secret.id]: "Nedostaje ključ za dešifrovanje.",
      }));
      return;
    }

    try {
      const plaintext = await decryptSecret(
        secret.encryptedData,
        secret.encryptedKey,
        privateKey,
      );
      const parsed = JSON.parse(plaintext);
      const readable = [
        parsed.password ? `Password: ${parsed.password}` : "",
        parsed.notes ? `Notes: ${parsed.notes}` : "",
      ]
        .filter(Boolean)
        .join("  |  ");
      setRevealed((prev) => ({ ...prev, [secret.id]: readable || "(prazno)" }));
    } catch (err: any) {
      setRevealError((prev) => ({
        ...prev,
        [secret.id]: "Dešifrovanje nije uspjelo.",
      }));
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>SecureVault Dashboard</h1>
        <div className="dashboard-actions">
          <span className="user-info">Welcome, {user?.username}</span>
          {user?.role === "admin" && (
            <button onClick={() => navigate("/admin")} className="btn-primary">
              Admin Panel
            </button>
          )}
          <button
            onClick={() => navigate("/vault/create")}
            className="btn-primary"
          >
            Create Secret
          </button>
          <button onClick={() => navigate("/mfa")} className="btn-primary">
            MFA Settings
          </button>
          <button onClick={handleLogout} className="btn-danger">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="secrets-section">
        <h2>Your Secrets ({secrets.length})</h2>

        {secrets.length === 0 ? (
          <div className="empty-state">
            No secrets yet. Create your first one!
          </div>
        ) : (
          <table className="secrets-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Username</th>
                <th>Last Accessed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {secrets.map((secret) => (
                <tr key={secret.id}>
                  <td>{secret.title}</td>
                  <td>{secret.type}</td>
                  <td>{secret.username || "-"}</td>
                  <td>
                    {secret.lastAccessedAt
                      ? new Date(secret.lastAccessedAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => navigate(`/vault/view/${secret.id}`)}
                        className="btn-small btn-view"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/vault/edit/${secret.id}`)}
                        className="btn-small btn-edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(secret.id)}
                        className="btn-small btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* SHARED WITH ME */}
      <div className="secrets-section">
        <h2>Shared with me ({sharedSecrets.length})</h2>

        {sharedSecrets.length === 0 ? (
          <div className="empty-state">No secrets shared with you.</div>
        ) : (
          <table className="secrets-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Permission</th>
                <th>Content</th>
              </tr>
            </thead>
            <tbody>
              {sharedSecrets.map((secret) => (
                <tr key={secret.id}>
                  <td>{secret.title}</td>
                  <td>{secret.type}</td>
                  <td>{secret.owner?.email || "-"}</td>
                  <td>{secret.permission || "read"}</td>
                  <td>
                    {revealed[secret.id] ? (
                      <span className="revealed-content">
                        {revealed[secret.id]}
                      </span>
                    ) : (
                      <button
                        onClick={() => revealShared(secret)}
                        className="btn-small btn-view"
                      >
                        Decrypt & Show
                      </button>
                    )}
                    {revealError[secret.id] && (
                      <div className="error-message">
                        {revealError[secret.id]}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Secret"
        message="Are you sure you want to delete this secret? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default DashboardPage;
