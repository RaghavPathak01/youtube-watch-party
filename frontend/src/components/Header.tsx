import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthModal } from "./AuthModal";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const location = useLocation();
  const { user, setUser, isLoading, isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleHomeClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo(0, 0);
    }
    setIsMobileMenuOpen(false);
  };

  const handleHelpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      window.location.href = "/#help";
    } else {
      document.getElementById("help")?.scrollIntoView();
    }
    setIsMobileMenuOpen(false);
  };

  const handleAboutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      window.location.href = "/#about";
    } else {
      document.getElementById("about")?.scrollIntoView();
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="topbar">
      <div className="brand header-brand">
        <img src="https://em-content.zobj.net/source/apple/354/clapper-board_1f3ac.png" alt="WatchTogether Logo" style={{ width: '28px', height: '28px' }} />
        <span>WatchTogether</span>
      </div>

      {/* Desktop Navigation */}
      <nav className="desktop-nav header-center-nav">
        <Link to="/" className={location.pathname === "/" ? "active" : ""} onClick={handleHomeClick}>Home</Link>
        <Link to="/discover" className={location.pathname === "/discover" ? "active" : ""}>Discover</Link>
        <a href="#about" onClick={handleAboutClick}>About</a>
        <a href="#help" onClick={handleHelpClick}>Help</a>
      </nav>

      {/* Desktop Profile */}
      <div className="profile desktop-profile header-profile" style={{ padding: 0, background: 'transparent', border: 'none' }}>
        {!isLoading && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>
              {user.name}
            </span>
            <button 
              className="primary-btn" 
              onClick={async () => {
                await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
                setUser(null);
              }}
              style={{ padding: '6px 12px', fontSize: '13px', background: 'transparent', border: '1px solid #3f3f46' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button className="primary-btn login-btn" onClick={() => setIsAuthModalOpen(true)} style={{ padding: '8px 16px', fontSize: '14px' }}>Login</button>
        )}
      </div>

      {/* Mobile Menu Toggle Button */}
      <button 
        className="mobile-menu-btn" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle Menu"
      >
        {isMobileMenuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-dropdown">
          <nav className="mobile-nav">
            <Link to="/" className={location.pathname === "/" ? "active" : ""} onClick={handleHomeClick}>Home</Link>
            <Link to="/discover" className={location.pathname === "/discover" ? "active" : ""} onClick={() => setIsMobileMenuOpen(false)}>Discover</Link>
            <a href="#about" onClick={handleAboutClick}>About</a>
            <a href="#help" onClick={handleHelpClick}>Help</a>
          </nav>
          <div className="mobile-profile" style={{ justifyContent: 'center' }}>
            {!isLoading && user ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
                <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>
                  {user.name}
                </span>
                <button 
                  className="primary-btn" 
                  onClick={async () => {
                    await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
                    setUser(null);
                    setIsMobileMenuOpen(false);
                  }}
                  style={{ width: '100%', background: 'transparent', border: '1px solid #3f3f46' }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button className="primary-btn login-btn" onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} style={{ width: '100%' }}>Login</button>
            )}
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
}
