import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing";
import { SkipLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern access to and use of Invariant.",
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance and eligibility",
    content: (
      <>
        <p>These Terms govern your access to and use of Invariant. By creating an account or using the service, you agree to these Terms and the Privacy Policy.</p>
        <p>You must be legally able to enter into these Terms and meet the minimum age required in your location. If you use Invariant for an organization, you confirm that you are authorized to accept these Terms for that organization.</p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and access",
    content: (
      <>
        <p>You are responsible for maintaining the security of the Google account used to access Invariant and for activity conducted through your account. Account information must be accurate and kept current.</p>
        <p>Do not share access, impersonate another person, create accounts through automated means, or attempt to bypass account or onboarding requirements. Notify us if you suspect unauthorized use.</p>
      </>
    ),
  },
  {
    id: "service",
    title: "The service",
    content: (
      <>
        <p>Invariant provides practice planning, problem recommendations, progress tracking, and supported platform integrations. Features may evolve, enter beta, or be discontinued as we improve the product.</p>
        <p>We aim to keep the service reliable but do not guarantee uninterrupted availability, permanent access to any third-party problem, or compatibility with every external coding platform.</p>
      </>
    ),
  },
  {
    id: "recommendations",
    title: "Learning recommendations",
    content: (
      <>
        <p>Recommendations are generated from the information available to Invariant and are intended as educational guidance. They do not guarantee interview outcomes, employment, rankings, ratings, or mastery.</p>
        <p>You remain responsible for choosing which problems to attempt and for assessing whether a recommendation is appropriate for your goals and circumstances.</p>
      </>
    ),
  },
  {
    id: "external-platforms",
    title: "External platforms and content",
    content: (
      <>
        <p>Invariant may link to or import permitted data from third-party coding platforms. Those services are governed by their own terms and privacy practices. We are not responsible for their availability, content, changes, or account actions.</p>
        <p>You must use connected platforms in accordance with their rules. Invariant does not grant rights to copy, republish, or misuse third-party problem statements or solutions.</p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>You may not use Invariant to:</p>
        <ul>
          <li>break the law or infringe another person&apos;s rights;</li>
          <li>probe, disrupt, overload, or circumvent the service or its security controls;</li>
          <li>scrape or extract the service at scale without written permission;</li>
          <li>introduce malware or harmful code;</li>
          <li>misrepresent practice activity or manipulate recommendation signals; or</li>
          <li>resell, sublicense, or exploit the service beyond its intended personal use.</li>
        </ul>
      </>
    ),
  },
  {
    id: "ownership",
    title: "Ownership and your content",
    content: (
      <>
        <p>Invariant and its licensors retain rights in the service, brand, interface, software, and original content. These Terms provide a limited, personal, revocable, non-exclusive right to use the service.</p>
        <p>You retain rights in information and content you submit. You grant us the limited permission needed to host, process, and display it to operate and improve the service for you.</p>
      </>
    ),
  },
  {
    id: "suspension-and-termination",
    title: "Suspension and termination",
    content: (
      <>
        <p>You may stop using Invariant and delete your account at any time. We may limit or suspend access when reasonably necessary to protect users, investigate abuse, comply with law, or address a material breach of these Terms.</p>
        <p>Where practical, we will provide notice and an opportunity to resolve the issue. Provisions that logically should survive termination—including ownership, disclaimers, and limitations—will remain in effect.</p>
      </>
    ),
  },
  {
    id: "disclaimers-and-liability",
    title: "Disclaimers and liability",
    content: (
      <>
        <p>The service is provided on an “as available” basis to the extent permitted by law. We disclaim implied warranties that cannot reasonably apply to an evolving online learning tool.</p>
        <p>To the extent permitted by law, Invariant will not be liable for indirect, incidental, special, consequential, or punitive damages, lost opportunities, or loss arising from third-party platforms. Some jurisdictions do not allow certain limitations, so they may not apply to you.</p>
      </>
    ),
  },
  {
    id: "changes-and-contact",
    title: "Changes and contact",
    content: (
      <>
        <p>We may update these Terms as the service changes. We will revise the effective date and provide additional notice for material changes. Continuing to use the service after an update takes effect means you accept the revised Terms.</p>
        <p>For questions about these Terms, use the support contact available in account settings.</p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <SkipLink />
      <LegalPage
        eyebrow="Clear expectations"
        title="Terms of Service"
        summary="These terms explain the rules for using Invariant, including account responsibilities, recommendation limits, connected platforms, and acceptable use."
        effectiveDate="6 August 2026"
        sections={sections}
      />
    </>
  );
}
