export interface FaceApiPointLike {
  x: number;
  y: number;
}

export interface FaceApiBoxLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceApiLandmarksLike {
  positions: FaceApiPointLike[];
  getLeftEye: () => FaceApiPointLike[];
  getRightEye: () => FaceApiPointLike[];
  getNose: () => FaceApiPointLike[];
  getJawOutline: () => FaceApiPointLike[];
  getMouth: () => FaceApiPointLike[];
}

export interface FaceApiDetectionWithLandmarks {
  detection: {
    box: FaceApiBoxLike;
  };
  landmarks: FaceApiLandmarksLike;
}

interface FaceApiLike {
  nets: {
    tinyFaceDetector: {
      loadFromUri: (uri: string) => Promise<void>;
    };
    faceLandmark68Net: {
      loadFromUri: (uri: string) => Promise<void>;
    };
  };
  TinyFaceDetectorOptions: new (options: { inputSize: number; scoreThreshold: number }) => unknown;
  detectAllFaces: (
    input: CanvasImageSource,
    options: unknown,
  ) => {
    withFaceLandmarks: () => Promise<FaceApiDetectionWithLandmarks[]>;
  };
}

const FACE_MODEL_URI = "https://justadudewhohacks.github.io/face-api.js/models";
const FACE_API_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";

let faceApiScriptPromise: Promise<FaceApiLike> | null = null;
let faceMonitoringModelsPromise: Promise<void> | null = null;

function getFaceApiGlobal() {
  return (window as Window & { faceapi?: FaceApiLike }).faceapi ?? null;
}

export async function loadFaceApi() {
  const existing = getFaceApiGlobal();
  if (existing) {
    return existing;
  }

  if (!faceApiScriptPromise) {
    faceApiScriptPromise = new Promise<FaceApiLike>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-face-api-script="true"]');
      if (existingScript) {
        const handleLoad = () => {
          const faceapi = getFaceApiGlobal();
          if (!faceapi) {
            reject(new Error("face-api.js script loaded but global API is unavailable."));
            return;
          }

          resolve(faceapi);
        };

        existingScript.addEventListener("load", handleLoad, { once: true });
        existingScript.addEventListener(
          "error",
          () => {
            faceApiScriptPromise = null;
            reject(new Error("Failed to load face-api.js script."));
          },
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = FACE_API_SCRIPT_SRC;
      script.async = true;
      script.setAttribute("data-face-api-script", "true");
      script.onload = () => {
        const faceapi = getFaceApiGlobal();
        if (!faceapi) {
          reject(new Error("face-api.js script loaded but global API is unavailable."));
          return;
        }

        resolve(faceapi);
      };
      script.onerror = () => {
        faceApiScriptPromise = null;
        reject(new Error("Failed to load face-api.js script."));
      };
      document.head.appendChild(script);
    });
  }

  return faceApiScriptPromise;
}

export async function ensureFaceMonitoringModelsLoaded() {
  const faceapi = await loadFaceApi();

  if (!faceMonitoringModelsPromise) {
    faceMonitoringModelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URI),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URI),
    ]).then(() => undefined);
  }

  try {
    await faceMonitoringModelsPromise;
  } catch (error) {
    faceMonitoringModelsPromise = null;
    throw error;
  }
}

export async function detectFacesWithLandmarks(input: CanvasImageSource) {
  await ensureFaceMonitoringModelsLoaded();
  const faceapi = await loadFaceApi();
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  return faceapi.detectAllFaces(input, options).withFaceLandmarks();
}
