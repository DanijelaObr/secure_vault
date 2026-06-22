import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/authService";
import "../styles/MfaSetupPage.css";

const MfaSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"idle" | "scanning" | "done">("idle");
  const [disableToken, setDisableToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startEnable = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await authService.enableMfa();
      setQrCode(res.qrCode);
      setSecret(res.secret);
      setStep("scanning");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start MFA setup");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.verifyMfa(token);
      setStep("done");
      setMessage("MFA je uspješno aktiviran.");
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.disableMfa(disableToken);
      setMessage("MFA je isključen.");
      setDisableToken("");
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mfa-container">
      <div className="mfa-header">
        <h1>Two-Factor Authentication (MFA)</h1>
        <button onClick={() => navigate("/dashboard")} className="btn-cancel">
          Back
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <p>
        Status: <strong>{user?.mfaEnabled ? "ENABLED" : "DISABLED"}</strong>
      </p>

      {/* ENABLE FLOW */}
      {!user?.mfaEnabled && (
        <section className="mfa-section">
          {step === "idle" && (
            <>
              <p>
                Aktiviraj MFA: generiši QR kod i skeniraj ga u Google
                Authenticator (ili sličnoj) aplikaciji.
              </p>
              <button
                onClick={startEnable}
                disabled={loading}
                className="btn-submit"
              >
                {loading ? "..." : "Enable MFA"}
              </button>
            </>
          )}

          {step === "scanning" && (
            <>
              <p>1. Skeniraj QR kod u authenticator aplikaciji:</p>
              {qrCode && <img src={qrCode} alt="MFA QR code" className="qr" />}
              <p className="secret-hint">
                Ili ručno unesi tajni ključ: <code>{secret}</code>
              </p>
              <p>2. Unesi 6-cifreni kod iz aplikacije:</p>
              <form onSubmit={verify}>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456"
                  required
                  autoFocus
                />
                <button type="submit" disabled={loading} className="btn-submit">
                  {loading ? "Verifying..." : "Verify & Activate"}
                </button>
              </form>
            </>
          )}

          {step === "done" && <p>MFA je aktivan. Vrati se na dashboard.</p>}
        </section>
      )}

      {/* DISABLE FLOW */}
      {user?.mfaEnabled && (
        <section className="mfa-section">
          <p>Za isključivanje MFA unesi trenutni kod iz aplikacije:</p>
          <form onSubmit={disable}>
            <input
              type="text"
              value={disableToken}
              onChange={(e) => setDisableToken(e.target.value)}
              placeholder="123456"
              required
            />
            <button type="submit" disabled={loading} className="btn-danger">
              {loading ? "..." : "Disable MFA"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
};

export default MfaSetupPage;
