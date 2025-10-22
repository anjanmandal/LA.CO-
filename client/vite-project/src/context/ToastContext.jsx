import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { setErrorHandler } from '../utils/errorBus';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info', duration: 4000 });

  const show = useCallback((message, severity = 'info', duration = 4000) => {
    setToast({ open: true, message, severity, duration });
  }, []);

  const showError = useCallback((message = 'Server error (400)') => {
    show(message, 'error');
  }, [show]);

  const showSuccess = useCallback((message) => {
    show(message, 'success');
  }, [show]);

  const value = useMemo(() => ({ show, showError, showSuccess }), [show, showError, showSuccess]);

  useEffect(() => {
    setErrorHandler((message) => showError(message || 'Server error (400)'));
    return () => setErrorHandler(null);
  }, [showError]);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={toast.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert elevation={3} variant="filled" severity={toast.severity} onClose={handleClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
