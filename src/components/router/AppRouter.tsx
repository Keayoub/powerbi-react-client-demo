// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { ConfigurationPage } from '../pages/ConfigurationPage';
import { ReportViewerPage } from '../pages/ReportViewerPage';
import { Navigation } from '../navigation/Navigation';
import './AppRouter.css';

export const AppRouter: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Router>
            <div className="app-router">
                {isAuthenticated && <Navigation />}
                
                <main className="main-content">
                    <Routes>
                        {/* Public Routes */}
                        <Route 
                            path="/login" 
                            element={
                                isAuthenticated ? 
                                <Navigate to="/configuration" replace /> : 
                                <LoginPage />
                            } 
                        />
                        
                        {/* Protected Routes */}
                        <Route 
                            path="/configuration" 
                            element={
                                isAuthenticated ? 
                                <ConfigurationPage /> : 
                                <Navigate to="/login" replace />
                            } 
                        />
                        
                        <Route 
                            path="/reports" 
                            element={
                                isAuthenticated ? 
                                <ReportViewerPage /> : 
                                <Navigate to="/login" replace />
                            } 
                        />
                        
                        {/* Default redirect */}
                        <Route 
                            path="/" 
                            element={
                                <Navigate to={isAuthenticated ? "/configuration" : "/login"} replace />
                            } 
                        />
                        
                        {/* Catch all */}
                        <Route 
                            path="*" 
                            element={
                                <Navigate to={isAuthenticated ? "/configuration" : "/login"} replace />
                            } 
                        />
                    </Routes>
                </main>
            </div>
        </Router>
    );
};
