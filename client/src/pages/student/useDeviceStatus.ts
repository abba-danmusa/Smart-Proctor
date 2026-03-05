import { useCallback, useEffect, useState } from "react";

export type DeviceHealthState = "checking" | "ready" | "missing" | "blocked" | "unsupported";

export interface DeviceStatusSnapshot {
  camera: DeviceHealthState;
  microphone: DeviceHealthState;
  checkedAt: string | null;
}

function canEnumerateDevices() {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices) &&
    typeof navigator.mediaDevices.enumerateDevices === "function"
  );
}

function buildInitialState(): DeviceStatusSnapshot {
  if (!canEnumerateDevices()) {
    return {
      camera: "unsupported",
      microphone: "unsupported",
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    camera: "checking",
    microphone: "checking",
    checkedAt: null,
  };
}

export function getDeviceStateColor(state: DeviceHealthState) {
  if (state === "ready") return "green";
  if (state === "checking") return "orange";
  return "red";
}

export function getDeviceStateLabel(state: DeviceHealthState) {
  if (state === "ready") return "Detected";
  if (state === "missing") return "Not detected";
  if (state === "blocked") return "Permission blocked";
  if (state === "unsupported") return "Unsupported";
  return "Checking";
}

export function useDeviceStatus() {
  const [snapshot, setSnapshot] = useState<DeviceStatusSnapshot>(() => buildInitialState());

  const refresh = useCallback(async () => {
    if (!canEnumerateDevices()) {
      setSnapshot({
        camera: "unsupported",
        microphone: "unsupported",
        checkedAt: new Date().toISOString(),
      });
      return;
    }

    setSnapshot((prev) => ({
      ...prev,
      camera: "checking",
      microphone: "checking",
    }));

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some((item) => item.kind === "videoinput");
      const hasMicrophone = devices.some((item) => item.kind === "audioinput");

      setSnapshot({
        camera: hasCamera ? "ready" : "missing",
        microphone: hasMicrophone ? "ready" : "missing",
        checkedAt: new Date().toISOString(),
      });
    } catch {
      setSnapshot({
        camera: "blocked",
        microphone: "blocked",
        checkedAt: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    if (!canEnumerateDevices()) {
      return;
    }

    let isDisposed = false;

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (isDisposed) {
          return;
        }

        const hasCamera = devices.some((item) => item.kind === "videoinput");
        const hasMicrophone = devices.some((item) => item.kind === "audioinput");

        setSnapshot({
          camera: hasCamera ? "ready" : "missing",
          microphone: hasMicrophone ? "ready" : "missing",
          checkedAt: new Date().toISOString(),
        });
      })
      .catch(() => {
        if (isDisposed) {
          return;
        }

        setSnapshot({
          camera: "blocked",
          microphone: "blocked",
          checkedAt: new Date().toISOString(),
        });
      });

    return () => {
      isDisposed = true;
    };
  }, []);

  return {
    snapshot,
    refresh,
  };
}
