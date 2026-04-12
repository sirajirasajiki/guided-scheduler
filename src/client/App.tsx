import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreateEvent from "./pages/create-event";
import Admin from "./pages/admin";
import Event from "./pages/event";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateEvent />} />
        <Route path="/admin/:adminToken" element={<Admin />} />
        <Route path="/event/:shareToken" element={<Event />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
