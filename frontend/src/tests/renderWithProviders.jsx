import { ThemeProvider } from "styled-components";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { theme } from "../theme/theme";

// Every styled-component in this app reads from ${({ theme }) => ...}, and
// several also use react-router (Link/useNavigate) — this is the minimal
// wrapper any of them need to render in a test without pulling in the real
// app shell (Layout, AuthProvider, etc).
export const renderWithProviders = (ui, { route = "/" } = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </MemoryRouter>
  );

export default renderWithProviders;
