import styled from "styled-components";
import { Link } from "react-router-dom";
import { PageContainer, PageTitle, SectionTitle, Stack, Muted } from "../components/ui/Layout";

// Placeholder-content warning banner — same treatment on Privacy.jsx, kept
// local to each file rather than shared since it's the only place it's used.
const Notice = styled.div`
  border: 1px solid ${({ theme }) => theme.color.warning};
  background: ${({ theme }) => theme.color.warningSoft};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.text};
  font-size: 14px;
  line-height: 1.5;
`;

export const Terms = () => (
  <PageContainer>
    <Stack $gap={5}>
      <PageTitle>Terms of Service</PageTitle>

      <Notice>
        <strong>This is placeholder MVP content</strong> — it is not real legal text and has not
        been reviewed by a lawyer. Replace this page with terms reviewed by qualified legal
        counsel before taking ShareTruck to a real launch.
      </Notice>

      <Stack $gap={2}>
        <SectionTitle>1. Acceptance of these terms</SectionTitle>
        <Muted>
          By creating a ShareTruck account or using the app to search, post, or book truck
          capacity, you agree to these Terms of Service and to our{" "}
          <Link to="/privacy">Privacy Policy</Link>. If you don't agree, please don't use
          ShareTruck.
        </Muted>
      </Stack>

      <Stack $gap={2}>
        <SectionTitle>2. Who can use ShareTruck</SectionTitle>
        <Muted>
          ShareTruck is a marketplace connecting shippers with spare capacity needs and
          transporters with spare capacity to sell. You must be at least 18 years old, hold a
          valid Indian mobile number, and provide accurate account information to use the
          platform. You may hold a shipper role, a transporter role, or both.
        </Muted>
      </Stack>

      <Stack $gap={2}>
        <SectionTitle>3. Account, OTP login, and verification (KYC)</SectionTitle>
        <Muted>
          Accounts are accessed via one-time password sent to your mobile number — keep that
          number secure, since it's your login identity. Certain actions (accepting bookings,
          publishing trips) require identity verification: we ask transporters and shippers to
          submit documents such as Aadhaar, PAN, a driving licence, or a business/GST
          certificate. Submitting a false or someone else's document is a violation of these
          terms and may result in account suspension.
        </Muted>
      </Stack>

      <Stack $gap={2}>
        <SectionTitle>4. Bookings, pricing, and capacity</SectionTitle>
        <Muted>
          Trip listings and price estimates are set by transporters. A booking request reserves
          capacity but isn't confirmed until the transporter accepts it, subject to available
          capacity on the truck. Requests left unanswered past their response window expire
          automatically. ShareTruck facilitates the connection between shippers and
          transporters — it is not a party to the actual carriage of goods.
        </Muted>
      </Stack>

      <Stack $gap={2}>
        <SectionTitle>5. Cancellations</SectionTitle>
        <Muted>
          Either party may cancel a confirmed booking up until the cancellation cutoff shown on
          the booking, after which cancellations are no longer permitted through the app. Repeat
          or late cancellations may affect your account standing.
        </Muted>
      </Stack>

      <Stack $gap={2}>
        <SectionTitle>6. Conduct</SectionTitle>
        <Muted>
          You agree to use ShareTruck's chat, ratings, and booking tools honestly and
          respectfully, and not to use the platform to arrange transport of prohibited or
          illegal goods. We may suspend or ban accounts that violate this section or abuse the
          platform.
        </Muted>
      </Stack>

      <Stack $gap={2}>
        <SectionTitle>7. Limitation of liability</SectionTitle>
        <Muted>
          ShareTruck provides the marketplace platform "as is." We are not responsible for the
          condition of goods in transit, the conduct of other users, or losses arising from a
          booking arrangement between a shipper and a transporter. Disputes between users should
          first be raised through <Link to="/support">Support</Link>.
        </Muted>
      </Stack>

      <Stack $gap={2}>
        <SectionTitle>8. Termination</SectionTitle>
        <Muted>
          You may stop using ShareTruck at any time. We may suspend or terminate accounts that
          violate these terms, provide false verification documents, or pose a risk to other
          users.
        </Muted>
      </Stack>

      <Stack $gap={2}>
        <SectionTitle>9. Changes to these terms</SectionTitle>
        <Muted>
          We may update these terms as the product evolves. Material changes will be reflected
          on this page.
        </Muted>
      </Stack>

      <Stack $gap={2}>
        <SectionTitle>10. Contact us</SectionTitle>
        <Muted>
          Questions about these terms? Reach out via <Link to="/support">Support</Link>.
        </Muted>
      </Stack>

      <Muted>Last updated: placeholder — set this when the page is replaced with reviewed legal text.</Muted>
    </Stack>
  </PageContainer>
);

export default Terms;
