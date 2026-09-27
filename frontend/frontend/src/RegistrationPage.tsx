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
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] =
    useState("participant");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [registration, setRegistration] =
    useState<RegistrationResponse | null>(null);

  const handleRegister = async () => {
    setLoading(true);
    setMessage("");
    setRegistration(null);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setMessage(
          "Please login to complete your registration."
        );
        setLoading(false);
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
            category: category,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Registration failed"
        );
      }

      setRegistration(data);

      setMessage(
        "Registration successful!"
      );
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Something went wrong."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-page">
      <div className="registration-card">

        {/* PAGE TITLE */}

        <h1>
          Conference Registration
        </h1>

        <p className="subtitle">
          Register for the conference
        </p>

        {/* CONFERENCE INFORMATION */}

        <div className="conference-info">

          <h2>
            AI & Future Technology Conference
          </h2>

          <p>
            <strong>
              Conference ID:
            </strong>{" "}
            1
          </p>

          <p>
            Join the AI & Future Technology
            Conference and participate in
            talks, sessions and networking
            activities.
          </p>

          <p>
            Complete your registration to
            participate in the conference.
          </p>

        </div>

        {/* BEFORE CLICKING REGISTER */}

        {!showForm && !registration && (
          <button
            className="register-button"
            onClick={() => {
              setShowForm(true);
              setMessage("");
            }}
          >
            Register Now
          </button>
        )}

        {/* REGISTRATION FORM */}

        {showForm && !registration && (
          <div
            className="registration-form"
            style={{
              marginTop: "24px",
              padding: "20px",
              borderRadius: "10px",
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
            }}
          >

            <h2>
              Registration Details
            </h2>

            <p
              style={{
                color: "#64748B",
                marginBottom: "20px",
              }}
            >
              Select your registration
              category and continue.
            </p>

            {/* CATEGORY */}

            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Registration Category
            </label>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border:
                  "1px solid #CBD5E1",
                backgroundColor:
                  "#FFFFFF",
                fontSize: "15px",
                marginBottom: "20px",
              }}
            >
              <option value="participant">
                Participant
              </option>

              <option value="student">
                Student
              </option>

              <option value="speaker">
                Speaker
              </option>

              <option value="researcher">
                Researcher
              </option>
            </select>

            {/* CONFERENCE */}

            <div
              style={{
                marginBottom: "20px",
                padding: "14px",
                backgroundColor:
                  "#FFFFFF",
                borderRadius: "6px",
                border:
                  "1px solid #E2E8F0",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  fontWeight: 600,
                }}
              >
                Conference
              </p>

              <p
                style={{
                  margin: 0,
                  color: "#475569",
                }}
              >
                AI & Future Technology
                Conference
              </p>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748B",
                  fontSize: "14px",
                }}
              >
                Conference ID: 1
              </p>
            </div>

            {/* BUTTONS */}

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setMessage("");
                }}
                style={{
                  padding: "12px 20px",
                  borderRadius: "6px",
                  border:
                    "1px solid #CBD5E1",
                  backgroundColor:
                    "#FFFFFF",
                  color: "#334155",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Back
              </button>

              <button
                type="button"
                className="register-button"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading
                  ? "Registering..."
                  : "Complete Registration"}
              </button>

            </div>

          </div>
        )}

        {/* MESSAGE */}

        {message && (
          <p
            className="registration-message"
            style={{
              marginTop: "18px",
            }}
          >
            {message}
          </p>
        )}

        {/* REGISTRATION RESULT */}

        {registration && (
          <div className="registration-result">

            <h3>
              Registration Successful
            </h3>

            <p>
              Your conference registration
              has been completed successfully.
            </p>

            <p>
              <strong>
                Registration ID:
              </strong>{" "}
              {registration.id}
            </p>

            <p>
              <strong>
                Status:
              </strong>{" "}
              {registration.status}
            </p>

            <p>
              <strong>
                Category:
              </strong>{" "}
              {registration.category}
            </p>

            <p>
              <strong>
                Conference ID:
              </strong>{" "}
              {registration.conference_id}
            </p>

            <button
              type="button"
              className="register-button"
              onClick={() => {
                setRegistration(null);
                setShowForm(false);
                setMessage("");
              }}
              style={{
                marginTop: "15px",
              }}
            >
              Back to Registration
            </button>

          </div>
        )}

      </div>
    </div>
  );
}

export default RegistrationPage;