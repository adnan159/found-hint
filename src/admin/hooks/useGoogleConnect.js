import { useNavigate } from "react-router";
import {
  useGetGoogleQuery,
  useStartGoogleConnectMutation,
} from "@/store/api/googleApi";

/**
 * Starting the Google sign-in, from wherever it is offered.
 *
 * Shared because two screens offer it and the awkward part is the same in
 * both: **without a stored Google client there is nowhere to send anyone**,
 * so the button has to lead to the screen where that is entered rather than
 * fail. Duplicating that decision is how the two would drift apart.
 *
 * @return {Object} `connect`, plus the connection state the caller renders.
 */
export function useGoogleConnect() {
  const navigate = useNavigate();
  const { data: google, isLoading } = useGetGoogleQuery();
  const [startConnect, { isLoading: isConnecting, error }] =
    useStartGoogleConnectMutation();

  const status = google?.status ?? "";

  const connect = async () => {
    if (!google?.configured) {
      navigate("/google");
      return;
    }

    try {
      const result = await startConnect().unwrap();

      if (result?.authorize_url) {
        // A full navigation, not a popup: this is Google's own sign-in page
        // and it must be unmistakably Google's, in the address bar the
        // person already trusts.
        window.location.assign(result.authorize_url);
      }
    } catch {
      // Surfaced through `error`.
    }
  };

  return {
    connect,
    isConnecting,
    error,
    isLoading,
    google,
    status,
    configured: Boolean(google?.configured),
    connected: status === "connected",
    needsReconnect: status === "needs_reconnect",
  };
}

export default useGoogleConnect;
