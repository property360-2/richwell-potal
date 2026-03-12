import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, size = 'md', children, footer }) => {
  const closeButtonRef = useRef(null);
  const hasFocused = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasFocused.current = false;
      return;
    }
    
    // Only focus the close button the first time the modal opens
    if (!hasFocused.current) {
      const focusTimer = setTimeout(() => {
        closeButtonRef.current?.focus();
        hasFocused.current = true;
      }, 100);
      return () => clearTimeout(focusTimer);
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]); // Constant size dependency array

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content modal-${size}`} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">{title}</h3>
          <button 
            ref={closeButtonRef}
            className="modal-close" 
            onClick={onClose} 
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
        
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
