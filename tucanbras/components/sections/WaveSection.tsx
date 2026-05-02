import { WavesAnimated } from '@/components/ui/WavesAnimated'

export default function WaveSection() {
  return (
    <section
      aria-hidden="true"
      style={{
        marginLeft:  'calc(-1 * var(--page-x))',
        marginRight: 'calc(-1 * var(--page-x))',
        background:  'var(--color-yellow)',
        overflow:    'visible',
      }}
    >
      <WavesAnimated />
    </section>
  )
}
