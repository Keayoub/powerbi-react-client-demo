# Power BI React Client Demo

This project demonstrates embedding Power BI reports in a React application with Multi-Page Application (MPA) optimization and advanced performance tracking.

## 🚀 Features

- **Power BI Report Embedding**: Embed reports and dashboards seamlessly
- **MPA Optimization**: Multi-Page Application optimization for better performance
- **Duplicate Reports**: Quick duplication functionality for testing
- **Advanced Metrics**: Display detailed metrics for loaded services and frames
- **Performance Tracking**: Real-time performance monitoring and analytics
- **Priority Loading**: High, normal, and low priority report loading
- **Lazy Loading**: Optional lazy loading for better performance
- **Environment Configuration**: Support for `.env.local` configuration
- **Enhanced Toolbar**: Fullscreen, print, bookmark selection, and refresh functionality
- **Bookmark Management**: Advanced bookmark creation, selection, and management
- **Concurrent Control**: Intelligent duplication limiting to prevent API overload

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Azure AD App Registration
- Power BI Pro or Premium license
- Access to Power BI workspaces

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd powerbi-react-client-demo
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Azure AD Configuration

#### 3.1 Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: PowerBI React Demo
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web - `https://localhost:9000`

#### 3.2 Configure App Registration

1. In your app registration, go to **Authentication**
2. Add these redirect URIs:
   - `https://localhost:9000`
   - `http://localhost:9000`
3. Under **Implicit grant and hybrid flows**, enable:
   - Access tokens
   - ID tokens

#### 3.3 API Permissions

1. Go to **API permissions**
2. Add the following Power BI permissions:
   - `Dataset.Read.All`
   - `Report.Read.All`
   - `Workspace.Read.All`
   - `Content.Create`
   - `Metadata.View_Any`

### 4. Environment Configuration

#### 4.1 Create Environment File

Copy the template and create your local environment file:

```bash
cp .env.local.template .env.local
```

#### 4.2 Configure Environment Variables

Edit `.env.local` with your Azure AD details. This file should be created in the root directory of the project:

```bash
# Azure AD App Registration Client ID
# Get this from Azure Portal > App Registrations > Your App > Overview > Application (client) ID
REACT_APP_AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789abc

# Azure AD Authority (Your specific tenant)
# Option 1: Single tenant (recommended for production)
REACT_APP_AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id-here

# Option 2: Multi-tenant (for apps that support multiple organizations)
# REACT_APP_AZURE_AUTHORITY=https://login.microsoftonline.com/common

# Redirect URI (must match your app registration settings)
REACT_APP_REDIRECT_URI=https://localhost:9000
```

#### 4.3 Finding Your Azure Values

**To find your Client ID:**

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Select your app registration
4. Copy the **Application (client) ID** from the Overview page

**To find your Tenant ID:**

1. In Azure Portal, go to **Azure Active Directory**
2. Copy the **Tenant ID** from the Overview page
3. Use it in the authority URL: `https://login.microsoftonline.com/YOUR_TENANT_ID`

#### 4.4 Environment File Security

⚠️ **Important Security Notes:**

- Never commit `.env.local` to version control
- The `.env.local` file is already included in `.gitignore`
- Use different environment files for different environments (dev, staging, prod)
- Store production secrets in secure key vaults, not in files

#### 4.5 Verify Environment Configuration

After creating your `.env.local` file, you can verify the configuration by checking if the values are loaded correctly:

1. Start the application: `npm run demo`
2. Open browser developer tools (F12)
3. Check the console for any authentication-related messages
4. The app should redirect to Microsoft login when accessing Power BI features

### 5. Power BI Configuration

#### 5.1 Enable Power BI Service Principal

