import { getClassMap } from '@molecule/app-ui'

import HeroCopy from '../components/HeroCopy.js'
import HeroCtaButtons from '../components/HeroCtaButtons.js'
import HeroSocialProof from '../components/HeroSocialProof.js'
import ModelViewport from '../components/ModelViewport.js'
function HeroSection() {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.sp('px', 6),
        cm.flex({ direction: 'col', align: 'center', gap: 16 }),
        'md:px-8 lg:flex-row mb-32',
      )}
    >
      <div className={cm.cn(cm.w('full'), cm.flex({ direction: 'col', gap: 8 }), 'lg:w-5/12')}>
        <HeroCopy />
        <HeroCtaButtons />
        <HeroSocialProof />
      </div>
      <ModelViewport />
    </section>
  )
}
export default HeroSection
export { HeroSection }
