import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing";
import { SkipLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Invariant collects, uses, protects, and gives you control over your data.",
};

const sections: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: (
      <>
        <p>We collect only the information needed to provide and improve your practice experience. This can include:</p>
        <ul>
          <li><strong>Account information:</strong> your name, email address, and profile image supplied by Google when you choose to sign in.</li>
          <li><strong>Learning profile:</strong> goals, preferred programming language, interview timeline, topic confidence, and weekly availability.</li>
          <li><strong>Connected-platform data:</strong> usernames and publicly available practice activity from platforms you choose to connect.</li>
          <li><strong>Product activity:</strong> recommendations viewed, problems started or completed, skips, feedback, review history, and plan progress.</li>
          <li><strong>Technical information:</strong> session, browser, device, and diagnostic information required for security and reliability.</li>
        </ul>
        <p>We do not receive or store your Google password.</p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    content: (
      <>
        <p>We use your information to operate the service and make recommendations useful. In particular, we may use it to:</p>
        <ul>
          <li>authenticate your account and maintain secure sessions;</li>
          <li>build and update your daily practice queue;</li>
          <li>measure topic mastery, consistency, and review timing;</li>
          <li>sync activity from connected coding platforms;</li>
          <li>detect abuse, investigate errors, and improve reliability; and</li>
          <li>communicate service or security updates when necessary.</li>
        </ul>
        <p>We do not sell your personal information or use your private practice data to serve third-party advertising.</p>
      </>
    ),
  },
  {
    id: "recommendations",
    title: "Recommendation data",
    content: (
      <>
        <p>Invariant ranks practice problems using signals such as your stated goals, topic history, prior outcomes, review schedule, available time, and explicit feedback.</p>
        <p>Recommendations are learning guidance, not guarantees of interview results. You can skip or replace recommendations, update your goals, and disconnect imported platform data.</p>
      </>
    ),
  },
  {
    id: "sharing-and-processors",
    title: "Sharing and service providers",
    content: (
      <>
        <p>We may share limited information with service providers that help us host the application, store data, authenticate users, monitor errors, or deliver essential communications. They may process information only for the services they provide to us and under appropriate safeguards.</p>
        <p>We may also disclose information when required by law, to protect the safety or integrity of the service, or as part of a business transfer. We do not make your learning profile public unless you explicitly enable a public-sharing feature.</p>
      </>
    ),
  },
  {
    id: "retention-and-deletion",
    title: "Retention and deletion",
    content: (
      <>
        <p>We retain account and learning information while your account is active and only as long as reasonably needed for the purposes described here, including security, dispute resolution, and legal obligations.</p>
        <p>You can request deletion of your account and associated practice data from account settings. Backups may retain limited copies for a short period before routine deletion completes.</p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <>
        <p>We use reasonable administrative, technical, and organizational safeguards designed to protect your information. These include access controls, encrypted transport, secure session handling, and restricted production access.</p>
        <p>No online service can guarantee absolute security. Keep your Google account secure and notify us if you believe your Invariant account has been compromised.</p>
      </>
    ),
  },
  {
    id: "your-choices",
    title: "Your choices and rights",
    content: (
      <>
        <p>Depending on where you live, you may have rights to access, correct, export, restrict, object to, or delete personal information. Invariant also provides product controls to:</p>
        <ul>
          <li>edit your profile and recommendation preferences;</li>
          <li>connect or disconnect supported coding platforms;</li>
          <li>control future profile visibility features;</li>
          <li>export practice activity where available; and</li>
          <li>delete your account.</li>
        </ul>
      </>
    ),
  },
  {
    id: "children-and-changes",
    title: "Children and policy changes",
    content: (
      <>
        <p>Invariant is not directed to children under 13, or a higher minimum age where local law requires it. We do not knowingly collect personal information from children below the applicable minimum age.</p>
        <p>We may update this policy as the product or legal requirements change. We will update the effective date and provide additional notice when a change materially affects your rights.</p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>For privacy questions or requests, use the support contact available in your account settings. We may need to verify your identity before completing a data request.</p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SkipLink />
      <LegalPage
        eyebrow="Your data, your practice"
        title="Privacy Policy"
        summary="This policy explains what Invariant collects, why we use it, and the controls available to you. We designed the product around private-by-default learning data and inspectable recommendations."
        effectiveDate="6 August 2026"
        sections={sections}
      />
    </>
  );
}
