'use client'

import Image from 'next/image'
import { canOptimizeImage } from '@/lib/optimizableImage'
import type { TutorRef } from '@/types'

// Round tutor avatar with an initials fallback. Shared by FooterForm and
// FreeLessonModal — keep it here so the two forms can't drift apart.
export default function TutorAvatar({ tutor, size = 40 }: { tutor: TutorRef; size?: number }) {
  const initials = tutor.fullName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')

  if (tutor.imageUrl) {
    return (
      <Image
        src={tutor.imageUrl}
        alt={tutor.fullName}
        width={size}
        height={size}
        unoptimized={!canOptimizeImage(tutor.imageUrl)}
        className="rounded-full object-cover object-top shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-green flex items-center justify-center shrink-0 font-sans font-bold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}
