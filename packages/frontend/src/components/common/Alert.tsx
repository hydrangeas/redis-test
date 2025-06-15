import React from 'react';

interface AlertProps {
  type: 'error' | 'warning' | 'info' | 'success';
  children: React.ReactNode;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, children, onClose }) => {
  const alertClasses = {
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info',
    success: 'alert-success',
  };

  return (
    <div className={`alert ${alertClasses[type]}`} role="alert">
      <div className="alert-content">{children}</div>
      {onClose && (
        <button
          className="alert-close"
          onClick={onClose}
          aria-label="Close alert"
        >
          ×
        </button>
      )}
    </div>
  );
};