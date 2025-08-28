/**
 * Error Simulation Script
 * Simulates common PowerBI errors for testing the diagnostic system
 */

// Function to simulate different types of PowerBI errors
export const simulatePowerBIErrors = () => {
  console.log('🧪 Simulating PowerBI errors for diagnostic testing...');

  // Simulate QueryUserError (like the one you're experiencing)
  setTimeout(() => {
    if (window.addPowerBIError) {
      window.addPowerBIError({
        type: 'QueryUserError',
        message: 'Report duplicate-1756410298438-5 failed to load: QueryUserError - The user does not have permission to view this report or the report does not exist.',
        reportId: 'duplicate-1756410298438-5',
        severity: 'high',
        recoveryActions: [
          'Verify you have access to the PowerBI workspace',
          'Check if the report ID is correct',
          'Ensure your access token has the right permissions',
          'Contact your PowerBI administrator',
          'Try refreshing your authentication'
        ]
      });

      // Also trigger the QueryUserError recovery modal
      const event = new CustomEvent('queryUserError', {
        detail: { reportId: 'duplicate-1756410298438-5' }
      });
      window.dispatchEvent(event);
    }
  }, 1000);

  // Simulate Token Expiration Error
  setTimeout(() => {
    if (window.addPowerBIError) {
      window.addPowerBIError({
        type: 'TokenExpiredError',
        message: 'Access token has expired. Please refresh your authentication.',
        reportId: 'report-12345',
        severity: 'critical',
        recoveryActions: [
          'Refresh your authentication token',
          'Re-login to your PowerBI account',
          'Check token expiration settings',
          'Verify authentication service is working'
        ]
      });
    }
  }, 2000);

  // Simulate Network Error
  setTimeout(() => {
    if (window.addPowerBIError) {
      window.addPowerBIError({
        type: 'NetworkError',
        message: 'Failed to connect to PowerBI service. Please check your internet connection.',
        reportId: 'report-67890',
        severity: 'medium',
        recoveryActions: [
          'Check your internet connection',
          'Verify PowerBI service is available',
          'Try disabling VPN if using one',
          'Check firewall settings',
          'Retry the operation'
        ]
      });
    }
  }, 3000);

  // Simulate Embed Configuration Error
  setTimeout(() => {
    if (window.addPowerBIError) {
      window.addPowerBIError({
        type: 'EmbedConfigError',
        message: 'Invalid embed configuration. Check your report settings.',
        reportId: 'report-config-error',
        severity: 'medium',
        recoveryActions: [
          'Verify embed URL is correct',
          'Check report configuration settings',
          'Ensure all required parameters are provided',
          'Validate PowerBI workspace settings'
        ]
      });
    }
  }, 4000);

  console.log('✅ Error simulation complete. Check the Error Diagnostic panel.');
};

// Function to clear all simulated errors
export const clearSimulatedErrors = () => {
  if (window.clearPowerBIErrors) {
    window.clearPowerBIErrors();
    console.log('🧹 All simulated errors cleared.');
  }
};

// Auto-run simulation in development mode
if (process.env.NODE_ENV === 'development') {
  // Wait for the app to load, then simulate errors
  setTimeout(() => {
    simulatePowerBIErrors();
  }, 3000);
}
