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
          This page describes how {platformName} actually operates today, in plain language. It is
          published for transparency but has not yet received a final review by qualified legal
          counsel. If anything here is unclear, or you'd like more detail on your rights, reach out
          via <Link to="/support">Support</Link> before you rely on it.
        </LegalNotice>

        <Stack $gap={2}>
          <SectionTitle>1. About {platformName}</SectionTitle>
          <Body>
            {platformName} is a technology platform that connects shippers who need to move goods
            with transporters who have available capacity on trucks already travelling compatible
            routes. Unless expressly stated for a particular service, {platformName} does not itself
            own, operate, or drive any vehicle, take physical possession of goods, or provide cargo
            insurance merely because a shipment was arranged through the platform.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>2. Acceptance of these terms</SectionTitle>
          <Body>
            By creating an account, listing capacity, submitting a booking request, accepting a
            request, or otherwise using {platformName}, you agree to these Terms and to our{" "}
            <Link to="/privacy">Privacy Policy</Link>. If you don't agree, please don't use{" "}
            {platformName}.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>3. Eligibility & your account</SectionTitle>
          <Body>
            You must be at least 18 years old, hold a valid email address, and provide accurate,
            current account information to use the platform — and keep it updated when it changes.
            You must not impersonate another person or provide false or misleading information. You
            may hold a shipper role, a transporter role, or both, and can add the second role to an
            existing account at any time.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>4. Identity verification (KYC)</SectionTitle>
          <Body>
            Accounts are accessed by a one-time code sent to your email, or a password if you've set
            one — keep both secure, since they're how the app confirms it's really you. Certain
            actions (accepting bookings, publishing trips) require identity verification: we ask
            transporters and shippers to submit documents such as Aadhaar, PAN, a driving licence, or
            a business/GST certificate. Only checks {platformName} has actually completed are shown
            as "verified" — submitting a false document, or someone else's, is a violation of these
            terms and may result in account suspension.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>5. {platformName}'s role</SectionTitle>
          <Body>
            {platformName} provides the digital platform — discovery, matching, communication, and
            booking-request functionality. We are not automatically a carrier, transporter, freight
            forwarder, warehouse operator, insurer, consignee, or custodian of goods solely because
            the platform facilitated a connection. The physical transportation of goods is performed
            by the transporter selected for the shipment, subject to the terms agreed between the
            shipper and transporter and applicable law.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>6. Shipper responsibilities</SectionTitle>
          <Body>
            As a shipper, you're responsible for providing accurate information about your shipment —
            pickup and delivery locations, description, quantity, weight, and any special handling
            requirements. You must ensure your goods are legally permitted to be transported and that
            required invoices, permits, declarations, e-way bills, and other applicable documents are
            available. You're responsible for suitable packaging and for disclosing anything that
            could affect vehicle suitability, safety, or handling.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>7. Transporter responsibilities</SectionTitle>
          <Body>
            As a transporter, you're responsible for providing accurate vehicle, route,
            departure-date, and available-capacity information, and for ensuring the vehicle and
            driver used for a shipment meet applicable legal and operational requirements. You should
            list only genuinely available and suitable capacity, and after accepting a shipment,
            fulfil that commitment in line with the agreed terms — subject to permitted cancellation
            or circumstances beyond your reasonable control.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>8. Capacity listings & matching</SectionTitle>
          <Body>
            {platformName} uses route, date, shipment, vehicle, and capacity information to display
            or recommend potentially suitable options. A listing or suggested match does not by
            itself guarantee a shipment or create a confirmed booking — confirmation only happens
            through the booking flow described below. We may limit, remove, or correct listings that
            are inaccurate, unavailable, unsafe, or inconsistent with our policies.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>9. Booking, acceptance & rejection</SectionTitle>
          <Body>
            A booking request reserves capacity but isn't confirmed until the transporter accepts it,
            subject to available capacity on the truck. Transporters may accept or reject requests
            based on capacity, route, cargo type, timing, or other relevant requirements. A shipper
            should not assume a request is confirmed until the app shows it as confirmed. Requests
            left unanswered past their response window expire automatically, so you're never left
            waiting indefinitely.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>10. Pricing & payment</SectionTitle>
          <Body>
            {platformName} is a free platform — we don't charge a commission, a listing fee, or any
            platform fee to either side. Trip listings and price estimates are set by transporters
            and shown so shippers can compare options; the price shown is a reference, not an amount
            {" "}{platformName} collects, holds, or guarantees. Pricing may depend on the route, shipment
            weight, vehicle type, available capacity, pickup/drop requirements, timing, and the price
            the transporter has set.
          </Body>
          <Body>
            Once a booking is confirmed, payment — the amount, method (cash, UPI, bank transfer, or
            anything else you both agree on), and timing — is entirely between the shipper and the
            transporter. {platformName} does not process, hold, or guarantee any payment, and has no
            visibility into whether or how it was made.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>11. Pickup, loading & delivery</SectionTitle>
          <Body>
            The shipper and transporter should clarify pickup, loading, unloading, delivery, waiting
            time, and any special handling responsibilities before confirming the shipment.{" "}
            {platformName} may provide communication tools and platform records but does not take
            physical custody of goods merely because the booking was made through the app.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>12. Loss, theft, damage & insurance</SectionTitle>
          <Body>
            Before handing over a shipment, the shipper and transporter should directly discuss and
            confirm the applicable responsibility, insurance arrangements, and other shipment-specific
            terms. If the agreed terms don't work for either party, that party should not proceed
            with the shipment. {platformName} does not automatically provide cargo insurance and is
            not the carrier, custodian, or insurer of any shipment. A problem with a specific booking
            can be raised as a dispute directly from that booking, for our team to review; anything
            else can go through <Link to="/support">Support</Link>.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>13. Cancellations & no-shows</SectionTitle>
          <Body>
            Either party may cancel a confirmed booking up until the cancellation cutoff shown on
            that booking, after which cancellations are no longer permitted through the app. Cancel
            as early as reasonably possible if you can't proceed with a shipment or an accepted
            commitment — repeated, abusive, or last-minute cancellations may affect your account
            standing or, for transporters, show up in their rating.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>14. Prohibited & restricted goods</SectionTitle>
          <Body>
            You must not use {platformName} to arrange transportation of goods that are illegal,
            prohibited, improperly declared, or restricted under applicable law — including illegal
            drugs or substances, explosives, unlawful weapons, stolen or counterfeit goods, and
            unlawfully traded wildlife or environmental items. Goods requiring special permits,
            dangerous-goods handling, temperature control, specialised vehicles, or other regulatory
            controls may only be carried where all applicable requirements are satisfied. Transporters
            may refuse shipments where goods, documentation, or conditions are unsuitable or
            restricted.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>15. Documentation & legal compliance</SectionTitle>
          <Body>
            Shippers and transporters are each responsible for complying with applicable requirements
            relating to GST, invoices, e-way bills, vehicle documents, permits, declarations, and
            transportation of goods. {platformName} doesn't generate these documents on your behalf —
            each party is responsible for what it's legally required to provide.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>16. Disputes between users</SectionTitle>
          <Body>
            Shippers and transporters should first try to resolve shipment-specific issues directly,
            using the terms agreed for that shipment. Where appropriate, {platformName} may facilitate
            communication or provide relevant platform records — this doesn't make us a party to the
            underlying transportation contract, or automatically responsible for the underlying
            dispute. Nothing in these Terms removes any right or remedy that can't legally be
            excluded.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>17. Conduct & platform misuse</SectionTitle>
          <Body>
            You agree to use {platformName}'s chat, ratings, and booking tools honestly and
            respectfully. No fraud, false listings, fake bookings, false cargo declarations,
            manipulation of ratings, harassment, unauthorized access, or misuse of another user's
            information. We may remove content, restrict listings, or suspend accounts where we
            reasonably believe this section has been violated.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>18. Ratings & ability to communicate</SectionTitle>
          <Body>
            After a booking is completed, both sides can rate and review each other — this builds a
            track record that helps future shippers and transporters decide who to work with. Users
            may communicate directly for shipment-related matters and are responsible for evaluating
            whether proposed terms are suitable before proceeding; please don't share sensitive
            personal information unnecessarily, or use information obtained through{" "}
            {platformName} for unrelated purposes.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>19. Platform availability & third-party services</SectionTitle>
          <Body>
            We aim to keep {platformName} available and functional, but uninterrupted or error-free
            availability can't be guaranteed — we may carry out maintenance, updates, or security
            measures at any time. We may use third-party providers for hosting, communications,
            mapping, identity verification, or analytics; their involvement doesn't change the roles
            of the shipper and transporter in the underlying shipment unless we expressly state
            otherwise.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>20. Intellectual property</SectionTitle>
          <Body>
            {platformName}'s software, branding, logos, designs, and platform content are owned by or
            licensed to us unless otherwise stated. You may not copy, modify, reverse engineer,
            distribute, or commercially exploit our content or technology except as permitted by law
            or our written permission.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>21. Limitation of liability & indemnity</SectionTitle>
          <Body>
            To the maximum extent permitted by applicable law, {platformName}'s role is limited to
            providing the platform and services described here. We don't guarantee that a particular
            transporter, capacity listing, price, route, or shipment outcome will always be available
            or suitable, and we're not responsible for the condition of goods in transit, the conduct
            of other users, or losses arising from an arrangement between a shipper and a transporter.
            Nothing here is intended to exclude any liability that can't legally be excluded. To the
            extent permitted by law, you may be required to indemnify {platformName} against
            third-party claims arising from your unlawful conduct, fraud, material breach of these
            terms, inaccurate shipment information, or misuse of the platform.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>22. Suspension & termination</SectionTitle>
          <Body>
            You may stop using {platformName} at any time. We may restrict, suspend, or terminate
            accounts where permitted by law — for fraud, misuse, unlawful activity, safety concerns,
            false verification information, or material violation of these terms — subject to
            obligations that arose before termination.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>23. Changes to these terms</SectionTitle>
          <Body>
            We may update these terms and platform features as the product evolves. Material changes
            will be reflected on this page; continued use after an update constitutes acceptance
            where legally permitted.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>24. Governing law & dispute resolution</SectionTitle>
          <Body>
            These terms are governed by the laws of India, and any disputes are subject to the
            jurisdiction of the courts having authority over {platformName}'s place of business,
            without prejudice to any other rights available to you under applicable consumer
            protection law.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>25. Contact & grievance redressal</SectionTitle>
          <Body>
            Questions about these terms, or a concern that needs to be escalated? Reach out via{" "}
            <Link to="/support">Support</Link>. For loss, theft, damage, shortage, or non-delivery
            concerns, please contact the transporter directly first and refer to the terms you agreed
            before the shipment.
          </Body>
        </Stack>

        <Muted>Last updated: 17 August 2026</Muted>
      </Stack>
    </PageContainer>
  );
};

export default Terms;
