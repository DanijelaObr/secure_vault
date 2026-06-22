import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { adminService } from "../services/adminService";
import type { SecurityPolicy, AuditLog } from "../types";
import "../styles/AdminPage.css";

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [integrity, setIntegrity] = useState<string>("");
  const [sqlEmail, setSqlEmail] = useState("admin@securevault.com' OR '1'='1");
  const [sqlResult, setSqlResult] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAll = async () => {
    try {
      const [p, l] = await Promise.all([
        adminService.getSecurityPolicy(),
        adminService.getRecentAuditLogs(50),
      ]);
      setPolicy(p);
      setLogs(l);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof SecurityPolicy, value: any) => {
    if (!policy) return;
    setPolicy({ ...policy, [field]: value });
  };

  const savePolicy = async () => {
    if (!policy) return;
    setMessage("");
    setError("");
    try {
      const updated = await adminService.updateSecurityPolicy(policy);
      setPolicy(updated);
      setMessage("Security policy saved.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save policy");
    }
  };

  const checkIntegrity = async () => {
    setIntegrity("");
    try {
      const res = await adminService.verifyAuditIntegrity();
      setIntegrity(
        res.isValid
          ? "✓ Audit log je netaknut (hash-lanac validan)."
          : `✗ Lanac narušen kod zapisa: ${res.brokenAt}`,
      );
    } catch (err: any) {
      setIntegrity(err.response?.data?.message || "Verifikacija nije uspjela");
    }
  };

  const runSqlTest = async () => {
    setSqlResult("");
    try {
      const res = await adminService.testSqlInjection(sqlEmail);
      setSqlResult(JSON.stringify(res, null, 2));
    } catch (err: any) {
      setSqlResult(
        err.response?.data?.message || "SQL test odbijen (endpoint isključen?)",
      );
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!policy)
    return <div className="error-message">{error || "No policy"}</div>;

  const numField = (label: string, field: keyof SecurityPolicy) => (
    <div className="form-group">
      <label>{label}</label>
      <input
        type="number"
        value={policy[field] as number}
        onChange={(e) => updateField(field, Number(e.target.value))}
      />
    </div>
  );

  const boolField = (label: string, field: keyof SecurityPolicy) => (
    <div className="checkbox-group">
      <input
        type="checkbox"
        id={field}
        checked={policy[field] as boolean}
        onChange={(e) => updateField(field, e.target.checked)}
      />
      <label htmlFor={field}>{label}</label>
    </div>
  );

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <button onClick={() => navigate("/dashboard")} className="btn-cancel">
          Back to Dashboard
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* SECURITY POLICY */}
      <section className="admin-section">
        <h2>Security Policy</h2>
        <div className="policy-grid">
          {numField("Min password length", "minPasswordLength")}
          {numField("Access token (min)", "accessTokenDuration")}
          {numField("Refresh token (min)", "refreshTokenDuration")}
          {numField("Session timeout (min)", "sessionTimeout")}
          {numField("Secret rotation (days)", "secretRotationPeriod")}
          {numField("Max login attempts", "maxLoginAttempts")}
          {numField("Lockout duration (min)", "accountLockoutDuration")}
        </div>
        <div className="policy-checks">
          {boolField("Require uppercase", "requireUppercase")}
          {boolField("Require lowercase", "requireLowercase")}
          {boolField("Require numbers", "requireNumbers")}
          {boolField("Require special chars", "requireSpecialChars")}
          {boolField("Enforce secret rotation", "enforceSecretRotation")}
          {boolField("Require MFA for admins", "requireMfaForAdmins")}
          {boolField(
            "⚠ Enable SQL injection test endpoint",
            "sqlInjectionTestEnabled",
          )}
        </div>
        <button onClick={savePolicy} className="btn-submit">
          Save Policy
        </button>
      </section>

      {/* SQL INJECTION TEST */}
      <section className="admin-section">
        <h2>SQL Injection Test (honeypot demo)</h2>
        <p className="hint">
          Radi samo ako je gore uključen flag. Namjerno ranjiv endpoint za
          demonstraciju.
        </p>
        <div className="form-group">
          <input
            type="text"
            value={sqlEmail}
            onChange={(e) => setSqlEmail(e.target.value)}
          />
        </div>
        <button onClick={runSqlTest} className="btn-danger">
          Run SQL Test
        </button>
        {sqlResult && <pre className="sql-result">{sqlResult}</pre>}
      </section>

      {/* AUDIT LOG */}
      <section className="admin-section">
        <h2>Audit Log</h2>
        <button onClick={checkIntegrity} className="btn-primary">
          Verify Integrity
        </button>
        {integrity && <p className="integrity">{integrity}</p>}
        <table className="audit-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>User</th>
              <th>Hash (kraj)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.action}</td>
                <td>{log.userId || "-"}</td>
                <td className="hash-cell">
                  {(log as any).currentHash
                    ? `…${(log as any).currentHash.slice(-12)}`
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AdminPage;
