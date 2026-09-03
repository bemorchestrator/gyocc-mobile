import { useEffect } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import EventSource from "react-native-sse";
import { BASE_URL, COOKIE_KEY } from "./config";
import { getSessionValue } from "../utils/sessionStorage";

/**
 * Realtime sync over Server-Sent Events.
 *
 * The backend keeps a `GET /api/notifications/stream` connection open per
 * device and pushes `{ type: "invalidate", resources: [...] }` whenever an
 * admin creates/edits/deletes something that affects this member. We map those
 * signals onto React Query cache invalidations so the affected screens refetch
 * immediately — no waiting for the 30s poll or a manual pull-to-refresh.
 *
 * `react-native-sse` auto-reconnects (default 5s) on drop, and the connection
 * is a fallback layer only: the app still refetches on foreground/focus and
 * poll, so a missed event is self-healing.
 */

type RealtimeResource = "member-portal" | "member-attendance-overview" | "notifications" | "my-stipends";

interface InvalidateEvent {
  type: "invalidate";
  resources: RealtimeResource[];
}

export function useRealtimeSync(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    let source: EventSource | null = null;
    let cancelled = false;

    (async () => {
      const cookie = await getSessionValue(COOKIE_KEY);
      // No session cookie means we can't authenticate the stream; bail quietly.
      if (cancelled || !cookie) return;

      source = new EventSource(`${BASE_URL}/api/notifications/stream`, {
        headers: {
          Cookie: cookie,
          "X-GYOCC-Session-Cookie": cookie,
        },
        // Long-lived stream — never time the request out.
        timeout: 0,
      });

      source.addEventListener("message", (event) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data) as InvalidateEvent;
          if (payload?.type !== "invalidate" || !Array.isArray(payload.resources)) return;
          for (const resource of payload.resources) {
            queryClient.invalidateQueries({ queryKey: [resource] });
          }
        } catch {
          // Ignore malformed frames (e.g. heartbeat comments never reach here).
        }
      });

      if (__DEV__) {
        source.addEventListener("open", () => console.log("[Realtime] stream connected"));
        source.addEventListener("error", (event) =>
          console.log("[Realtime] stream error — will retry", (event as { message?: string })?.message)
        );
      }
    })();

    return () => {
      cancelled = true;
      source?.removeAllEventListeners();
      source?.close();
    };
  }, [enabled, queryClient]);
}
