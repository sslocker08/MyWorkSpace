import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Flip } from 'gsap/Flip'
import { CustomEase } from 'gsap/CustomEase'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip, CustomEase)
  ScrollTrigger.config({ ignoreMobileResize: true })
}

export { gsap, ScrollTrigger, SplitText, Flip, CustomEase }
