import type { ClockLocationEvidence } from "../api/memberPortal";

export interface AttendanceMapModalProps {
  visible: boolean;
  action: "in" | "out";
  venueName?: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  geofenceRadiusMeters?: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: (location?: ClockLocationEvidence) => Promise<void>;
}

export default function AttendanceMapModal(props: AttendanceMapModalProps): React.ReactElement;
