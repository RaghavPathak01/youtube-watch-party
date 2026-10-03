import { createContext, useContext, useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

interface ModalOptions {
    title: string;
    message?: string;
    type: "alert" | "confirm" | "prompt";
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

interface ModalContextType {
    showAlert: (message: string, title?: string) => Promise<void>;
    showConfirm: (message: string, title?: string, isDanger?: boolean) => Promise<boolean>;
    showPrompt: (title: string, defaultValue?: string) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
    const context = useContext(ModalContext);
    if (!context) throw new Error("useModal must be used within a ModalProvider");
    return context;
}

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ModalOptions | null>(null);
    const [inputValue, setInputValue] = useState("");
    
    // We store the resolver to return a promise
    const resolveRef = useRef<((value?: any) => void) | null>(null);

    const openModal = (opts: ModalOptions) => {
        setOptions(opts);
        setInputValue(opts.defaultValue || "");
        setIsOpen(true);
        return new Promise<any>((resolve) => {
            resolveRef.current = resolve;
        });
    };

    const showAlert = (message: string, title = "Message") => {
        return openModal({ title, message, type: "alert" });
    };

    const showConfirm = (message: string, title = "Confirm", isDanger = false) => {
        return openModal({ title, message, type: "confirm", isDanger });
    };

    const showPrompt = (title: string, defaultValue = "") => {
        return openModal({ title, type: "prompt", defaultValue });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        if (options?.type === "prompt") {
            resolveRef.current?.(inputValue);
        } else if (options?.type === "confirm") {
            resolveRef.current?.(true);
        } else {
            resolveRef.current?.(undefined);
        }
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (options?.type === "prompt") {
            resolveRef.current?.(null);
        } else if (options?.type === "confirm") {
            resolveRef.current?.(false);
        } else {
            resolveRef.current?.(undefined);
        }
    };

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
            {children}
            {isOpen && options && createPortal(
                <ModalOverlay 
                    options={options} 
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />,
                document.body
            )}
        </ModalContext.Provider>
    );
}

function ModalOverlay({ options, inputValue, setInputValue, onConfirm, onCancel }: any) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (options.type === "prompt" && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        } else {
            // Focus primary button maybe? Simple focus lock is nice but keep it minimal.
            document.getElementById("modal-primary-btn")?.focus();
        }
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && options.type === "prompt") onConfirm();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [options.type, onCancel, onConfirm]);

    return (
        <div className="custom-modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
            <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 className="custom-modal-title">{options.title}</h3>
                
                {options.message && (
                    <p className="custom-modal-message">{options.message}</p>
                )}
                
                {options.type === "prompt" && (
                    <input
                        ref={inputRef}
                        type="text"
                        className="custom-modal-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                )}
                
                <div className="custom-modal-actions">
                    {options.type !== "alert" && (
                        <button className="custom-modal-btn cancel" onClick={onCancel}>
                            {options.cancelText || "Cancel"}
                        </button>
                    )}
                    <button 
                        id="modal-primary-btn"
                        className={`custom-modal-btn primary ${options.isDanger ? "danger" : ""}`} 
                        onClick={onConfirm}
                    >
                        {options.confirmText || (options.type === "alert" ? "OK" : "Save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
