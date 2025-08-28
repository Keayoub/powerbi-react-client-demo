// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';
import './ThemeToggle.css';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeToggleProps {
    className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('powerbi-theme') as Theme;
        return savedTheme || 'auto';
    });

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const applyTheme = (selectedTheme: Theme) => {
        const root = document.documentElement;
        
        // Remove existing theme classes
        root.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        if (selectedTheme === 'auto') {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.add('theme-auto');
            root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            root.classList.add(`theme-${selectedTheme}`);
            root.setAttribute('data-theme', selectedTheme);
        }
        
        localStorage.setItem('powerbi-theme', selectedTheme);
    };

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    const getThemeIcon = (themeType: Theme) => {
        switch (themeType) {
            case 'light': return '☀️';
            case 'dark': return '🌙';
            case 'auto': return '🌗';
            default: return '🌗';
        }
    };

    const getThemeLabel = (themeType: Theme) => {
        switch (themeType) {
            case 'light': return 'Light';
            case 'dark': return 'Dark';
            case 'auto': return 'Auto';
            default: return 'Auto';
        }
    };

    return (
        <div className={`theme-toggle ${className}`}>
            <div className="theme-options">
                {(['light', 'dark', 'auto'] as Theme[]).map((themeType) => (
                    <button
                        key={themeType}
                        onClick={() => handleThemeChange(themeType)}
                        className={`theme-option ${theme === themeType ? 'active' : ''}`}
                        title={`Switch to ${getThemeLabel(themeType)} theme`}
                    >
                        <span className="theme-icon">{getThemeIcon(themeType)}</span>
                        <span className="theme-label">{getThemeLabel(themeType)}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
