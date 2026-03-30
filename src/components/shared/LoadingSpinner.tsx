import { motion } from 'motion/react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }

export default function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className={`${sizes[size]} rounded-full border-2 border-gray-200 border-t-indigo-600`}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}
