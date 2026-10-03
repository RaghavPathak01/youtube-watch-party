import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { setUser } = useAuth();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when toggling
  useEffect(() => {
    setError("");
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }, [isLogin, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!isLogin && password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setIsLoading(true);

    const url = isLogin ? `${import.meta.env.VITE_BACKEND_URL}/auth/login` : `${import.meta.env.VITE_BACKEND_URL}/auth/signup`;
    const body = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include" // Important for receiving/sending cookies
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (isLogin) {
        // Successful login
        setUser(data.user);
        onClose();
      } else {
        // Successful signup, switch to login
        setIsLogin(true);
        setError("Account created successfully. Please login.");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose}>✕</button>
        
        <h2>{isLogin ? "Login" : "Sign Up"}</h2>
        <p className="auth-subtitle">
          {isLogin 
            ? "Enter your email and password to login." 
            : "Create an account to save your watch parties."}
        </p>

        {error && (
          <div style={{ color: isLogin && error.includes("successfully") ? "#4ade80" : "#ef4444", marginBottom: "15px", fontSize: "14px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="auth-form-group">
              <label>Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} disabled={isLoading} />
            </div>
          )}

          <div className="auth-form-group">
            <label>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
          </div>

          <div className="auth-form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                disabled={isLoading} 
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="auth-form-group">
              <label>Confirm Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  required 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  disabled={isLoading} 
                />
                <button 
                  type="button" 
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {isLogin && (
            <div className="auth-form-row">
              <label className="auth-toggle-switch-label">
                <div className="auth-toggle-switch">
                  <input type="checkbox" disabled={isLoading} />
                  <span className="slider"></span>
                </div>
                <span>Remember me</span>
              </label>
              <a href="#" className="auth-forgot-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            </div>
          )}

          <div className="auth-footer">
            <span className="auth-toggle-text">
              {isLogin ? "Already have account? " : "Already have an account? "}
              <button 
                type="button" 
                className="auth-toggle-btn"
                onClick={() => setIsLogin(!isLogin)}
                disabled={isLoading}
              >
                {isLogin ? "Register here." : "Login here."}
              </button>
            </span>
            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? "Please wait..." : (isLogin ? "Login" : "Sign Up")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
