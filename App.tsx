import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AccessibilityFeature, RoutePreferences } from './types';
import Map from './components/Map/Map';
import NavigationPanel from './components/Navigation/NavigationPanel';
import MobileNavigationPanel from './components/Navigation/MobileNavigationPanel';
import { geocodeLocation, calculateRoute } from './services/mapService';
import { fetchAccessibilityFeaturesForRoute } from './services/accessibilityDataService';
import { WeatherData, WeatherCondition, getWeatherDescription, getWeatherIconUrl } from './services/weatherService';
import { Snackbar, Alert, Box, Typography, Chip, Avatar } from '@mui/material';

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
  const [routeDuration, setRouteDuration] = useState<number | null>(7200); // Mock 2 hours (in seconds)
  const [routeDistance, setRouteDistance] = useState<number | null>(2500); // Mock 2.5 km (in meters)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  
  // State for simulating user progress along the route
  const [initialDuration, setInitialDuration] = useState<number | null>(null);
  const [routeProgress, setRouteProgress] = useState<number>(0); // 0 to 1 (0% to 100%)
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Accessibility features and weather state
  const [accessibilityFeatures, setAccessibilityFeatures] = useState<AccessibilityFeature[]>([]);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([-73.985, 40.748]); // Default to NYC

  // Fetch weather data for current location on component mount
  useEffect(() => {
    const fetchCurrentLocationWeather = async () => {
      try {
        // Use default location (NYC) or get user's location if available
        const weather = await import('./services/weatherService').then(module => 
          module.fetchWeatherData(currentLocation[1], currentLocation[0])
        );
        setWeatherData(weather);
        console.log('Current location weather data:', weather);
      } catch (error) {
        console.warn('Could not fetch initial weather data:', error);
      }
    };
    
    fetchCurrentLocationWeather();
  }, [currentLocation]);

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
      setInitialDuration(route.duration); // Store the initial duration
      setRouteDistance(route.distance);
      setRouteProgress(0); // Reset progress when a new route is calculated
      
      console.log('Route calculated successfully:', {
        coordinates: route.coordinates.length,
        duration: route.duration,
        distance: route.distance
      });
      
      // Fetch accessibility features along the route from OpenStreetMap
      setIsLoadingFeatures(true);
      try {
        const features = await fetchAccessibilityFeaturesForRoute(route.coordinates);
        setAccessibilityFeatures(features);
        console.log(`Loaded ${features.length} accessibility features from OpenStreetMap`);
      } catch (error) {
        console.error('Error fetching accessibility features:', error);
      } finally {
        setIsLoadingFeatures(false);
      }
      
      // Fetch weather data for the route
      try {
        // Use the start coordinates for weather (convert from [lng, lat] to [lat, lng])
        const weather = await import('./services/weatherService').then(module => 
          module.fetchWeatherData(startCoords[1], startCoords[0])
        );
        setWeatherData(weather);
        console.log('Weather data for route:', weather);
        
        // Update current location
        setCurrentLocation([startCoords[0], startCoords[1]]);
      } catch (error) {
        console.warn('Could not fetch weather data:', error);
        // Continue without weather data
      }
      
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

  // Simulate user movement along the route
  useEffect(() => {
    // Only start simulation if we have a route
    if (routeCoordinates.length > 0 && initialDuration) {
      // Clear any existing interval
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      
      // Reset progress
      setRouteProgress(0);
      
      // Start a new simulation
      simulationIntervalRef.current = setInterval(() => {
        setRouteProgress(prev => {
          // Increment progress by a small amount (0.5% each time)
          const newProgress = prev + 0.005;
          
          // If we've reached the destination, stop the simulation
          if (newProgress >= 1) {
            if (simulationIntervalRef.current) {
              clearInterval(simulationIntervalRef.current);
            }
            return 1;
          }
          
          return newProgress;
        });
      }, 1000); // Update every second
      
      // Clean up interval on unmount
      return () => {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
        }
      };
    }
  }, [routeCoordinates, initialDuration]);
  
  // Update the remaining duration based on progress
  useEffect(() => {
    if (initialDuration && routeProgress < 1) {
      // Calculate remaining duration based on progress
      const remainingDuration = Math.round(initialDuration * (1 - routeProgress));
      setRouteDuration(remainingDuration);
    }
  }, [routeProgress, initialDuration]);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ position: 'relative', height: '100vh' }}>
        <Map
          accessibilityFeatures={accessibilityFeatures}
          routePreferences={routePreferences}
          onFeatureClick={handleFeatureClick}
          routeCoordinates={routeCoordinates}
          isLoadingFeatures={isLoadingFeatures}
        />
        
        {/* Weather display - positioned under the current location button and slightly bigger */}
        {weatherData && (
          <Box 
            sx={{ 
              position: 'absolute',
              top: '60px', // Positioned below the current location button
              right: '10px',
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              p: 1.2,
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 1100,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '65px', // Slightly bigger than the current location button
              textAlign: 'center'
            }}
          >
            {/* Temperature in Fahrenheit */}
            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '1.1rem', lineHeight: 1.1 }}>
              {Math.round((weatherData.temperature * 9/5) + 32)}°F
            </Typography>
            
            {/* Weather icon */}
            <Avatar 
              src={getWeatherIconUrl(weatherData.icon)} 
              alt={weatherData.description}
              sx={{ width: 42, height: 42, my: 0.5 }}
            />
            
            {/* Precipitation percentage */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: '100%',
                mt: 0.3
              }}
            >
              <Typography 
                component="span" 
                sx={{ 
                  fontSize: '0.8rem', 
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 'medium'
                }}
              >
                💧 {weatherData.precipitation > 0 
                  ? `${Math.round(weatherData.precipitation * 10)}%` 
                  : '0%'}
              </Typography>
            </Box>
            
            {/* Warning indicator for extreme weather */}
            {weatherData.condition === WeatherCondition.RAIN || 
             weatherData.condition === WeatherCondition.SNOW || 
             weatherData.condition === WeatherCondition.EXTREME ? (
              <Chip 
                size="small" 
                color="warning" 
                label="⚠️" 
                sx={{ mt: 0.5, height: '18px', fontSize: '0.7rem', p: 0 }} 
              />
            ) : null}
          </Box>
        )}
        
        {/* Route duration display - smaller and in bottom right corner */}
        {routeDuration && (
          <Box 
            sx={{ 
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              p: 1.5,
              borderRadius: 2,
              boxShadow: 2,
              zIndex: 1100,
              textAlign: 'center',
              maxWidth: '180px'
            }}
          >
            <Typography variant="subtitle2" color="primary" fontWeight="bold">
              {routeProgress < 0.05 ? "Estimated Time" : "Time Remaining"}
            </Typography>
            <Typography variant="h4" color="primary.dark" sx={{ my: 0.5 }}>
              {routeDuration! / 60 >= 60 
                ? (Math.round((routeDuration! / 60) % 60) === 0 
                  ? `${Math.floor(routeDuration! / 3600)} hr` 
                  : `${Math.floor(routeDuration! / 3600)} hr ${Math.round((routeDuration! / 60) % 60)} min`)
                : `${Math.round(routeDuration! / 60)} min`}
            </Typography>
            {routeDistance && (
              <>
                <Typography variant="caption" color="text.secondary">
                  Distance: {(((1 - routeProgress) * routeDistance / 1000) * 0.621371).toFixed(1)} mi
                </Typography>
                {routeProgress > 0 && (
                  <Typography variant="caption" color="success.main" display="block">
                    {Math.round(routeProgress * 100)}% complete
                  </Typography>
                )}
              </>
            )}
            {weatherData && (weatherData.condition === WeatherCondition.RAIN || 
                             weatherData.condition === WeatherCondition.SNOW || 
                             weatherData.condition === WeatherCondition.EXTREME) && (
              <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
                Weather conditions may affect travel time
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
