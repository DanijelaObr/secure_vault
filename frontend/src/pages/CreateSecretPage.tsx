import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { vaultService } from "../services/vaultService";
import "../styles/CreateSecretPage.css";

const CreateSecretPage: React.FC = () => {
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
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Za sada, encryptedData je plain text (dodaćemo RSA encryption kasnije)
      const encryptedData = JSON.stringify({
        password,
        notes,
      });

      await vaultService.createSecret({
        title,
        type,
        url: url || undefined,
        username: username || undefined,
        encryptedData,
      });

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create secret");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-secret-container">
      <h1>Create New Secret</h1>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Gmail Account"
          />
        </div>

        <div className="form-group">
          <label>Type *</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
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
              placeholder="https://example.com"
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
                placeholder="your.email@example.com"
              />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional information..."
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
            onClick={() => navigate("/dashboard")}
            className="btn-cancel"
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? "Creating..." : "Create Secret"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSecretPage;
