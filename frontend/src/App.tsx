import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ModalProvider } from "./context/ModalContext";
import "./App.css";

import Home from "./pages/Home";
import Room from "./pages/Room";
import Discover from "./pages/Discover";
import About from "./pages/About";

function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/about" element={<About />} />
            <Route path="/room/:roomId" element={<Room />} />
          </Routes>
        </BrowserRouter>
      </ModalProvider>
    </AuthProvider>
  );
}

export default App;