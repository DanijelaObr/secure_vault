import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { vaultService } from "../services/vaultService";
import type { Secret } from "../types";

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
      console.log(
        "Loading secrets with token:",
        localStorage.getItem("accessToken"),
      ); // DODAJ

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

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>SecureVault Dashboard</h1>
        <div>
          <span style={{ marginRight: "20px" }}>Welcome, {user?.username}</span>
          <button
            onClick={() => navigate("/vault/create")}
            style={{ marginRight: "10px" }}
          >
            Create Secret
          </button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
      )}

      <div>
        <h2>Your Secrets ({secrets.length})</h2>

        {secrets.length === 0 ? (
          <p>No secrets yet. Create your first one!</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ccc" }}>
                <th style={{ textAlign: "left", padding: "10px" }}>Title</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Type</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Username</th>
                <th style={{ textAlign: "left", padding: "10px" }}>
                  Last Accessed
                </th>
                <th style={{ textAlign: "left", padding: "10px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {secrets.map((secret) => (
                <tr key={secret.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{secret.title}</td>
                  <td style={{ padding: "10px" }}>{secret.type}</td>
                  <td style={{ padding: "10px" }}>{secret.username || "-"}</td>
                  <td style={{ padding: "10px" }}>
                    {secret.lastAccessedAt
                      ? new Date(secret.lastAccessedAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <button
                      onClick={() => navigate(`/vault/view/${secret.id}`)}
                      style={{ marginRight: "5px" }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/vault/edit/${secret.id}`)}
                      style={{ marginRight: "5px" }}
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(secret.id)}>
                      Delete
                    </button>
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
