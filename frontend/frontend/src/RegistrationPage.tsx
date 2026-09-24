import { useState } from "react";
import "./RegistrationPage.css";

interface RegistrationResponse {
  id: number;
  user_id: number;
  conference_id: number;
  category: string;
  status: string;
  created_at: string;
}

function RegistrationPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [registration, setRegistration] =
    useState<RegistrationResponse | null>(null);

  const handleRegister = async () => {
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setMessage("Please login first.");
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/registrations/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conference_id: 1,
            category: "participant",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      setRegistration(data);
      setMessage("Registration successful!");
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-page">
      <div className="registration-card">
        <h1>Conference Registration</h1>

        <p className="subtitle">
          Register for the conference
        </p>

        <div className="conference-info">
          <h2>AI & Future Technology Conference</h2>

          <p>
            <strong>Conference ID:</strong> 1
          </p>

          <p>
            Complete your registration to participate in the
            conference.
          </p>
        </div>

        <button
          className="register-button"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Registering..." : "Register Now"}
        </button>

        {message && (
          <p className="registration-message">
            {message}
          </p>
        )}

        {registration && (
          <div className="registration-result">
            <h3>Registration Details</h3>

            <p>
              <strong>Registration ID:</strong>{" "}
              {registration.id}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {registration.status}
            </p>

            <p>
              <strong>Category:</strong>{" "}
              {registration.category}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RegistrationPage;