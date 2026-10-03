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
      document.getElementById("help")?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const handleAboutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      window.location.href = "/#about";
    } else {
      document.getElementById("about")?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="topbar">
      <div className="brand header-brand">
        <img src="/logo.png" alt="WatchTogether Logo" style={{ width: '28px', height: '28px' }} />
        <span>WatchTogether</span>
      </div>

      {/* Desktop Navigation */}
      <nav className="desktop-nav header-center-nav">
        <Link to="/" className={location.pathname === "/" ? "active" : ""} onClick={handleHomeClick}>Home</Link>
        <Link to="/discover" className={location.pathname === "/discover" ? "active" : ""}>Discover</Link>
        {location.pathname === "/" && (
          <>
            <a href="#about" onClick={handleAboutClick}>About</a>
            <a href="#help" onClick={handleHelpClick}>Help</a>
          </>
        )}
      </nav>

      {/* Right Area: Profile & Hamburger */}
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div className="profile desktop-profile" style={{ padding: 0, background: 'transparent', border: 'none' }}>
          {!isLoading && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span className="desktop-user-name" style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>
                {user.name}
              </span>
              <button 
                className="primary-btn desktop-logout-btn" 
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
            <button className="primary-btn desktop-login-btn" onClick={() => setIsAuthModalOpen(true)} style={{ padding: '8px 16px', fontSize: '14px' }}>Login</button>
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
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-dropdown">
          <nav className="mobile-nav">
            <Link to="/" className={location.pathname === "/" ? "active" : ""} onClick={handleHomeClick}>Home</Link>
            <Link to="/discover" className={location.pathname === "/discover" ? "active" : ""} onClick={() => setIsMobileMenuOpen(false)}>Discover</Link>
            {location.pathname === "/" && (
              <>
                <a href="#about" onClick={handleAboutClick}>About</a>
                <a href="#help" onClick={handleHelpClick}>Help</a>
              </>
            )}
          </nav>
          
          <div className="mobile-auth-actions" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '16px', paddingTop: '16px' }}>
            {!isLoading && user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span className="mobile-user-name" style={{ fontSize: '14px', color: '#fff', fontWeight: 500, textAlign: 'center' }}>
                  {user.name}
                </span>
                <button 
                  className="primary-btn mobile-logout-btn" 
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
              <button className="primary-btn mobile-login-btn" onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} style={{ width: '100%' }}>Login</button>
            )}
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
}
