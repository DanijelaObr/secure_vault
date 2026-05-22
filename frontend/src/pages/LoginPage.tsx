import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/LoginPage.css";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [requireMfa, setRequireMfa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.requireMfa) {
        setRequireMfa(true);
      } else if (result.success && result.user) {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // MFA verify logic (dodaćemo kasnije)
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "MFA verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>SecureVault Login</h1>

      {error && <div className="error-message">{error}</div>}

      {!requireMfa ? (
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMfaVerify}>
          <div className="form-group">
            <label>MFA Token:</label>
            <input
              type="text"
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value)}
              required
              placeholder="Enter 6-digit code"
            />
          </div>

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? "Verifying..." : "Verify MFA"}
          </button>
        </form>
      )}

      <div className="auth-link">
        Don't have an account? <Link to="/register">Register</Link>
      </div>
    </div>
  );
};

export default LoginPage;
