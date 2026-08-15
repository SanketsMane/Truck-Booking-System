import { Link } from "react-router-dom";
import { PageContainer, PageTitle, Muted } from "../components/ui/Layout";
import { Button } from "../components/ui/Button";

export const NotFound = () => (
  <PageContainer style={{ textAlign: "center", paddingTop: 80 }}>
    <PageTitle>Page not found</PageTitle>
    <Muted style={{ margin: "8px auto 24px", maxWidth: "40ch" }}>
      The page you're looking for doesn't exist, or the link may be out of date.
    </Muted>
    <Button as={Link} to="/">
      Go to home
    </Button>
  </PageContainer>
);

export default NotFound;
