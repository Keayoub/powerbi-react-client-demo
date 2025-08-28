// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import 'react-app-polyfill/ie11';	// For IE compatibility
import 'react-app-polyfill/stable';	// For IE compatibility
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import DemoApp from './DemoApp';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
    <MsalProvider instance={msalInstance}>
        <AuthProvider>
            <DemoApp />
        </AuthProvider>
    </MsalProvider>
);