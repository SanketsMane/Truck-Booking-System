import { Link } from "react-router-dom";
import { PageContainer, PageTitle, SectionTitle, Stack, Body } from "../components/ui/Layout";
import { Accordion, AccordionItem } from "../components/ui/Accordion";
import { JsonLd } from "../components/JsonLd";
import { usePageMeta } from "../hooks/usePageMeta";
import { useBranding } from "../context/BrandingContext";
import { FAQ_CATEGORIES } from "../content/faq";

const HelpFaqSchema = () => {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_CATEGORIES.flatMap((cat) =>
      cat.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      }))
    ),
  };
  return <JsonLd data={data} />;
};

export const Help = () => {
  const { platformName } = useBranding();
  usePageMeta({
    title: "Help center",
    description: `Answers to common questions about booking, payments, cancellations, and verification on ${platformName}.`,
  });

  return (
    <PageContainer>
      <HelpFaqSchema />
      <Stack $gap={6}>
        <Stack $gap={2}>
          <PageTitle>Help center</PageTitle>
          <Body>
            Search a route to find spare truck capacity, or post a trip if you're a transporter
            with space to sell. Answers to the most common questions are below.
          </Body>
        </Stack>

        {FAQ_CATEGORIES.map((cat) => (
          <Stack key={cat.category} $gap={2}>
            <SectionTitle>{cat.category}</SectionTitle>
            <Accordion>
              {cat.items.map((item) => (
                <AccordionItem key={item.id} id={item.id} question={item.question}>
                  <Body>{item.answer}</Body>
                </AccordionItem>
              ))}
            </Accordion>
          </Stack>
        ))}

        <Stack $gap={1}>
          <SectionTitle>Still stuck?</SectionTitle>
          <Body>
            Have an issue with a specific booking? Raise it from that booking's detail page. For
            anything else, reach our team directly through <Link to="/support">Support</Link>.
          </Body>
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default Help;
