import { Link } from "react-router-dom";
import { PageContainer, PageTitle, Muted, Stack } from "../components/ui/Layout";

export const Help = () => (
  <PageContainer>
    <PageTitle>Help</PageTitle>
    <Stack $gap={4}>
      <Muted>
        Search a route to find spare truck capacity, or post a trip if you're a transporter
        with space to sell.
      </Muted>
      <Muted>
        Have an issue with a specific booking? Raise it from that booking's detail page, or
        visit <Link to="/support">Support</Link>.
      </Muted>
    </Stack>
  </PageContainer>
);

export default Help;
