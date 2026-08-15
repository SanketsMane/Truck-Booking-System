import { Component } from "react";
import styled from "styled-components";
import { PageContainer } from "./ui/Layout";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

const Wrap = styled(PageContainer)`
  max-width: 480px;
  text-align: center;
  padding-top: 80px;
`;

const Title = styled.h2`
  font-size: 1.3rem;
  margin: 0 0 8px;
`;

const Message = styled.p`
  color: ${({ theme }) => theme.color.textMuted};
  margin: 0 0 20px;
`;

// A crash anywhere inside a page's render tree unmounts everything below the
// nearest boundary — without one, that's the whole app, blank, with no way
// back except a manual reload. Layout.jsx scopes this around just the routed
// page content, so the navbar/footer survive and the user has somewhere to go.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Wrap>
        <Card>
          <Title>Something went wrong</Title>
          <Message>
            This page hit an unexpected error. Try reloading, or head back to the home page.
          </Message>
          <Button onClick={() => window.location.assign("/")}>Go to home</Button>
        </Card>
      </Wrap>
    );
  }
}

export default ErrorBoundary;
