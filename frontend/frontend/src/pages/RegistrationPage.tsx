
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./RegistrationPage.css";

type Conference = {
  id: number;
  name?: string;
  title?: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
};

type Category = {
  value: string;
  label: string;
  fee: number;
  currency: string;
};

type Registration = {
  id: number;
  conference_name: string;
  category: string;
  status: string;
  fee: number;
  currency: string;
  payment_status: string;
};

export default function RegistrationPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "participant";

  const [conferences, setConferences] = useState<Conference[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [conferenceId, setConferenceId] = useState(
    localStorage.getItem("selected_conference_id") || ""
  );
  const [category, setCategory] = useState(
    role === "author" ? "author" : "participant"
  );
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const load = async () => {
    try {
      const [conferenceResponse, registrationResponse] = await Promise.all([
        api.get("/conferences/"),
        api.get("/registrations/me"),
      ]);

      const conferenceList: Conference[] = Array.isArray(conferenceResponse.data)
        ? conferenceResponse.data
        : [];

      setConferences(conferenceList);
      setRegistrations(
        Array.isArray(registrationResponse.data)
          ? registrationResponse.data
          : []
      );

      if (conferenceList.length > 0) {
        const stored = localStorage.getItem("selected_conference_id") || "";
        const selected = conferenceList.some(
          (item) => String(item.id) === stored
        )
          ? stored
          : String(conferenceList[0].id);

        setConferenceId(selected);
        localStorage.setItem("selected_conference_id", selected);
      } else {
        setConferenceId("");
      }

      // Load server-approved registration categories and fees.
      try {
        const optionsResponse = await api.get("/registrations/options");
        const availableCategories: Category[] =
          Array.isArray(optionsResponse.data?.categories)
            ? optionsResponse.data.categories
            : [];

        setCategories(availableCategories);

        if (
          availableCategories.length > 0 &&
          !availableCategories.some((item) => item.value === category)
        ) {
          setCategory(availableCategories[0].value);
        }
      } catch (error: any) {
        setMessage(
          error?.response?.data?.detail ||
            "Could not load registration fee details."
        );
      }
    } catch (error: any) {
      setMessage(
        error?.response?.data?.detail ||
          "Could not load registration details."
      );
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selected = conferences.find(
    (item) => String(item.id) === conferenceId
  );

  const selectedCategory = useMemo(
    () => categories.find((item) => item.value === category),
    [categories, category]
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!conferenceId) {
      setMessage("Choose a conference before registering.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api.post("/registrations/", {
        conference_id: Number(conferenceId),
        category,
      });

      setMessage("Registration successful!");
      await load();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;

      setMessage(
        typeof detail === "string"
          ? detail
          : detail?.message || "Registration could not be completed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="registration-page">
      <div className="registration-card">
        <p style={styles.eyebrow}>{role} portal</p>

        <h1>
          {role === "author"
            ? "Author conference registration"
            : "Conference registration"}
        </h1>

        <p className="subtitle">
          Choose a live conference and check the applicable registration fee
          before confirming.
        </p>

        {message && (
          <p role="status" style={styles.message}>
            {message}
          </p>
        )}

        {loadingData ? (
          <p role="status">Loading registration details...</p>
        ) : conferences.length === 0 ? (
          <p role="status">
            No conferences are currently available for registration.
          </p>
        ) : (
          <form onSubmit={submit} style={styles.form}>
            <label style={styles.label} htmlFor="conference-picker">
              Conference

              <select
                id="conference-picker"
                required
                value={conferenceId}
                onChange={(event) => {
                  const value = event.target.value;
                  setConferenceId(value);
                  localStorage.setItem("selected_conference_id", value);
                  setMessage("");
                }}
                style={styles.input}
              >
                <option value="">Select a conference</option>

                {conferences.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.title || `Conference #${item.id}`}
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <div style={styles.conferenceInfo}>
                <h2>
                  {selected.name || selected.title || "Conference"}
                </h2>

                <p>
                  {selected.description || "Conference registration"}
                </p>

                <p>{selected.location || "Location to be announced"}</p>

                <p>
                  {selected.start_date || "Date to be announced"}
                  {selected.end_date ? ` – ${selected.end_date}` : ""}
                </p>
              </div>
            )}

            <label style={styles.label} htmlFor="category-picker">
              Registration category

              <select
                id="category-picker"
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                style={styles.input}
              >
                {categories.length > 0 ? (
                  categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label} —{" "}
                      {item.fee
                        ? `₹${item.fee.toLocaleString("en-IN")}`
                        : "Fee waived"}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="participant">Participant</option>
                    <option value="author">Author</option>
                    <option value="speaker">Speaker</option>
                  </>
                )}
              </select>
            </label>

            <div style={styles.fee}>
              <span>Amount due</span>

              <strong>
                {selectedCategory?.fee
                  ? `₹${selectedCategory.fee.toLocaleString("en-IN")}`
                  : "₹0 (waived)"}
              </strong>

              <small>
                The final amount is calculated securely by the server.
              </small>
            </div>

            <button
              className="register-button"
              type="submit"
              disabled={loading || !conferenceId}
            >
              {loading ? "Registering..." : "Confirm registration"}
            </button>
          </form>
        )}

        <section style={{ marginTop: 28 }}>
          <h2>My registrations</h2>

          {registrations.length === 0 ? (
            <p>No registrations yet.</p>
          ) : (
            registrations.map((registration) => (
              <article key={registration.id} style={styles.row}>
                <div>
                  <strong>{registration.conference_name}</strong>
                  <div>
                    {registration.category} · {registration.status}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <strong>
                    {registration.fee
                      ? `₹${registration.fee.toLocaleString("en-IN")}`
                      : "Fee waived"}
                  </strong>

                  <div>
                    Payment:{" "}
                    {(registration.payment_status || "pending").replace(
                      "_",
                      " "
                    )}
                  </div>

                  {registration.fee > 0 &&
                    registration.payment_status !== "paid" && (
                      <button
                        type="button"
                        onClick={() => navigate("/payments")}
                        style={styles.link}
                      >
                        Continue to payment
                      </button>
                    )}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  eyebrow: {
    color: "#2563eb",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".1em",
  },
  message: {
    padding: 12,
    borderRadius: 8,
    background: "#e0f2fe",
    color: "#075985",
  },
  form: {
    display: "grid",
    gap: 18,
    marginTop: 24,
  },
  label: {
    display: "grid",
    gap: 8,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    padding: 12,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "white",
  },
  conferenceInfo: {
    padding: 16,
    borderRadius: 10,
    background: "#f8fafc",
    color: "#334155",
  },
  fee: {
    display: "grid",
    gap: 5,
    padding: 16,
    borderRadius: 10,
    background: "#eff6ff",
    color: "#1e3a8a",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 20,
    padding: "16px 0",
    borderTop: "1px solid #e2e8f0",
  },
  link: {
    marginTop: 8,
    border: 0,
    background: "transparent",
    color: "#2563eb",
    fontWeight: 700,
    cursor: "pointer",
  },
};
