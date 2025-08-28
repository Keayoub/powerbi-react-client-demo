// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useRef, useEffect } from 'react';
import './Modal.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    size?: 'small' | 'medium' | 'large' | 'full';
    children: React.ReactNode;
    closeOnOverlayClick?: boolean;
    closeOnEscapeKey?: boolean;
    showCloseButton?: boolean;
    footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    size = 'medium',
    children,
    closeOnOverlayClick = true,
    closeOnEscapeKey = true,
    showCloseButton = true,
    footer
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const lastActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Store last active element for focus restoration
            lastActiveElement.current = document.activeElement as HTMLElement;
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            // Show modal with animation
            setTimeout(() => setIsVisible(true), 10);
            
            // Focus modal
            if (modalRef.current) {
                modalRef.current.focus();
            }
        } else {
            setIsVisible(false);
            
            // Restore body scroll
            document.body.style.overflow = '';
            
            // Restore focus
            if (lastActiveElement.current) {
                lastActiveElement.current.focus();
            }
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (closeOnEscapeKey && event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, closeOnEscapeKey, onClose]);

    const handleOverlayClick = (event: React.MouseEvent) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) {
            onClose();
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    if (!isOpen) return null;

    return (
        <div 
            className={`modal-overlay ${isVisible ? 'modal-visible' : ''}`}
            onClick={handleOverlayClick}
        >
            <div
                ref={modalRef}
                className={`modal modal-${size}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                tabIndex={-1}
            >
                {(title || showCloseButton) && (
                    <div className="modal-header">
                        {title && (
                            <h2 id="modal-title" className="modal-title">
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={handleClose}
                                className="modal-close"
                                aria-label="Close modal"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}
                
                <div className="modal-content">
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

// Hook for managing modal state
export const useModal = (initialState = false) => {
    const [isOpen, setIsOpen] = useState(initialState);

    const openModal = () => setIsOpen(true);
    const closeModal = () => setIsOpen(false);
    const toggleModal = () => setIsOpen(prev => !prev);

    return {
        isOpen,
        openModal,
        closeModal,
        toggleModal
    };
};
