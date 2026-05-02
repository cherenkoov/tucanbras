import { WavesAnimated } from '@/components/ui/WavesAnimated'

export default function WaveSection() {
  return (
    <section
      aria-hidden="true"
      style={{
        paddingBottom: 'calc(100vw * 0.1)', /* 10% of viewport width, based on wave aspect ratio */
        paddingTop: 'calc(100vw * 0.1)', /* 10% of viewport width, based on wave aspect ratio */        
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
