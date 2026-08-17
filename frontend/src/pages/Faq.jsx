import { Link } from "react-router-dom";
import { PageContainer, PageTitle, SectionTitle, Stack, Body } from "../components/ui/Layout";
import { Accordion, AccordionItem } from "../components/ui/Accordion";
import { JsonLd } from "../components/JsonLd";
import { usePageMeta } from "../hooks/usePageMeta";
import { useBranding } from "../context/BrandingContext";
import { FAQ_CATEGORIES } from "../content/faq";

const FaqSchema = () => {
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

export const Faq = () => {
  const { platformName } = useBranding();
  usePageMeta({
    title: "Frequently Asked Questions",
    description: `Answers for shippers and transporters — booking, pricing, insurance, documentation, cancellations and verification on ${platformName}.`,
  });

  return (
    <PageContainer>
      <FaqSchema />
      <Stack $gap={6}>
        <Stack $gap={2}>
          <PageTitle>Frequently Asked Questions</PageTitle>
          <Body>Answers to the most common questions from shippers and transporters using {platformName}.</Body>
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
          <SectionTitle>Still have questions?</SectionTitle>
          <Body>
            Have an issue with a specific booking? Raise it from that booking's detail page. For
            anything else, reach our team directly through <Link to="/support">Support</Link>.
          </Body>
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default Faq;
