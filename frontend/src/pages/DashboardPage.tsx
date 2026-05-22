import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { vaultService } from "../services/vaultService";
import type { Secret } from "../types";
import "../styles/DashboardPage.css";

const DashboardPage: React.FC = () => {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadSecrets();
  }, []);

  const loadSecrets = async () => {
    try {
      const data = await vaultService.getAllSecrets();
      setSecrets(data);
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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this secret?")) return;

    try {
      await vaultService.deleteSecret(id);
      setSecrets(secrets.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete secret");
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>SecureVault Dashboard</h1>
        <div className="dashboard-actions">
          <span className="user-info">Welcome, {user?.username}</span>
          <button
            onClick={() => navigate("/vault/create")}
            className="btn-primary"
          >
            Create Secret
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
                        onClick={() => handleDelete(secret.id)}
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
    </div>
  );
};

export default DashboardPage;
