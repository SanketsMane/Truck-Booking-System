import { PageContainer, PageTitle, SectionTitle, Stack, Body, Muted } from "../components/ui/Layout";
import { LegalNotice } from "../components/ui/LegalNotice";
import { usePageMeta } from "../hooks/usePageMeta";
import { useBranding } from "../context/BrandingContext";

// Verbatim from "TruckGee — Privacy Policy, Draft for Legal Review" — do not
// paraphrase or add sections beyond what that source document contains.
// {platformName} substitutes for the document's literal "TruckGee" so the
// rendered text still follows the admin-configurable branding every other
// page uses; it never changes the actual wording of a clause.
export const Privacy = () => {
  const { platformName } = useBranding();
  usePageMeta({
    title: "Privacy Policy",
    description: `How ${platformName} collects, uses, and protects your account, verification, and booking data.`,
  });

  return (
    <PageContainer>
      <Stack $gap={5}>
        <PageTitle>Privacy Policy</PageTitle>

        <LegalNotice>
          <strong>Draft for legal review.</strong> This document should be finalized by an Indian
          lawyer and aligned with {platformName}'s actual operating model, registered entity,
          technology, services and applicable law before public launch.
        </LegalNotice>

        <Stack $gap={2}>
          <SectionTitle>1. Information We May Collect</SectionTitle>
          <Body>
            Account information such as name, phone number and email; pickup and delivery
            information; shipment details; transporter and vehicle information; documents where
            verification is offered; booking and communication records; and technical/device
            information necessary to operate and secure the platform.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>2. How We Use Information</SectionTitle>
          <Body>
            To create and manage accounts; match shipments with available capacity; facilitate
            booking requests; communicate with users; provide support; prevent fraud and misuse;
            improve platform performance; maintain records; comply with legal obligations; and
            protect users and the platform.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>3. Sharing of Information</SectionTitle>
          <Body>
            Relevant information may be shared with the other party to a shipment where necessary to
            facilitate the requested transaction, with service providers supporting the platform, and
            with authorities where required by law. {platformName} should not disclose more
            information than reasonably necessary for the relevant purpose.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>4. Location Information</SectionTitle>
          <Body>
            Where location features are used, location information may be processed to support
            pickup/drop matching, route discovery, mapping, safety or platform functionality. The
            final policy should specify whether location is collected continuously or only when a
            user actively uses a location feature.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>5. Communications</SectionTitle>
          <Body>
            {platformName} may send service-related communications such as booking updates, account
            notices, security alerts and support messages. Marketing communications, where used,
            should follow applicable consent and opt-out requirements.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>6. Data Security</SectionTitle>
          <Body>
            {platformName} will use reasonable technical and organisational measures appropriate to
            the information and risks involved. No internet system can be guaranteed to be completely
            secure.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>7. Data Retention</SectionTitle>
          <Body>
            Information should be retained only for as long as reasonably necessary for the stated
            purposes, contractual records, dispute handling, fraud prevention, legal obligations and
            legitimate business requirements.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>8. User Choices & Rights</SectionTitle>
          <Body>
            Users may have rights to access, correct, delete, withdraw certain consents or raise
            complaints, subject to applicable law and legitimate retention requirements.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>9. Children</SectionTitle>
          <Body>
            The platform should not knowingly be used by persons who are legally unable to enter the
            applicable agreement. The final policy should specify the relevant age and consent rules
            after legal review.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>10. Contact</SectionTitle>
          <Body>Publish {platformName}'s official privacy/contact channel and grievance details in the final version.</Body>
        </Stack>

        <Muted>Your Load. Their Empty Space.</Muted>
      </Stack>
    </PageContainer>
  );
};

export default Privacy;
