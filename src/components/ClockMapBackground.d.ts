import type React from "react";

export interface ClockMapBackgroundProps {
  venueName?: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  geofenceRadiusMeters?: number;
}

declare const ClockMapBackground: React.ComponentType<ClockMapBackgroundProps>;

export default ClockMapBackground;
