# PowerBI React Client - AI Coding Assistant Instructions

## Project Overview

This is the official Microsoft PowerBI React client library with an enhanced demo showcasing Multi-Page Application (MPA) architecture and advanced embedding patterns. The project consists of:

- **Core Library** (`React/powerbi-client-react/`): Official PowerBI React wrapper component
- **Enhanced Demo** (`React/demo/`): Advanced demo with MPA architecture, singleton services, and multi-report capabilities

## Architecture Patterns

### Core Library Architecture
The main `PowerBIEmbed` component in `React/powerbi-client-react/src/PowerBIEmbed.tsx` is a class component that:
- Uses `powerbi-client` service with factories pattern: `new service.Service(factories.hpmFactory, factories.wpmpFactory, factories.routerFactory)`
- Supports bootstrap → load → embed lifecycle for performance
- Handles event mapping with strict validation against `allowedEvents` arrays
- Uses `isEqual` from lodash for prop comparison to trigger re-embedding

### Demo MPA Architecture (Critical Pattern)
The demo implements a sophisticated **Multi-Page Application** pattern optimized for PowerBI embedding:

**Singleton Service Pattern** (`services/PowerBIMPAService.ts`):
```typescript
// Singleton instance persists across page navigations
export const powerBIMPAService = PowerBIMPAService.getInstance();
```

**Key MPA Components**:
- `usePowerBIMPA()` hook: Main interface for MPA embedding
- `PowerBIMPAService`: Singleton service with persistence between page loads
- `MultiReportDiagnostics`: Real-time diagnostic tool for multi-report debugging
- `CleanPowerBIEmbed`: Simplified embedding component for stable multi-report scenarios

### Multi-Report Architecture
**Critical for multi-report scenarios**: Each report gets unique service instances to prevent conflicts:
```typescript
// Each component creates isolated service instance
const instanceId = useRef(`powerbi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
const createUniqueService = () => new service.Service(/* factories */);
```

## Development Workflows

### Build & Development
```bash
# Core library development
cd React/powerbi-client-react && npm run build:dev

# Demo development (main development environment)
cd React/demo && npm run demo  # Serves at https://localhost:9000

# Library tests
cd React/powerbi-client-react && npm run test
```

### Authentication Setup
Demo uses Azure MSAL with environment variables in `webpack.config.js`:
- `REACT_APP_AZURE_CLIENT_ID`
- `REACT_APP_AZURE_AUTHORITY` 
- `REACT_APP_REDIRECT_URI`

### PowerBI API Integration
**DirectLake Dataset Support**: V2 API required for DirectLake datasets (`services/powerbi-workspace-service.ts`):
```typescript
// Auto-detects DirectLake and uses appropriate API version
const isDirectLake = targetDataset?.targetStorageMode?.toLowerCase().includes('directlake');
```

## Critical Code Patterns

### Error Handling for Multi-Reports
**QueryUserError Prevention**: When embedding multiple reports, use unique service instances and proper error boundaries:
```typescript
// Clean embedding pattern - each report isolated
const cleanup = useCallback(() => {
    if (reportRef.current) {
        reportRef.current.off('loaded');
        reportRef.current.off('error');
        reportRef.current = null;
    }
    if (containerRef.current) {
        containerRef.current.innerHTML = '';
    }
}, []);
```

### Event Handler Patterns
**Strict Event Validation**: The core library validates events against entity-specific `allowedEvents`:
```typescript
// Report events: ['loaded', 'rendered', 'error', 'dataSelected', 'pageChanged', etc.]
// Dashboard events: ['loaded', 'tileClicked']
// Invalid events logged to console.error
```

### Performance Optimization
**Lazy Loading & Priority System** (`OptimizedPowerBIEmbed.tsx`):
```typescript
const { requestLoad } = useReportLoadManager(maxConcurrentLoads);
// Reports load based on priority: 'high' | 'normal' | 'low'
```

### Persistence Patterns (MPA Specific)
```typescript
// MPA service persists state in localStorage with cleanup
this.saveInstanceToPersistence(containerId, instanceData);
this.loadFromPersistence(); // Restores state after page navigation
```

## Component Conventions

### Embed Component Props Pattern
All embed components follow this interface pattern:
```typescript
interface EmbedProps {
    reportId: string;
    embedUrl: string;  
    accessToken: string;
    onLoaded?: (report: Report) => void;
    onError?: (error: any) => void;
    height?: string | number;
}
```

### Hook Return Pattern
PowerBI hooks return destructured APIs:
```typescript
const {
    embedReport,
    embedDashboard, 
    initializeService,
    isInitialized,
    error,
    stats
} = usePowerBIMPA(options);
```

## Integration Points

### External Dependencies
- **powerbi-client**: Core PowerBI JavaScript SDK
- **@azure/msal-react**: Authentication for demo
- **powerbi-report-authoring**: Report authoring capabilities

### Cross-Component Communication
- **Event System**: Components communicate via PowerBI events (`loaded`, `error`, `dataSelected`)
- **Service Messages**: MPA service broadcasts state changes
- **Diagnostic Events**: `MultiReportDiagnostics` aggregates events from all embedded reports

## Testing Patterns

Tests in `React/powerbi-client-react/test/` use:
- **React Testing Library** with `act()` wrapper
- **Jasmine** for test framework  
- **Mocking pattern**: Mock PowerBI service with `spyOn(testReport, 'on')`

Critical test pattern for event handlers:
```typescript
// Verify event cleanup on component unmount
expect(testReport.off).toHaveBeenCalledTimes(eventHandlers.size);
```

## Common Issues & Solutions

### Multi-Report "QueryUserError"
- **Cause**: Service instance conflicts between reports
- **Solution**: Use `CleanPowerBIEmbed` with unique service instances per component

### Performance with Multiple Reports  
- **Use**: `OptimizedPowerBIEmbed` with priority system and lazy loading
- **Configure**: `maxConcurrentLoads` and `resourceOptimization` options

### MPA State Loss
- **Use**: `usePowerBIMPA` hook which automatically persists/restores state
- **Configure**: `persistenceKey` and `maxInstanceAge` for cleanup

When working with this codebase, prioritize understanding the MPA singleton pattern and multi-report isolation techniques, as these are the most complex and critical architectural decisions.
