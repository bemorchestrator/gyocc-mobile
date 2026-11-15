import type React from "react";

export interface VenueMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  geofenceRadiusMeters?: number;
  height?: number;
}

/** A small Google map centred on a venue pin with its clock-in radius. */
declare const VenueMap: React.ComponentType<VenueMapProps>;

export default VenueMap;
