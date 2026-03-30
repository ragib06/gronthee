import { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera, CameraOff, RefreshCw, ShieldOff } from 'lucide-react'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

interface WebcamCaptureProps {
  onCapture: (dataUrl: string) => void
  disabled?: boolean
}

type CameraState = 'loading' | 'ready' | 'denied' | 'unavailable' | 'insecure' | 'error'

interface ErrorConfig {
  icon: typeof CameraOff
  title: string
  body: string
  retry: boolean
}

const ERROR_CONFIGS: Record<Exclude<CameraState, 'loading' | 'ready'>, ErrorConfig> = {
  denied: {
    icon: CameraOff,
    title: 'Camera access denied',
    body: 'Allow camera access in your browser settings, then click Retry.',
    retry: true,
  },
  unavailable: {
    icon: CameraOff,
    title: 'No camera found',
    body: 'No camera was detected on this device.',
    retry: false,
  },
  insecure: {
    icon: ShieldOff,
    title: 'HTTPS required',
    body: 'Browsers only allow camera access on secure (HTTPS) connections or localhost. Open the app via localhost or configure HTTPS to use this feature.',
    retry: false,
  },
  error: {
    icon: CameraOff,
    title: 'Camera unavailable',
    body: 'Could not access the camera. It may be in use by another application.',
    retry: true,
  },
}

// Mobile phones get back camera; desktops and tablets get front camera
const isMobilePhone = /Android.*Mobile|iPhone|iPod/i.test(navigator.userAgent)
const VIDEO_CONSTRAINTS = {
  facingMode: isMobilePhone ? { ideal: 'environment' } : 'user',
}

export default function WebcamCapture({ onCapture, disabled }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null)
  const [cameraState, setCameraState] = useState<CameraState>(
    window.isSecureContext ? 'loading' : 'insecure'
  )
  const [retryKey, setRetryKey] = useState(0)

  const capture = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (screenshot) onCapture(screenshot)
  }, [onCapture])

  function handleUserMedia() {
    setCameraState('ready')
  }

  function handleUserMediaError(err: string | DOMException) {
    const name = typeof err === 'string' ? err : err.name
    if (
      name === 'NotAllowedError' ||
      name === 'PermissionDeniedError' ||
      name === 'SecurityError'
    ) {
      setCameraState(window.isSecureContext ? 'denied' : 'insecure')
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      setCameraState('unavailable')
    } else {
      setCameraState('error')
    }
  }

  function handleRetry() {
    setCameraState('loading')
    // Small delay ensures the loading state renders before Webcam remounts
    setTimeout(() => setRetryKey(k => k + 1), 50)
  }

  const errorConfig = cameraState !== 'loading' && cameraState !== 'ready'
    ? ERROR_CONFIGS[cameraState]
    : null

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Always mounted (when secure) so the browser triggers the permission prompt.
          Hidden via CSS while not ready to avoid showing a blank video element. */}
      {window.isSecureContext && (
        <div className={`w-full rounded-xl overflow-hidden border border-gray-200 bg-black ${cameraState === 'ready' ? '' : 'hidden'}`}>
          <Webcam
            key={retryKey}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={VIDEO_CONSTRAINTS}
            className="w-full"
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
          />
        </div>
      )}

      {cameraState === 'loading' && (
        <div className="w-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-white p-12">
          <LoadingSpinner label="Requesting camera access…" />
        </div>
      )}

      {errorConfig && (
        <div className="w-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <errorConfig.icon size={32} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-700">{errorConfig.title}</p>
          <p className="text-xs text-gray-400 max-w-xs">{errorConfig.body}</p>
          {errorConfig.retry && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 mt-1 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          )}
        </div>
      )}

      {cameraState === 'ready' && (
        <button
          onClick={capture}
          disabled={disabled}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Camera size={16} />
          Capture Photo
        </button>
      )}
    </div>
  )
}
