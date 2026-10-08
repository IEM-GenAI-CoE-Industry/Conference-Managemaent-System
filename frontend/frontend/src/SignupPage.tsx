import { useState } from "react";
import api from "./api";

interface SignupPageProps {
  onRegistered: () => void;
  onBackToLogin: () => void;
}

interface RegisterResponse {
  message: string;
  user_id: number;
  name: string;
  email: string;
  role: string;
}

function SignupPage({
  onRegistered,
  onBackToLogin,
}: SignupPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("participant");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // Basic validation
    if (!name || !email || !password) {
      setMessage("Please fill in all required fields.");
      return;
    }

    if (name.trim().length < 2) {
      setMessage("Name must be at least 2 characters.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await api.post<RegisterResponse>(
        "/auth/register",
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }
      );

      setMessage(
        `Account created successfully! Welcome, ${response.data.name}.`
      );

      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setRole("participant");

      // Go to login after short delay
      setTimeout(() => {
        onRegistered();
      }, 1500);
    } catch (error: unknown) {
      // Axios/server error
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const axiosError = error as {
          response?: {
            status?: number;
            data?: {
              detail?: string;
              message?: string;
            };
          };
          message?: string;
        };

        const serverMessage =
          axiosError.response?.data?.detail ||
          axiosError.response?.data?.message;

        if (serverMessage) {
          setMessage(
            `Registration failed: ${serverMessage}`
          );
        } else if (axiosError.response?.status) {
          setMessage(
            `Registration failed. Server returned status ${axiosError.response.status}.`
          );
        } else {
          setMessage(
            `Registration failed: ${
              axiosError.message || "Unknown error"
            }`
          );
        }
      } else if (error instanceof Error) {
        setMessage(
          `Registration failed: ${error.message}`
        );
      } else {
        setMessage(
          "Registration failed: Unknown error."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          Create Account
        </h1>

        <p style={styles.subtitle}>
          Create your account to register for the
          conference
        </p>

        {/* NAME */}

        <label style={styles.label}>
          Name
        </label>

        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          style={styles.input}
          disabled={loading}
        />

        {/* EMAIL */}

        <label style={styles.label}>
          Email
        </label>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          style={styles.input}
          disabled={loading}
        />

        {/* PASSWORD */}

        <label style={styles.label}>
          Password
        </label>

        <input
          type="password"
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          style={styles.input}
          disabled={loading}
        />

        {/* ROLE */}

        <label style={styles.label}>
          Account Type
        </label>

        <select
          value={role}
          onChange={(e) =>
            setRole(e.target.value)
          }
          style={styles.input}
          disabled={loading}
        >
          <option value="participant">
            Participant
          </option>

          <option value="author">
            Author
          </option>

          <option value="reviewer">
            Reviewer
          </option>

          <option value="speaker">
            Speaker
          </option>

          <option value="organizer">
            Organizer
          </option>
        </select>

        {/* CREATE ACCOUNT */}

        <button
          type="button"
          onClick={handleSignup}
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? "Creating Account..."
            : "Create Account"}
        </button>

        {/* MESSAGE */}

        {message && (
          <p
            style={{
              ...styles.message,
              color: message
                .toLowerCase()
                .includes("success")
                ? "#15803D"
                : "#DC2626",
            }}
          >
            {message}
          </p>
        )}

        {/* LOGIN */}

        <button
          type="button"
          onClick={onBackToLogin}
          disabled={loading}
          style={styles.loginButton}
        >
          Already have an account? Login
        </button>
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
    boxShadow:
      "0 8px 30px rgba(0, 0, 0, 0.12)",
    color: "#222",
  },

  title: {
    textAlign: "center" as const,
    marginBottom: "10px",
    color: "#222",
    fontSize: "42px",
  },

  subtitle: {
    textAlign: "center" as const,
    color: "#666",
    marginBottom: "25px",
    lineHeight: 1.5,
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
    background: "#ffffff",
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
    fontSize: "14px",
    lineHeight: 1.5,
  },

  loginButton: {
    width: "100%",
    marginTop: "15px",
    padding: "10px",
    border: "none",
    background: "transparent",
    color: "#1677ff",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: 600,
  },
};

export default SignupPage;