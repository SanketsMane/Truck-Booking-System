import { Outlet, useLocation } from "react-router-dom";
import styled from "styled-components";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileTabBar from "./MobileTabBar";
import ErrorBoundary from "../components/ErrorBoundary";
import OrganizationSchema from "../components/OrganizationSchema";

const PageShell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
`;

const Main = styled.main`
  flex: 1 0 auto;
`;

export const Layout = () => {
  const { pathname } = useLocation();

  return (
    <PageShell>
      <OrganizationSchema />
      <Navbar />
      <Main>
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </Main>
      <Footer />
      <MobileTabBar />
    </PageShell>
  );
};

export default Layout;
