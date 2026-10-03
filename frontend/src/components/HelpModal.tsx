import { useState, useEffect } from "react";

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const [question, setQuestion] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      setIsSubmitted(true);
      setQuestion("");
    }
  };

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>Help & Support</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="help-modal-body">
          {isSubmitted ? (
            <div className="help-success">
              <div className="success-icon">✓</div>
              <h3>Message Sent!</h3>
              <p>We've received your question and will get back to you soon.</p>
              <button className="secondary-btn mt-10" onClick={onClose}>Close</button>
            </div>
          ) : (
            <>
              <p className="help-subtitle">How can we help?</p>
              
              <form onSubmit={handleSubmit} className="help-form">
                <textarea
                  placeholder="Describe your question or issue..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  required
                ></textarea>
                <button type="submit" className="primary-btn submit-btn">
                  Ask a Question
                </button>
              </form>

              <div className="help-divider">
                <span>OR</span>
              </div>

              <div className="help-direct">
                <p>Need direct help?</p>
                <a href="mailto:support@watchtogether.com">Contact us at support@watchtogether.com</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
