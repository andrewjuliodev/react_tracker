import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { calculateDistance } from '../../../utils/calculations';
import theme from '../../../config/theme';
import locationTracker from '../../../services/location/locationTracker';

/**
 * Component for displaying activity route on a map
 * Provides activity route path visualization, start/end point markers,
 * elevation color coding, and interactive map controls
 */
const RouteMap = ({ 
  locationData = [], 
  elevationData = [], 
  activityType = 'running',
  interactive = true,
  onMarkerPress,
  initialRegion,
  style
}) => {
  // Reference to map component
  const mapRef = useRef(null);
  
  // State for route coordinates
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  
  // State for marker points (start, end, max elevation)
  const [markerPoints, setMarkerPoints] = useState({
    start: null,
    end: null,
    maxElevation: null
  });
  
  // State for map region
  const [region, setRegion] = useState(null);
  
  // Process location data when it changes
  useEffect(() => {
    if (locationData && locationData.length > 0) {
      // Format coordinates for map display
      const coordinates = processLocationData(locationData);
      setRouteCoordinates(coordinates);
      
      // Calculate marker points
      const markers = calculateMarkerPoints(coordinates, elevationData);
      setMarkerPoints(markers);
      
      // Calculate optimal map region if not explicitly provided
      if (!initialRegion) {
        const calculatedRegion = calculateMapRegion(coordinates);
        setRegion(calculatedRegion);
      } else {
        setRegion(initialRegion);
      }
    }
  }, [locationData, elevationData, initialRegion]);
  
  /**
   * Processes location data for map display
   * @param {Array} locationData - Raw GPS points
   * @returns {Array} Formatted coordinates for map
   */
  const processLocationData = (locationData) => {
    // Filter out invalid coordinates
    return locationData
      .filter(point => 
        point && point.latitude && point.longitude &&
        Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180
      )
      .map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp || null,
        elevation: point.altitude || null
      }));
  };
  
  /**
   * Calculates optimal map region to display route
   * @param {Array} coordinates - Route coordinates
   * @returns {Object} Map region with boundaries
   */
  const calculateMapRegion = (coordinates) => {
    if (!coordinates || coordinates.length === 0) {
      // Default region if no coordinates
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421
      };
    }
    
    // Find min and max coordinates
    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLng = coordinates[0].longitude;
    let maxLng = coordinates[0].longitude;
    
    coordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });
    
    // Calculate center and deltas
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Add padding
    const PADDING = 1.5; // Adjust as needed
    let latDelta = (maxLat - minLat) * PADDING;
    let lngDelta = (maxLng - minLng) * PADDING;
    
    // Ensure minimum zoom level
    latDelta = Math.max(latDelta, 0.01);
    lngDelta = Math.max(lngDelta, 0.01);
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta
    };
  };
  
  /**
   * Calculates important marker points
   * @param {Array} coordinates - Route coordinates
   * @param {Array} elevations - Elevation values
   * @returns {Object} Marker points with special locations
   */
  const calculateMarkerPoints = (coordinates, elevations) => {
    if (!coordinates || coordinates.length === 0) {
      return { start: null, end: null, maxElevation: null };
    }
    
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    let maxElevation = null;
    
    // Find max elevation point if elevation data exists
    if (elevations && elevations.length > 0) {
      let maxElevationValue = -Infinity;
      let maxElevationIndex = 0;
      
      elevations.forEach((elevation, index) => {
        if (elevation > maxElevationValue) {
          maxElevationValue = elevation;
          maxElevationIndex = index;
        }
      });
      
      // Get corresponding coordinate if index is valid
      if (maxElevationIndex < coordinates.length) {
        maxElevation = {
          ...coordinates[maxElevationIndex],
          elevation: maxElevationValue
        };
      }
    }
    
    return { start, end, maxElevation };
  };
  
  /**
   * Generates color gradient based on elevation
   * @param {number} elevation - Point elevation
   * @param {number} minElevation - Lowest route elevation
   * @param {number} maxElevation - Highest route elevation
   * @returns {string} Color code for polyline segment
   */
  const getElevationColor = (elevation, minElevation, maxElevation) => {
    if (!elevation || elevation === null || minElevation === maxElevation) {
      return theme.colors.primary;
    }
    
    // Normalize elevation to [0, 1] range
    const normalized = (elevation - minElevation) / (maxElevation - minElevation);
    
    // Gradient from blue (low) to red (high)
    const hue = 240 - (normalized * 240); // 240 is blue, 0 is red
    return `hsl(${hue}, 100%, 50%)`;
  };
  
  /**
   * Centers map on specific point
   * @param {Object} coordinate - Location to center on
   * @param {number} zoom - Zoom level
   */
  const centerOnPoint = (coordinate, zoom = 16) => {
    if (mapRef.current && coordinate) {
      mapRef.current.animateToRegion({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: 0.01 / zoom,
        longitudeDelta: 0.01 / zoom
      }, 500);
    }
  };
  
  /**
   * Handles marker press
   * @param {string} markerType - Type of marker pressed
   * @param {Object} coordinate - Marker coordinate
   */
  const handleMarkerPress = (markerType, coordinate) => {
    // Center map on marker
    centerOnPoint(coordinate);
    
    // Call handler if provided
    if (onMarkerPress) {
      onMarkerPress(markerType, coordinate);
    }
  };
  
  // If no data, show placeholder
  if (!locationData || locationData.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.noDataText}>No route data available</Text>
      </View>
    );
  }
  
  // Calculate min and max elevation if available
  let minElevation = 0;
  let maxElevation = 0;
  
  if (elevationData && elevationData.length > 0) {
    minElevation = Math.min(...elevationData.filter(e => e !== null));
    maxElevation = Math.max(...elevationData.filter(e => e !== null));
  }
  
  // Get line width from environment or use default
  const routeLineWidth = parseInt(process.env.ROUTE_LINE_WIDTH) || 4;
  
  // Get map style from environment or use default
  const mapStyle = process.env.MAP_STYLE || 'standard';
  
  return (
    <View style={[styles.container, style]}>
      {region && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          mapType={mapStyle}
          showsUserLocation={interactive}
          showsMyLocationButton={interactive}
          showsCompass={interactive}
          showsScale={interactive}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          rotateEnabled={interactive}
        >
          {/* Route path */}
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={routeLineWidth}
              strokeColor={elevationData.length > 0 ? theme.colors.primary : theme.colors.primary}
              lineCap="round"
              lineJoin="round"
            />
          )}
          
          {/* Elevation-colored segments */}
          {elevationData.length > 0 && routeCoordinates.length > 1 && (
            routeCoordinates.slice(0, -1).map((point, index) => {
              const nextPoint = routeCoordinates[index + 1];
              const elevation = elevationData[index] || 0;
              const color = getElevationColor(elevation, minElevation, maxElevation);
              
              return (
                <Polyline
                  key={`segment-${index}`}
                  coordinates={[point, nextPoint]}
                  strokeWidth={routeLineWidth}
                  strokeColor={color}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            })
          )}
          
          {/* Start marker */}
          {markerPoints.start && (
            <Marker
              coordinate={markerPoints.start}
              title="Start"
              description="Starting point"
              pinColor="green"
              onPress={() => handleMarkerPress('start', markerPoints.start)}
            />
          )}
          
          {/* End marker */}
          {markerPoints.end && (
            <Marker
              coordinate={markerPoints.end}
              title="Finish"
              description="Ending point"
              pinColor="red"
              onPress={() => handleMarkerPress('end', markerPoints.end)}
            />
          )}
          
          {/* Max elevation marker */}
          {markerPoints.maxElevation && (
            <Marker
              coordinate={markerPoints.maxElevation}
              title="Highest Point"
              description={`Elevation: ${markerPoints.maxElevation.elevation.toFixed(1)}m`}
              pinColor="purple"
              onPress={() => handleMarkerPress('maxElevation', markerPoints.maxElevation)}
            />
          )}
        </MapView>
      )}
      
      {/* Map controls if interactive */}
      {interactive && (
        <View style={styles.controls}>
          {markerPoints.start && (
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => centerOnPoint(markerPoints.start)}
            >
              <Text style={styles.controlButtonText}>Start</Text>
            </TouchableOpacity>
          )}
          
          {markerPoints.end && (
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => centerOnPoint(markerPoints.end)}
            >
              <Text style={styles.controlButtonText}>Finish</Text>
            </TouchableOpacity>
          )}
          
          {routeCoordinates.length > 0 && (
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => mapRef.current?.animateToRegion(region, 500)}
            >
              <Text style={styles.controlButtonText}>Full Route</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Elevation legend if available */}
      {elevationData.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: getElevationColor(minElevation, minElevation, maxElevation) }]} />
            <Text style={styles.legendText}>{minElevation.toFixed(0)}m</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: getElevationColor(maxElevation, minElevation, maxElevation) }]} />
            <Text style={styles.legendText}>{maxElevation.toFixed(0)}m</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.background
  },
  map: {
    flex: 1
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 50,
    color: theme.colors.text
  },
  controls: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'column'
  },
  controlButton: {
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
    minWidth: 80,
    alignItems: 'center'
  },
  controlButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  legend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 120
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4
  },
  legendText: {
    fontSize: 10,
    color: theme.colors.text
  }
});

export default RouteMap;