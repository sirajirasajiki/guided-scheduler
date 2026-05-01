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
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<CreateEvent />} />
            <Route path="/admin/:adminToken" element={<Admin />} />
            <Route path="/event/:shareToken" element={<Event />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

// テスト用: http://localhost:3000/api
export default App;
