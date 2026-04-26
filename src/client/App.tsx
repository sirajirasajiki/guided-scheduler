import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreateEvent from "./pages/create-event";
import Admin from "./pages/admin";
import Event from "./pages/event";
import Terms from "./pages/terms";
import Privacy from "./pages/privacy";
import Footer from "./components/footer";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateEvent />} />
        <Route path="/admin/:adminToken" element={<Admin />} />
        <Route path="/event/:shareToken" element={<Event />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
