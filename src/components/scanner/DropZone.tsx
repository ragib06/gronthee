import { useDropzone } from 'react-dropzone'
import { UploadCloud } from 'lucide-react'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export default function DropZone({ onFiles, disabled }: DropZoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 25 * 1024 * 1024,
    maxFiles: 4,
    disabled,
    onDrop: onFiles,
  })

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer ${
        isDragActive
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <UploadCloud size={32} className={isDragActive ? 'text-indigo-500' : 'text-gray-400'} />
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">
          {isDragActive ? 'Drop images here' : 'Drag & drop book images here'}
        </p>
        <p className="text-xs text-gray-400 mt-1">or click to select · JPEG, PNG, WEBP · max 25 MB · up to 4 images</p>
      </div>
    </div>
  )
}
