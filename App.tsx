import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AccessibilityFeature, RoutePreferences } from './types';
import Map from './components/Map/Map';
import NavigationPanel from './components/Navigation/NavigationPanel';
import MobileNavigationPanel from './components/Navigation/MobileNavigationPanel';
import { geocodeLocation, calculateRoute } from './services/mapService';
import { Snackbar, Alert, Box, Typography } from '@mui/material';

// Create a theme instance with accessibility considerations
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3', // High contrast blue
    },
    error: {
      main: '#f44336', // Clear red for emergency functions
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontSize: 16, // Larger base font size for better readability
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          padding: '12px 24px',
        },
      },
    },
  },
});

const App: React.FC = () => {
  const [routePreferences, setRoutePreferences] = useState<RoutePreferences>({
    maxSlope: 8,
    preferredSurfaces: ['paved', 'smooth'],
    avoidStairs: true,
    requireElevators: true,
    minPathWidth: 32,
  });
  
  // Route state
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeDuration, setRouteDuration] = useState<number | null>(1200); // Mock 20 minutes (in seconds)
  const [routeDistance, setRouteDistance] = useState<number | null>(2500); // Mock 2.5 km (in meters)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Mock accessibility features for demonstration
  const [accessibilityFeatures] = useState<AccessibilityFeature[]>([
    {
      type: 'ramp',
      location: { lat: 40.7128, lng: -74.006 },
      description: 'Gentle slope entrance ramp',
      status: 'active',
      lastUpdated: new Date(),
      rating: 4.5,
    },
    {
      type: 'elevator',
      location: { lat: 40.7138, lng: -74.007 },
      description: 'Public elevator to subway platform',
      status: 'active',
      lastUpdated: new Date(),
      rating: 4.0,
    },
  ]);

  const handleRoutePreferencesChange = (newPreferences: RoutePreferences) => {
    setRoutePreferences(newPreferences);
  };
  
  const handleFindRoute = async (startLocation: string, destination: string) => {
    if (!startLocation || !destination) {
      setRouteError('Please enter both start location and destination');
      return;
    }
    
    setIsCalculatingRoute(true);
    setRouteError(null);
    
    try {
      // Geocode start and destination locations
      const startCoords = await geocodeLocation(startLocation);
      const endCoords = await geocodeLocation(destination);
      
      if (!startCoords) {
        setRouteError(`Could not find location: ${startLocation}`);
        setIsCalculatingRoute(false);
        return;
      }
      
      if (!endCoords) {
        setRouteError(`Could not find location: ${destination}`);
        setIsCalculatingRoute(false);
        return;
      }
      
      // Calculate route
      const route = await calculateRoute(startCoords, endCoords, routePreferences);
      
      if (!route || route.coordinates.length === 0) {
        setRouteError('Could not find an accessible route between these locations');
        setIsCalculatingRoute(false);
        return;
      }
      
      // Set route information to display
      setRouteCoordinates(route.coordinates);
      setRouteDuration(route.duration);
      setRouteDistance(route.distance);
      
      console.log('Route calculated successfully:', {
        coordinates: route.coordinates.length,
        duration: route.duration,
        distance: route.distance
      });
      
    } catch (error) {
      console.error('Error finding route:', error);
      setRouteError('An error occurred while finding the route');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleEmergencyAssistance = () => {
    // Implement emergency assistance functionality
    console.log('Emergency assistance requested');
    // This would typically involve:
    // 1. Getting current location
    // 2. Contacting emergency services
    // 3. Notifying emergency contacts
    // 4. Displaying nearby accessible emergency facilities
  };

  const handleFeatureClick = (feature: AccessibilityFeature) => {
    console.log('Selected feature:', feature);
    // Implement feature selection behavior
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ position: 'relative', height: '100vh' }}>
        <Map
          accessibilityFeatures={accessibilityFeatures}
          routePreferences={routePreferences}
          onFeatureClick={handleFeatureClick}
          routeCoordinates={routeCoordinates}
        />
        
        {/* Route duration display */}
        {routeDuration && (
          <Box 
            sx={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'white',
              p: 3,
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 1100,
              textAlign: 'center',
              minWidth: '250px'
            }}
          >
            <Typography variant="h6" color="primary" gutterBottom>
              Estimated Route Time
            </Typography>
            <Typography variant="h3" color="primary.dark">
              {Math.round(routeDuration / 60)} min
            </Typography>
            {routeDistance && (
              <Typography variant="subtitle1" color="text.secondary">
                Distance: {(routeDistance / 1000).toFixed(1)} km
              </Typography>
            )}
          </Box>
        )}
        <>
          <NavigationPanel
            onRoutePreferencesChange={handleRoutePreferencesChange}
            onEmergencyAssistance={handleEmergencyAssistance}
            onFindRoute={handleFindRoute}
            isCalculatingRoute={isCalculatingRoute}
            batteryLevel={85} // Mock battery level
            routeDuration={routeDuration}
            routeDistance={routeDistance}
          />
          <MobileNavigationPanel
            onRoutePreferencesChange={handleRoutePreferencesChange}
            onEmergencyAssistance={handleEmergencyAssistance}
            onFindRoute={handleFindRoute}
            isCalculatingRoute={isCalculatingRoute}
            batteryLevel={85} // Mock battery level
            routeDuration={routeDuration}
            routeDistance={routeDistance}
          />
        </>
        
        {/* Error message */}
        <Snackbar 
          open={!!routeError} 
          autoHideDuration={6000} 
          onClose={() => setRouteError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setRouteError(null)} severity="error">
            {routeError}
          </Alert>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
};

export default App;
