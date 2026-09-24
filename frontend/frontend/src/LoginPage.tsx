import { useState } from "react";
import api from "./api";

interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  role: string;
}

interface LoginPageProps {
  onLogin: () => void;
}

function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage("Please enter email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      // Save JWT token
      localStorage.setItem("token", response.data.access_token);

      setMessage("Login successful!");

      // Tell App.tsx that login is complete
      onLogin();
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const axiosError = error as {
          response?: {
            data?: {
              detail?: string;
            };
          };
        };

        setMessage(
          axiosError.response?.data?.detail || "Login failed."
        );
      } else {
        setMessage("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Participant Login</h1>

        <p style={styles.subtitle}>
          Login to register for the conference
        </p>

        <label style={styles.label}>Email</label>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Password</label>

        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {message && (
          <p style={styles.message}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    background: "#f5f7fb",
  },

  card: {
    width: "400px",
    padding: "35px",
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
    color: "#222",
  },

  title: {
    textAlign: "center" as const,
    marginBottom: "10px",
    color: "#222",
  },

  subtitle: {
    textAlign: "center" as const,
    color: "#666",
    marginBottom: "25px",
  },

  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: 600,
    color: "#333",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "18px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxSizing: "border-box" as const,
    fontSize: "15px",
  },

  button: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#1677ff",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
  },

  message: {
    textAlign: "center" as const,
    marginTop: "18px",
    color: "#333",
  },
};

export default LoginPage;