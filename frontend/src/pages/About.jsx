import { PageContainer, PageTitle, Muted } from "../components/ui/Layout";

export const About = () => (
  <PageContainer>
    <PageTitle>About ShareTruck</PageTitle>
    <Muted>
      ShareTruck connects shippers moving partial loads with transporters who have spare
      capacity on a truck already running that route — instead of booking a full dedicated
      truck. Launching in Delhi-NCR, built to scale to any Indian route.
    </Muted>
  </PageContainer>
);

export default About;
