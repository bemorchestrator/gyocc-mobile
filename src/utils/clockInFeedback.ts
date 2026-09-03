import type { ApiClientError } from "../api/client";

export type ClockInFailureAction = "refresh-gps" | "refresh-activity" | "none";

export interface ClockInFailureFeedback {
  title: string;
  message: string;
  action: ClockInFailureAction;
}

function finiteDetail(error: ApiClientError, key: string): number | undefined {
  const value = error.details?.[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined;
}

export function clockInFailureFeedback(error: unknown): ClockInFailureFeedback {
  const failure = (error ?? {}) as ApiClientError;
  const fallback = failure.message || "Clock-in could not be completed. Check your connection and try again.";

  switch (failure.code) {
    case "LOCATION_REQUIRED":
      return { title: "Location required", message: "Allow location access, then refresh your GPS position.", action: "refresh-gps" };
    case "LOCATION_STALE":
      return { title: "Location expired", message: "Your GPS position is more than a minute old. Refresh it and try again.", action: "refresh-gps" };
    case "LOCATION_INACCURATE": {
      const accuracy = finiteDetail(failure, "accuracyMeters");
      return { title: "GPS signal is weak", message: accuracy ? `Current accuracy is about ${accuracy} m. Move to an open area and refresh GPS.` : "Move to an open area and refresh GPS.", action: "refresh-gps" };
    }
    case "LOCATION_MOCKED":
      return { title: "Mock location detected", message: "Turn off mock-location software and refresh your real GPS position.", action: "refresh-gps" };
    case "OUTSIDE_GEOFENCE": {
      const distance = finiteDetail(failure, "distanceMeters");
      const radius = finiteDetail(failure, "radiusMeters");
      const message = distance !== undefined && radius !== undefined
        ? `You are about ${distance} m from the venue pin. Move within the ${radius} m attendance area and refresh GPS.`
        : fallback;
      return { title: "Outside attendance area", message, action: "refresh-gps" };
    }
    case "VENUE_LOCATION_REQUIRED":
      return { title: "Venue pin unavailable", message: "An administrator must configure the venue pin before members can clock in.", action: "refresh-activity" };
    case "ACTIVITY_NOT_CLOCKABLE":
      return { title: "Activity unavailable", message: fallback, action: "refresh-activity" };
    case "PARTICIPATION_NOT_CONFIRMED":
      return { title: "Confirmation required", message: "Confirm your participation first, then try clocking in again.", action: "refresh-activity" };
    default:
      if (failure.status === 409 && failure.clockInWindow?.isUpcoming) {
        const opens = failure.clockInWindow.opensAt ? new Date(failure.clockInWindow.opensAt) : null;
        const when = opens && !Number.isNaN(opens.getTime())
          ? opens.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          : null;
        return { title: "Clock-in is not open yet", message: when ? `Clock-in opens at ${when}.` : fallback, action: "refresh-activity" };
      }
      if (failure.status === 409 && failure.clockInWindow?.isPast) {
        return { title: "Clock-in has closed", message: fallback, action: "refresh-activity" };
      }
      return { title: "Clock-in unavailable", message: fallback, action: "none" };
  }
}
