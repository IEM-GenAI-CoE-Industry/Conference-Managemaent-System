import { useState } from "react";
import LoginPage from "./LoginPage";
import RegistrationPage from "./RegistrationPage";

function App() {
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return <RegistrationPage />;
}

export default App;