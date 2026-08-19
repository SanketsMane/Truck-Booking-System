import { ThemeProvider } from "styled-components";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import theme from "./theme/theme";
import GlobalStyle from "./theme/GlobalStyle";
import { AuthProvider } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { ScrollManager } from "./components/ScrollManager";
import Routing from "./routing/Routing";

const App = () => (
  <BrandingProvider>
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AuthProvider>
        <ToastContainer position="top-right" autoClose={3000} theme="light" />
        <ScrollManager />
        <Routing />
      </AuthProvider>
    </ThemeProvider>
  </BrandingProvider>
);

export default App;
