import { Link } from "react-router-dom";
import { PageContainer, PageTitle, SectionTitle, Stack, Body, Muted } from "../components/ui/Layout";
import { LegalNotice } from "../components/ui/LegalNotice";
import { usePageMeta } from "../hooks/usePageMeta";
import { useBranding } from "../context/BrandingContext";

export const Terms = () => {
  const { platformName } = useBranding();
  usePageMeta({
    title: "Terms of Service",
    description: `The terms that govern using ${platformName} to search, post, or book spare truck capacity across India.`,
  });

  return (
    <PageContainer>
      <Stack $gap={5}>
        <PageTitle>Terms of Service</PageTitle>

        <LegalNotice>
          <strong>This is placeholder MVP content</strong> — it is not real legal text and has not
          been reviewed by a lawyer. Replace this page with terms reviewed by qualified legal
          counsel before taking {platformName} to a real launch.
        </LegalNotice>

        <Stack $gap={2}>
          <SectionTitle>1. Acceptance of these terms</SectionTitle>
          <Body>
            By creating a {platformName} account or using the app to search, post, or book truck
            capacity, you agree to these Terms of Service and to our{" "}
            <Link to="/privacy">Privacy Policy</Link>. If you don't agree, please don't use{" "}
            {platformName}.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>2. Who can use {platformName}</SectionTitle>
          <Body>
            {platformName} is a marketplace connecting shippers with spare capacity needs and
            transporters with spare capacity to sell. You must be at least 18 years old, hold a
            valid email address, and provide accurate account information to use the platform.
            You may hold a shipper role, a transporter role, or both, and can add the second role
            to an existing account at any time.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>3. Account, login, and verification (KYC)</SectionTitle>
          <Body>
            Accounts are accessed by a one-time code sent to your email, or a password if you've
            set one — keep both secure, since they're how the app confirms it's really you.
            Certain actions (accepting bookings, publishing trips) require identity verification:
            we ask transporters and shippers to submit documents such as Aadhaar, PAN, a driving
            licence, or a business/GST certificate. Submitting a false or someone else's document
            is a violation of these terms and may result in account suspension.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>4. Bookings and pricing</SectionTitle>
          <Body>
            {platformName} is a free platform that connects shippers with a partial load to
            transporters with spare capacity on the same route — we don't charge a commission, a
            listing fee, or any platform fee to either side, and we are not a party to the actual
            carriage of goods.
          </Body>
          <Body>
            Trip listings and price estimates are set by transporters, shown so shippers can
            compare options before booking — the price shown is a reference, not an amount{" "}
            {platformName} collects, holds, or guarantees. A booking request reserves capacity but
            isn't confirmed until the transporter accepts it, subject to available capacity on the
            truck. Requests left unanswered past their response window expire automatically.
          </Body>
          <Body>
            Once a booking is confirmed, payment — the amount, method (cash, UPI, bank transfer,
            or anything else you both agree on), and timing — is entirely between the shipper and
            the transporter. {platformName} does not process, hold, or guarantee any payment, and
            has no visibility into whether or how it was made.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>5. Cancellations</SectionTitle>
          <Body>
            Either party may cancel a confirmed booking up until the cancellation cutoff shown on
            the booking, after which cancellations are no longer permitted through the app. Repeat
            or late cancellations may affect your account standing.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>6. Conduct</SectionTitle>
          <Body>
            You agree to use {platformName}'s chat, ratings, and booking tools honestly and
            respectfully, and not to use the platform to arrange transport of prohibited or
            illegal goods. We may suspend or ban accounts that violate this section or abuse the
            platform.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>7. Disputes and limitation of liability</SectionTitle>
          <Body>
            {platformName} provides the marketplace platform "as is." We are not responsible for
            the condition of goods in transit, the conduct of other users, or losses arising from
            a booking arrangement between a shipper and a transporter. A problem with a specific
            booking can be raised as a dispute directly from that booking for our team to review;
            anything else can go through <Link to="/support">Support</Link>.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>8. Termination</SectionTitle>
          <Body>
            You may stop using {platformName} at any time. We may suspend or terminate accounts
            that violate these terms, provide false verification documents, or pose a risk to
            other users.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>9. Changes to these terms</SectionTitle>
          <Body>
            We may update these terms as the product evolves. Material changes will be reflected
            on this page.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>10. Contact us</SectionTitle>
          <Body>
            Questions about these terms? Reach out via <Link to="/support">Support</Link>.
          </Body>
        </Stack>

        <Muted>Last updated: placeholder — set this when the page is replaced with reviewed legal text.</Muted>
      </Stack>
    </PageContainer>
  );
};

export default Terms;
