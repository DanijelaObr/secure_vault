import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { vaultService } from "../services/vaultService";
import type { Secret } from "../types";
import "../styles/ViewSecretPage.css";

const ViewSecretPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [secret, setSecret] = useState<Secret | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSecret();
  }, [id]);

  const loadSecret = async () => {
    if (!id) return;

    try {
      const data = await vaultService.getSecretById(id);
      setSecret(data);

      // Dešifruj podatke (za sada samo parse JSON-a)
      // TODO: Dodati RSA dešifrovanje
      const parsed = JSON.parse(data.encryptedData);
      setDecryptedData(parsed);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load secret");
    } finally {
      setLoading(false);
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
  if (error) return <div className="error-message">{error}</div>;
  if (!secret) return <div className="error-message">Secret not found</div>;

  return (
    <div className="page-wrapper">
      <div className="view-secret-container">
        <h1>{secret.title}</h1>

        <div className="secret-field">
          <label>Type</label>
          <div className="secret-field-value">{secret.type}</div>
        </div>

        {secret.url && (
          <div className="secret-field">
            <label>URL</label>
            <div className="secret-field-value">
              <a href={secret.url} target="_blank" rel="noopener noreferrer">
                {secret.url}
              </a>
            </div>
          </div>
        )}

        {secret.username && (
          <div className="secret-field">
            <label>Username</label>
            <div className="secret-field-value">{secret.username}</div>
          </div>
        )}

        {decryptedData?.password && (
          <div className="secret-field">
            <label>Password</label>
            <div className="password-field">
              <div className="secret-field-value">
                {showPassword ? (
                  decryptedData.password
                ) : (
                  <span className="password-hidden">••••••••••••</span>
                )}
              </div>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="btn-toggle-password"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        )}

        {decryptedData?.notes && (
          <div className="secret-field">
            <label>Notes</label>
            <div className="secret-field-value">{decryptedData.notes}</div>
          </div>
        )}

        <div className="secret-field">
          <label>Created</label>
          <div className="secret-field-value">
            {new Date(secret.createdAt).toLocaleString()}
          </div>
        </div>

        {secret.lastAccessedAt && (
          <div className="secret-field">
            <label>Last Accessed</label>
            <div className="secret-field-value">
              {new Date(secret.lastAccessedAt).toLocaleString()}
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button onClick={() => navigate("/dashboard")} className="btn-back">
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate(`/vault/edit/${id}`)}
            className="btn-edit"
          >
            Edit
          </button>
          <button onClick={handleDelete} className="btn-delete">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewSecretPage;
