import LandingNav from "@/components/landing/landing-nav"
import LandingHero from "@/components/landing/landing-hero"
import LandingTrust from "@/components/landing/landing-trust"
import LandingFeatures from "@/components/landing/landing-features"
import LandingDeepDives from "@/components/landing/landing-deep-dives"
import LandingHowItWorks from "@/components/landing/landing-how-it-works"
import LandingSecurity from "@/components/landing/landing-security"
import LandingFAQ from "@/components/landing/landing-faq"
import LandingCTA from "@/components/landing/landing-cta"
import LandingAnimations from "@/components/landing/landing-animations"
import LandingFooter from "@/components/landing/landing-footer"

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <LandingHero />
      <LandingTrust />
      <LandingFeatures />
      <LandingDeepDives />
      <LandingHowItWorks />
      <LandingSecurity />
      <LandingFAQ />
      <LandingCTA />
      <LandingAnimations />
      <LandingFooter />
    </>
  )
}