1. Go to [Power BI Admin Portal](https://app.powerbi.com/admin-portal)
2. Navigate to **Tenant settings**
3. Enable **Allow service principals to use Power BI APIs**
4. Add your Azure AD app to the security group

#### 5.2 Workspace Access

Ensure your app registration has access to the Power BI workspaces you want to embed.

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run demo
```

This will start the development server at `https://localhost:9000`

### Production Build

```bash
npm run build
```

## 📊 Features Overview

### MPA Test Page

The main testing interface includes:

- **Performance Dashboard**: Real-time metrics display
- **Control Panel**: Add reports with different priorities
- **Duplicate Functionality**: Clone existing reports for testing
- **Service Metrics**: Track PowerBI services and active frames
- **Advanced Analytics**: Detailed performance breakdown

### Key Metrics Displayed

- **Total Reports**: Number of embedded reports
- **PowerBI Services**: Active PowerBI service instances
- **Active Frames**: Number of iframe elements with PowerBI content
- **Load Times**: Performance metrics by priority
- **Test Completion**: Success/failure rates

### Priority System

- **High Priority**: Immediate loading, highest performance
- **Normal Priority**: Standard loading behavior
- **Low Priority**: Lazy loading for optimal resource usage

### Enhanced PowerBI Toolbar

Each embedded Power BI report now includes a comprehensive toolbar with the following features:

#### 🖥️ **Fullscreen Mode**
- **Toggle Fullscreen**: Enter/exit fullscreen mode for focused report viewing
- **Cross-browser Support**: Works with all major browsers (Chrome, Firefox, Safari, Edge)
- **Keyboard Shortcuts**: Standard fullscreen shortcuts supported
- **Responsive Design**: Optimized for different screen sizes

#### 🖨️ **Print Functionality**
- **Native Power BI Print**: Uses Power BI's built-in print capabilities
- **High-Quality Output**: Preserves formatting and layout
- **Page Optimization**: Automatically optimizes for print media
- **Error Handling**: Graceful fallback if printing is unavailable

#### 📚 **Bookmark Management**
- **Quick Bookmark Selection**: Dropdown menu for fast bookmark navigation
- **Bookmark Counter**: Shows total available bookmarks for each report
- **Advanced Manager**: Full bookmark management interface
- **Real-time Updates**: Automatically loads bookmarks when report changes

#### 🔄 **Report Actions**
- **Refresh Report**: Update report data with latest information
- **Error Recovery**: Built-in retry mechanisms for failed operations
- **Loading States**: Visual feedback during operations
- **Status Indicators**: Real-time operation status

#### 📊 **Report Information**
- **Report Identification**: Display report name and ID
- **Status Monitoring**: Real-time operation status
- **Performance Indicators**: Loading and processing feedback
- **Responsive Layout**: Adapts to different screen sizes

#### Usage Examples

**Enable/Disable Toolbar:**
```typescript
<EmbeddedPowerBIContainer
  reportId="your-report-id"
  embedUrl="your-embed-url"
  accessToken="your-token"
  reportName="Sales Dashboard"
  showToolbar={true}  // Enable toolbar (default: true)
  height="500px"
/>
```

**Toolbar Features:**
- **Fullscreen Button**: Click 🖥️ to enter fullscreen, 📺 to exit
- **Print Button**: Click 🖨️ to open print dialog
- **Bookmark Dropdown**: Click 📚 to see available bookmarks
- **Refresh Button**: Click 🔄 to refresh report data

**Keyboard Shortcuts:**
- `F11` or `Esc`: Toggle fullscreen mode
- `Ctrl+P`: Print report (when supported)

### Concurrent Duplication Control

The system now includes intelligent duplication limiting:

#### 🚦 **Traffic Management**
- **Maximum Concurrent**: Limited to 3 simultaneous duplications
- **Queue System**: Additional requests are queued automatically
- **Visual Indicator**: Real-time counter shows active duplications (0/3 max)
- **User Feedback**: Clear messages when limits are reached

#### 📊 **Performance Benefits**
- **API Protection**: Prevents Power BI API overload
- **Memory Management**: Reduces memory consumption during bulk operations
- **Error Reduction**: Fewer QueryUserErrors due to controlled load
- **System Stability**: Maintains responsive UI during heavy operations

#### Usage Instructions
1. **Normal Operation**: Duplicate reports as usual - system manages load automatically
2. **High Load**: When 3 duplications are active, additional requests are queued
3. **Visual Feedback**: Monitor the "Active Duplications" counter in the metrics panel
4. **Error Recovery**: Use "Clear All" to reset if system gets stuck

### Singleton Service Architecture

This project implements a **Singleton Pattern** for the PowerBI service to optimize performance and resource usage:

#### Singleton Mode Toggle Feature

The application now includes a **configurable singleton mode** that allows you to switch between singleton and individual service instances:

##### Benefits of Each Mode

**Singleton Mode (Recommended - Default):**
- ✅ **Single Service Instance**: Only one PowerBI service across the entire application
- ✅ **Memory Efficient**: Prevents memory leaks from multiple service instances
- ✅ **Shared Authentication**: Centralized token management
- ✅ **Performance Optimized**: Reduced overhead and resource usage
- ✅ **State Persistence**: Service state maintained across components

**Individual Mode:**
- ⚠️ **Multiple Services**: Each component creates its own PowerBI service instance
- ⚠️ **Higher Memory Usage**: More memory consumption with multiple instances
- ✅ **Component Isolation**: Each report has completely independent service
- ✅ **Testing Scenarios**: Useful for testing service behavior independently

##### How to Toggle Singleton Mode

**In the UI:**
1. Navigate to the MPA Test Page
2. Look for the **"Toggle Singleton Mode"** button in the control panel
3. Click to switch between modes:
   - 🔒 **Singleton Mode**: Shows "1" in PowerBI Service counter
   - 🔓 **Individual Mode**: Shows increasing numbers as reports are added

**Programmatically:**
```typescript
import { powerBIService } from '../services/PowerBIService';

// Enable singleton mode (default)
powerBIService.setSingletonMode(true);

// Disable singleton mode (individual instances)
powerBIService.setSingletonMode(false);

// Check current mode
const isSingleton = powerBIService.getSingletonMode();
console.log('Singleton mode:', isSingleton);
```

##### Visual Indicators

The service metrics display shows the current mode:

- **PowerBI Service (Singleton)**: Shows `1` when in singleton mode
- **PowerBI Service (Individual)**: Shows increasing count in individual mode
- **Service Counter Color**: Different colors indicate the current mode

##### When to Use Each Mode

**Use Singleton Mode (Default) when:**
- Building production applications
- Need optimal performance and memory usage
- Want centralized authentication and state management
- Working with multiple reports in the same session

**Use Individual Mode when:**
- Testing specific service behaviors
- Need complete isolation between reports
- Debugging service-related issues
- Prototyping or development scenarios

##### Performance Impact

| Metric | Singleton Mode | Individual Mode |
|--------|---------------|-----------------|
| Memory Usage | ✅ Low (~1 service) | ❌ High (~N services) |
| Load Time | ✅ Fast | ⚠️ Slower |
| Token Efficiency | ✅ Shared | ❌ Duplicated |
| State Management | ✅ Centralized | ❌ Scattered |
| Error Handling | ✅ Unified | ❌ Complex |

#### Benefits of Singleton Implementation

- **Single Service Instance**: Only one PowerBI service instance per application session
- **Resource Optimization**: Prevents multiple service instantiations that could cause memory leaks
- **State Persistence**: Maintains authentication state and configuration across components
- **Performance Enhancement**: Reduces overhead of creating multiple PowerBI client instances
- **Memory Management**: Automatic cleanup and instance tracking

#### How It Works

```typescript
// PowerBIService.ts - Singleton Implementation
class PowerBIService {
    private static instance: PowerBIService;
    
    static getInstance(): PowerBIService {
        if (!PowerBIService.instance) {
            PowerBIService.instance = new PowerBIService();
        }
        return PowerBIService.instance;
    }
}

// Usage across components
const powerBIService = PowerBIService.getInstance();
```

#### Key Features

- **Automatic Instance Management**: Tracks all embedded reports and dashboards
- **Centralized Configuration**: Single point for authentication and settings
- **Performance Monitoring**: Built-in metrics collection for all instances
- **Memory Cleanup**: Automatic removal of unused instances
- **Error Handling**: Centralized error management and logging

#### MPA (Multi-Page Application) Benefits

The singleton pattern is especially beneficial for MPA scenarios:

- **Session Persistence**: Service state survives page navigation
- **Token Management**: Centralized authentication token handling
- **Instance Reuse**: Embedded reports can be reused across pages
- **Performance Tracking**: Continuous metrics collection across page loads

## 🔧 Project Structure

```text
src/
src/
├── components/
│   ├── EmbeddedPowerBIContainer.tsx    # Main embedding component
│   ├── PowerBIErrorBoundary.tsx        # Error handling
│   └── workspace-browser/              # Workspace selection
├── config/
│   └── authConfig.ts                   # Azure AD configuration
├── hooks/
│   ├── usePowerBIMPA.ts               # MPA optimization hook
│   └── usePowerBIService.ts           # Service management hook
├── pages/
│   └── MPATestPage.tsx                # Main test interface
├── services/
│   ├── PowerBIService.ts              # Singleton service
│   ├── PowerBIMPAService.ts           # MPA-specific service
│   └── PowerBIPerformanceTracker.ts   # Performance monitoring
└── utils/
    └── report-load-manager.ts         # Load optimization
```

## 🎯 Usage Examples

### Singleton Mode Configuration

```typescript
// Toggle singleton mode programmatically
import { powerBIService } from './services/PowerBIService';

// Enable singleton mode for optimal performance (default)
powerBIService.setSingletonMode(true);

// Disable for individual service instances (testing)
powerBIService.setSingletonMode(false);

// Check current mode
const isUsingSingleton = powerBIService.getSingletonMode();
console.log('Using singleton mode:', isUsingSingleton);
```

### Monitoring Service Instances

```typescript
// Get real-time service metrics
const metrics = powerBIService.getLoadedInstancesCount();
console.log('Services:', metrics.services);          // 1 in singleton, N in individual
console.log('Frames:', metrics.frames);             // Total active frames
console.log('Reports:', metrics.reports);           // Number of reports
console.log('Singleton Mode:', metrics.singletonMode); // Current mode
```

### Basic Report Embedding

```typescript
import { usePowerBIMPA } from './hooks/usePowerBIMPA';

const { embedReport, stats } = usePowerBIMPA({
  enableLogging: true,
  trackPerformance: true
});

// Embed a report
await embedReport(containerElement, {
  type: 'report',
  id: 'report-id',
  embedUrl: 'embed-url',
  accessToken: 'token'
});
```

### Duplicate Report Functionality

```typescript
const duplicateReport = (reportId: string) => {
  const reportToDuplicate = optimizedReports.find(r => r.id === reportId);
  if (reportToDuplicate) {
    const newReport = {
      ...reportToDuplicate,
      id: `duplicate-${Date.now()}`,
      name: `${reportToDuplicate.name} (Copy)`
    };
    setOptimizedReports(prev => [...prev, newReport]);
  }
};
```

### Service Metrics Tracking

```typescript
const metrics = powerBIService.getLoadedInstancesCount();
// Returns: { services: number, frames: number, reports: number, dashboards: number }
```

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Azure AD app configuration
   - Check redirect URIs match exactly (including protocol: https/http)
   - Ensure API permissions are granted and admin consent is provided
   - Verify environment variables are correctly set in `.env.local`

2. **Environment Variable Issues**
   - Ensure `.env.local` file is in the root directory (same level as package.json)
   - Restart the development server after changing environment variables
   - Check that variable names start with `REACT_APP_`
   - Verify no extra spaces or quotes around values

3. **CORS Issues**
   - Use HTTPS (required for Power BI embedding)
   - Verify domain is registered in Power BI admin portal
   - Check that redirect URI in Azure AD matches your development URL

4. **Token Expiration**
   - Implement token refresh logic
   - Monitor token expiration times
   - Check Azure AD token lifetime settings

### Environment Configuration Debug

If authentication isn't working, check these steps:

1. **Verify Environment Variables are Loading:**

   ```bash
   # Add this to your component temporarily to debug
   console.log('Client ID:', process.env.REACT_APP_AZURE_CLIENT_ID);
   console.log('Authority:', process.env.REACT_APP_AZURE_AUTHORITY);
   ```

2. **Check Browser Network Tab:**
   - Look for failed requests to login.microsoftonline.com
   - Check for CORS errors
   - Verify redirect URLs match your configuration

3. **Validate Azure AD Configuration:**
   - Ensure app registration has correct redirect URIs
   - Check API permissions include Power BI scopes
   - Verify tenant ID is correct in authority URL

### Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
```

### Token Testing

You can also test token generation manually using the provided scripts:

```bash
# Windows
./get-powerbi-token.bat

# PowerShell
./Get-PowerBIToken.ps1
```

## 📈 Performance Optimization

### Singleton Service Benefits

The PowerBI service uses a **Singleton Pattern** that provides several performance advantages:

#### Memory Efficiency

- **Single Instance**: Only one PowerBI service instance across the entire application
- **Shared Resources**: Authentication tokens and configurations are shared
- **Automatic Cleanup**: Unused embedded instances are automatically removed
- **Instance Tracking**: Real-time monitoring of active services and frames

#### Performance Features

- **Connection Reuse**: Reuses existing PowerBI client connections
- **Token Caching**: Centralizes and caches authentication tokens
- **State Persistence**: Maintains service state across page navigations (MPA)
- **Lazy Loading**: Optional lazy loading for non-critical reports

### Best Practices

1. **Use Singleton Service**: Always access PowerBI service through `PowerBIService.getInstance()`
2. **Enable Priority Loading**: Load critical reports first using priority settings
3. **Enable Lazy Loading**: For non-critical content to improve initial page load
4. **Monitor Service Metrics**: Track active services and frames using the metrics dashboard
5. **Implement Cleanup**: Remove unused instances to prevent memory leaks
6. **Use MPA Optimization**: For multi-page applications with persistent state

### Performance Monitoring

The singleton service provides comprehensive metrics:

```typescript
// Get current service statistics
const stats = powerBIService.getStats();
console.log('Total Instances:', stats.totalInstances);
console.log('Active Frames:', stats.activeFrames);

// Get detailed instance counts
const metrics = powerBIService.getLoadedInstancesCount();
console.log('Services:', metrics.services);
console.log('Reports:', metrics.reports);
console.log('Dashboards:', metrics.dashboards);
```

### Memory Management

The application includes automatic cleanup for:

- Unused PowerBI instances
- Performance tracking data
- Expired authentication tokens
- Orphaned iframe elements

### Singleton vs Multiple Instances

| Feature | Singleton Pattern | Multiple Instances |
|---------|------------------|-------------------|
| Memory Usage | ✅ Low | ❌ High |
| Performance | ✅ Optimized | ❌ Degraded |
| Token Management | ✅ Centralized | ❌ Scattered |
| Error Handling | ✅ Unified | ❌ Complex |
| State Persistence | ✅ Maintained | ❌ Lost |
| Instance Tracking | ✅ Built-in | ❌ Manual |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License

## 🆘 Support

For support and questions:

1. Check the troubleshooting section
2. Review Power BI documentation
3. Open an issue in the repository

## 🔗 Useful Links

- [Power BI Embedded Documentation](https://docs.microsoft.com/power-bi/developer/embedded/)
- [Azure AD App Registration Guide](https://docs.microsoft.com/azure/active-directory/develop/quickstart-register-app)
- [Power BI REST API Reference](https://docs.microsoft.com/rest/api/power-bi/)
