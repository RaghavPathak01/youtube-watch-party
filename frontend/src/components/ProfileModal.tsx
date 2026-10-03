import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, setUser } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const initials = user.name ? user.name.substring(0, 2).toUpperCase() : "U";

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
      setUser(null);
      onClose();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const modalContent = (
    <div className="help-modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="help-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px', padding: '32px', position: 'relative' }}>
        <button className="profile-close-btn" onClick={onClose} aria-label="Close Profile">×</button>
        
        <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '20px' }}>Your Profile</h2>
        
        <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 700, color: 'white', margin: '0 auto 20px'
        }}>
            {initials}
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', color: 'white' }}>{user.name}</h3>
            <p style={{ margin: '0', color: '#a1a1aa', fontSize: '14px' }}>{user.email || "No email provided"}</p>
        </div>
        
        <button 
            className="primary-btn" 
            onClick={handleLogout}
            style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '12px' }}
        >
            Logout
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
