import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../api/auth";
import { saveAuth } from "../utils/auth";
import "../styles/auth.css";

const EyeIcon = ({ open }) =>
  open ? (
    <svg
      viewBox="0 0 24 24"
      width="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const { data } = await loginUser({ email, password });
      saveAuth(data.token, data.user);
      const role = data.user.role;
      if (role === "patient") navigate("/patient/dashboard");
      else if (role === "doctor") navigate("/doctor/dashboard");
      else if (role === "admin") navigate("/admin/dashboard");
      else if (role === "super_admin") navigate("/admin/dashboard");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container-fluid min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background depth using standard HTML/CSS + Bootstrap bg */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          background:
            "radial-gradient(circle at 20% 80%, rgba(120,119,198,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,119,198,0.1) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="row w-100 justify-content-center position-relative"
        style={{ zIndex: 1, maxWidth: "420px" }}
      >
        <div className="col-12 px-3 px-sm-0">
          <div
            className="card border-0 rounded-4 p-4 p-sm-5 bg-white"
            style={{
              boxShadow:
                "0 10px 25px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="text-center mb-5">
              <h2
                className="fw-bolder text-dark mb-3 d-flex align-items-center justify-content-center gap-2"
                style={{ letterSpacing: "-0.5px", fontSize: "2rem" }}
              >
                <div
                  className="rounded-circle"
                  style={{
                    width: "10px",
                    height: "10px",
                    background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                  }}
                />
                NeuroNest
              </h2>
              <p
                className="text-secondary fw-medium text-uppercase"
                style={{
                  letterSpacing: "1px",
                  fontSize: "0.875rem",
                  marginBottom: "2rem",
                }}
              >
                Sign in to your account
              </p>
            </div>

            {error && (
              <div
                className="alert d-flex align-items-center fw-bold p-3 rounded-3 mb-4 border-0"
                style={{
                  background: "#FEF2F2",
                  color: "#DC2626",
                  border: "1px solid #FECACA",
                }}
                role="alert"
              >
                <svg
                  width="16"
                  height="16"
                  className="me-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="d-flex flex-column">
              {/* Email */}
              <div className="form-group mb-4">
                <label
                  htmlFor="login-email"
                  className="form-label fw-bold text-secondary text-uppercase mb-3"
                  style={{
                    letterSpacing: "1px",
                    fontSize: "0.75rem",
                  }}
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="form-control form-control-lg border shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  style={{
                    fontSize: "0.95rem",
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "10px",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#6366F1";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(99,102,241,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E5E7EB";
                    e.target.style.boxShadow = "0 0 0 0px rgba(99,102,241,0)";
                  }}
                />
              </div>

              {/* Password */}
              <div className="form-group mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <label
                    htmlFor="login-pw"
                    className="form-label fw-bold text-secondary text-uppercase mb-0"
                    style={{
                      letterSpacing: "1px",
                      fontSize: "0.75rem",
                    }}
                  >
                    Password
                  </label>
                  <Link
                    to="/login"
                    className="text-decoration-none fw-bold"
                    style={{
                      fontSize: "13px",
                      color: "#6366F1",
                    }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="position-relative">
                  <input
                    id="login-pw"
                    type={showPw ? "text" : "password"}
                    className="form-control form-control-lg border shadow-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      fontSize: "0.95rem",
                      background: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "10px",
                      paddingRight: "40px",
                      transition: "all 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#6366F1";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(99,102,241,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E5E7EB";
                      e.target.style.boxShadow = "0 0 0 0px rgba(99,102,241,0)";
                    }}
                  />
                  <button
                    type="button"
                    className="btn position-absolute border-0"
                    onClick={() => setShowPw(!showPw)}
                    aria-label="Toggle password"
                    style={{
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9CA3AF",
                      background: "transparent",
                      padding: "0",
                    }}
                  >
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </div>

              {/* CTA */}
              <button
                type="submit"
                className="btn btn-lg w-100 fw-bold d-flex justify-content-center align-items-center gap-2 rounded-3 mb-4"
                disabled={loading}
                style={{
                  background: loading
                    ? "rgba(13,110,253,0.8)"
                    : "linear-gradient(135deg, #0d6efd, #6610f2)",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  transform: "translateY(0px)",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 4px 12px rgba(13,110,253,0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0px)";
                  e.target.style.boxShadow = "none";
                }}
              >
                {loading && (
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  />
                )}
                {loading ? "Signing in…" : "Sign In"}
              </button>

              {/* Encryption note */}
              <div
                className="d-flex align-items-center justify-content-center mt-3 mb-4"
                style={{
                  fontSize: "13px",
                  color: "#6B7280",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  className="me-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Your medical data is encrypted and secure
              </div>
            </form>

            {/* Register link */}
            <div
              className="text-center mt-4"
              style={{ fontSize: "0.875rem", color: "#6B7280" }}
            >
              Don't have an account?{" "}
              <Link
                to="/register"
                className="fw-bold text-decoration-none"
                style={{
                  color: "#6366F1",
                }}
              >
                Create one free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
