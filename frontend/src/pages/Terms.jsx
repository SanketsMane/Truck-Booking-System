import { PageContainer, PageTitle, SectionTitle, Stack, Body, Muted } from "../components/ui/Layout";
import { LegalNotice } from "../components/ui/LegalNotice";
import { usePageMeta } from "../hooks/usePageMeta";
import { useBranding } from "../context/BrandingContext";

// Verbatim from "TruckGee — Terms & Conditions, Consolidated Draft" — do not
// paraphrase or add sections beyond what that source document contains.
// {platformName} substitutes for the document's literal "TruckGee" so the
// rendered text still follows the admin-configurable branding every other
// page uses; it never changes the actual wording of a clause.
export const Terms = () => {
  const { platformName } = useBranding();
  usePageMeta({
    title: "Terms of Service",
    description: `The terms that govern using ${platformName} to search, post, or book spare truck capacity across India.`,
  });

  return (
    <PageContainer>
      <Stack $gap={5}>
        <PageTitle>Terms & Conditions</PageTitle>

        <LegalNotice>
          <strong>This is a business/product draft and must be reviewed and finalized by an Indian
          lawyer before launch.</strong> The final terms must match {platformName}'s actual operating
          model, registered entity, contracts, applicable laws and services. No wording is intended to
          exclude liability that cannot legally be excluded.
        </LegalNotice>

        <Stack $gap={2}>
          <SectionTitle>1. About {platformName}</SectionTitle>
          <Body>
            {platformName} is a technology platform that facilitates connections between shippers who
            need to move goods and transporters who may have available capacity on trucks travelling
            compatible routes.
          </Body>
          <Body>
            Unless expressly stated for a particular service, {platformName} does not itself own,
            operate or drive the vehicle, take physical possession or custody of the goods, or provide
            cargo insurance merely because a shipment is arranged through the platform.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>2. Acceptance of Terms</SectionTitle>
          <Body>
            By accessing the platform, creating an account, listing capacity, submitting a shipment
            request, accepting a request or otherwise using {platformName}, the user agrees to these
            Terms and applicable {platformName} policies.
          </Body>
          <Body>If the user does not agree to these Terms, the user should not use the platform.</Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>3. User Accounts & Information</SectionTitle>
          <Body>Users must provide accurate, complete and current information and must update it when it changes.</Body>
          <Body>Users must not impersonate another person or provide false, misleading or fraudulent information.</Body>
          <Body>
            {platformName} may restrict, suspend or terminate access where permitted by law if it
            reasonably believes an account is involved in fraud, misuse, unlawful activity, safety
            concerns, false information or material violation of these Terms.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>4. {platformName}'s Role</SectionTitle>
          <Body>
            {platformName} provides the digital platform, discovery, matching, communication and
            booking-request functionality described on the platform.
          </Body>
          <Body>
            {platformName} is not automatically a carrier, transporter, freight forwarder, warehouse
            operator, insurer, consignee or custodian of goods solely because the platform facilitates
            a connection.
          </Body>
          <Body>
            The physical transportation of goods is performed by the transporter selected for the
            shipment, subject to the terms agreed between the relevant parties and applicable law.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>5. Shipper Responsibilities</SectionTitle>
          <Body>
            The shipper is responsible for providing accurate information about the shipment,
            including pickup and delivery locations, commodity description, quantity, weight,
            dimensions, value where relevant, timing and special handling requirements.
          </Body>
          <Body>
            The shipper must ensure that the goods are legally permitted to be transported and that
            required invoices, permits, declarations, e-way bills and other applicable documents are
            available.
          </Body>
          <Body>
            The shipper is responsible for suitable packaging and for disclosing information that
            could affect vehicle suitability, safety or handling.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>6. Transporter Responsibilities</SectionTitle>
          <Body>
            The transporter is responsible for providing accurate vehicle, route, departure-date and
            available-capacity information.
          </Body>
          <Body>
            The transporter is responsible for ensuring that the vehicle and driver used for a
            shipment meet applicable legal and operational requirements.
          </Body>
          <Body>
            After accepting a shipment, the transporter should fulfil the accepted commitment in
            accordance with the agreed shipment terms, subject to permitted cancellation or
            circumstances beyond the transporter's reasonable control.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>7. Capacity Listings & Matching</SectionTitle>
          <Body>Transporters should list only genuinely available and suitable capacity.</Body>
          <Body>
            {platformName} may use route, date, shipment, vehicle and capacity information to display
            or recommend potentially suitable options.
          </Body>
          <Body>
            A listing or suggested match does not by itself guarantee a shipment or create a confirmed
            booking. Confirmation occurs only through the applicable booking/request flow.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>8. Booking, Acceptance & Rejection</SectionTitle>
          <Body>Transporters may accept or reject shipment requests in accordance with the platform flow.</Body>
          <Body>
            A shipper should not assume that a request is confirmed until the platform indicates
            confirmation according to the applicable process.
          </Body>
          <Body>
            {platformName} may limit, remove or correct listings that are inaccurate, unavailable,
            unsafe or inconsistent with platform policies.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>9. Pricing & Commercial Terms</SectionTitle>
          <Body>
            Pricing may depend on route, weight, volume, vehicle type, available capacity, pickup/drop
            requirements, timing and the commercial terms offered by the transporter.
          </Body>
          <Body>
            Unless expressly stated, {platformName} does not guarantee that a displayed price is the
            lowest price available elsewhere.
          </Body>
          <Body>Any taxes, tolls, handling charges or other applicable charges should be clarified for the shipment.</Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>10. Pickup, Loading, Unloading & Delivery</SectionTitle>
          <Body>
            The shipper and transporter should clarify pickup, loading, unloading, delivery, waiting
            time and any special handling responsibilities before confirming the shipment.
          </Body>
          <Body>
            {platformName} may provide communication and platform records but does not take physical
            custody of goods merely because the booking was made through {platformName}.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>11. Loss, Theft, Damage & Insurance Policy</SectionTitle>
          <Body>
            Before sending a shipment, the shipper and transporter should directly discuss and confirm
            the applicable responsibility, insurance arrangements and other shipment-specific terms.
          </Body>
          <Body>If the agreed terms do not work for either party, that party should not proceed with the shipment.</Body>
          <Body>
            Any insurance requirement or coverage should be discussed and confirmed between the
            shipper and transporter before the goods are handed over.
          </Body>
          <Body>
            {platformName} does not automatically provide cargo insurance unless a specific service
            expressly states otherwise.
          </Body>
          <Body>
            Claims concerning loss, theft, damage, shortage or non-delivery should be raised through
            the applicable process and handled according to the shipment terms, evidence, applicable
            law and the responsibilities of the relevant parties.
          </Body>
          <Body>
            {platformName} may facilitate communication or provide relevant platform records where
            appropriate, but such assistance does not by itself make {platformName} the carrier,
            custodian or insurer.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>12. Cancellation & No-Show Policy</SectionTitle>
          <Body>
            Cancellation rights, charges and consequences are governed by the applicable booking flow,
            cancellation terms and shipment-specific terms.
          </Body>
          <Body>
            Shippers and transporters should cancel as early as reasonably possible if they cannot
            proceed with a shipment or accepted commitment.
          </Body>
          <Body>
            Repeated, abusive or last-minute cancellations may affect platform reputation, access or
            other consequences under the applicable policy, subject to law.
          </Body>
          <Body>
            Where online payments or refunds are introduced in the future, the applicable
            payment/refund rules should be displayed before the feature goes live.
          </Body>
          <Body>
            Exceptional events outside a party's reasonable control may be treated differently,
            subject to applicable law and the shipment terms.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>13. Prohibited & Restricted Goods Policy</SectionTitle>
          <Body>
            Users must not use {platformName} to arrange transportation of goods that are illegal,
            prohibited, improperly declared or restricted under applicable law or {platformName}
            policy.
          </Body>
          <Body>
            Prohibited categories may include illegal drugs or substances, explosives, unlawful
            weapons or weapons-related goods, stolen goods, counterfeit goods, unlawfully traded
            wildlife/environmental items and other goods prohibited by applicable law.
          </Body>
          <Body>
            Goods requiring special permits, dangerous-goods handling, temperature control,
            specialised vehicles, special packaging, insurance or other regulatory controls may only
            be accepted where all applicable requirements are satisfied.
          </Body>
          <Body>Shippers must accurately declare the nature, quantity, weight, dimensions and relevant characteristics of goods.</Body>
          <Body>
            {platformName} may remove listings, refuse requests, restrict accounts or cooperate with
            lawful authorities where prohibited, unsafe, fraudulent or unlawful activity is suspected.
          </Body>
          <Body>
            Transporters may refuse shipments where goods, documentation, packaging, capacity or other
            conditions are unsuitable or legally restricted.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>14. Documentation & Legal Compliance</SectionTitle>
          <Body>
            Shippers and transporters are responsible for complying with applicable requirements
            relating to GST, invoices, e-way bills, vehicle documents, permits, declarations,
            packaging and transportation of goods.
          </Body>
          <Body>Each party is responsible for documents and information that it is legally required to provide.</Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>15. Disputes Between Users</SectionTitle>
          <Body>
            Shippers and transporters should first try to resolve shipment-specific issues directly
            using the terms agreed for the shipment.
          </Body>
          <Body>
            Where appropriate, {platformName} may facilitate communication or provide relevant
            platform records. Such assistance does not make {platformName} a party to the underlying
            transportation contract or automatically make {platformName} responsible for the
            underlying dispute.
          </Body>
          <Body>Nothing in these Terms removes any rights or remedies that cannot legally be excluded.</Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>16. Platform Misuse & Fraud</SectionTitle>
          <Body>
            Users must not use {platformName} for fraud, unlawful activity, fake bookings, false cargo
            declarations, manipulation of ratings, unauthorised access, harassment, or activity that
            could harm other users or the platform.
          </Body>
          <Body>
            {platformName} may take appropriate action, including removing content, restricting
            listings or suspending accounts, where permitted by law.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>17. User Communications</SectionTitle>
          <Body>
            Users may communicate directly with one another for shipment-related matters. Users are
            responsible for evaluating whether the proposed shipment terms are suitable before
            proceeding.
          </Body>
          <Body>
            Users should not share sensitive personal information unnecessarily or use information
            obtained through {platformName} for unrelated purposes or harassment.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>18. Platform Availability</SectionTitle>
          <Body>
            {platformName} will aim to keep the platform available and functional, but uninterrupted
            or error-free availability cannot be guaranteed.
          </Body>
          <Body>{platformName} may carry out maintenance, updates, security measures or changes to platform features.</Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>19. Third-Party Services</SectionTitle>
          <Body>
            {platformName} may use third-party technology or service providers for hosting,
            communications, maps, identity verification, analytics or other platform functions. Their
            involvement does not change the roles of the shipper and transporter in the underlying
            shipment unless expressly stated.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>20. Intellectual Property</SectionTitle>
          <Body>
            {platformName}'s software, branding, logos, designs, text and platform content are owned
            by or licensed to {platformName} unless otherwise stated.
          </Body>
          <Body>
            Users may not copy, reproduce, modify, reverse engineer, distribute or commercially
            exploit {platformName} content or technology except as permitted by law or written
            permission.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>21. Limitation of Platform Role</SectionTitle>
          <Body>
            To the maximum extent permitted by applicable law, {platformName}'s role is limited to
            providing the platform and services expressly described on the platform.
          </Body>
          <Body>
            {platformName} does not guarantee that a particular transporter, capacity listing, price,
            route, delivery time or shipment outcome will always be available or suitable.
          </Body>
          <Body>
            Any limitation, exclusion or allocation of liability must be interpreted subject to
            applicable law and must not exclude liability that cannot legally be excluded.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>22. Indemnity</SectionTitle>
          <Body>
            To the extent permitted by applicable law, a user may be required to indemnify and hold
            harmless {platformName} and its personnel from third-party claims, losses or costs arising
            from the user's unlawful conduct, fraud, material breach of these Terms, inaccurate
            shipment information or misuse of the platform.
          </Body>
          <Body>The final scope and enforceability of this clause should be reviewed by legal counsel.</Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>23. Suspension & Termination</SectionTitle>
          <Body>
            {platformName} may suspend or terminate access where permitted by law for material breach,
            fraud, safety concerns, unlawful use, repeated misuse or other legitimate
            platform-protection reasons.
          </Body>
          <Body>Users may stop using the platform at any time, subject to obligations that arose before termination.</Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>24. Changes to Platform or Terms</SectionTitle>
          <Body>{platformName} may update platform features and policies from time to time.</Body>
          <Body>
            Material changes to these Terms should be communicated in accordance with applicable law.
            Continued use after an effective update may constitute acceptance where legally permitted.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>25. Governing Law & Dispute Resolution</SectionTitle>
          <Body>
            The final version should specify governing law and courts or dispute-resolution mechanisms
            after review by Indian legal counsel and based on {platformName}'s actual registered
            entity, place of business and operating structure.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>26. Contact & Grievance Support</SectionTitle>
          <Body>
            {platformName} should publish an official support/contact channel for account, booking,
            safety and platform-related concerns.
          </Body>
          <Body>
            For loss, theft, damage, shortage, non-delivery or insurance matters, users should contact
            the transporter directly first and refer to the terms agreed before shipment.
          </Body>
          <Body>
            The final Terms should include the legally required grievance/contact details, registered
            entity information and other notices applicable to the business.
          </Body>
        </Stack>

        <Muted>Consolidated draft. Final legal drafting and review is required before public launch.</Muted>
      </Stack>
    </PageContainer>
  );
};

export default Terms;
