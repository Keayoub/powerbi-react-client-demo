// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastProviderProps {
    children: React.ReactNode;
}

interface ToastContextType {
    showToast: (toast: Omit<Toast, 'id'>) => void;
    hideToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = {
            id,
            duration: 5000,
            ...toast,
        };

        setToasts(prev => [...prev, newToast]);

        if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
                hideToast(id);
            }, newToast.duration);
        }
    };

    const hideToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            <ToastContainer toasts={toasts} onHide={hideToast} />
        </ToastContext.Provider>
    );
};

interface ToastContainerProps {
    toasts: Toast[];
    onHide: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onHide }) => {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onHide={onHide} />
            ))}
        </div>
    );
};

interface ToastItemProps {
    toast: Toast;
    onHide: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onHide }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation
        setTimeout(() => setIsVisible(true), 10);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onHide(toast.id), 300);
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return 'ℹ️';
        }
    };

    return (
        <div className={`toast toast-${toast.type} ${isVisible ? 'toast-visible' : ''}`}>
            <div className="toast-content">
                <div className="toast-icon">
                    {getIcon()}
                </div>
                <div className="toast-text">
                    <div className="toast-title">{toast.title}</div>
                    {toast.message && (
                        <div className="toast-message">{toast.message}</div>
                    )}
                </div>
                {toast.action && (
                    <button
                        onClick={toast.action.onClick}
                        className="toast-action"
                    >
                        {toast.action.label}
                    </button>
                )}
                <button
                    onClick={handleClose}
                    className="toast-close"
                >
                    ✕
                </button>
            </div>
        </div>
    );
};
