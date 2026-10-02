import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export function Header() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Discover", path: "/discover" },
    { name: "About", path: "/about" },
  ];

  const handleHelpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("Help Modal coming in Step 4!");
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">W</div>
        <span>WatchTogether</span>
      </div>

      {/* Desktop Navigation */}
      <nav className="desktop-nav">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={location.pathname === link.path ? "active" : ""}
          >
            {link.name}
          </Link>
        ))}
        <a href="#" onClick={handleHelpClick}>Help</a>
      </nav>

      {/* Desktop Profile */}
      <div className="profile desktop-profile">
        <div className="profile-dot"></div>
        <span>Guest</span>
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
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={location.pathname === link.path ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <a href="#" onClick={handleHelpClick}>Help</a>
          </nav>
          <div className="mobile-profile">
            <div className="profile-dot"></div>
            <span>Guest</span>
          </div>
        </div>
      )}
    </header>
  );
}
