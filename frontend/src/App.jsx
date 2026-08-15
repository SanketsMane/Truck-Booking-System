import { ThemeProvider } from "styled-components";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import theme from "./theme/theme";
import GlobalStyle from "./theme/GlobalStyle";
import { AuthProvider } from "./context/AuthContext";
import Routing from "./routing/Routing";

const App = () => (
  <ThemeProvider theme={theme}>
    <GlobalStyle />
    <AuthProvider>
      <ToastContainer position="top-right" autoClose={3000} theme="light" />
      <Routing />
    </AuthProvider>
  </ThemeProvider>
);

export default App;
