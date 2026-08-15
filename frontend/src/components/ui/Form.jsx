import { useId, isValidElement, cloneElement, Children } from "react";
import styled from "styled-components";

const fieldStyles = `
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--field-bg);
  border: 1px solid var(--field-border);
  color: var(--field-text);
  font-size: 15px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: var(--field-placeholder);
  }

  &:focus {
    border-color: var(--field-focus);
    outline: none;
    box-shadow: 0 0 0 3.5px var(--field-focus-ring);
  }
`;

export const Input = styled.input`
  ${fieldStyles}
`;

export const Textarea = styled.textarea`
  ${fieldStyles}
  resize: vertical;
  min-height: 90px;
`;

export const Select = styled.select`
  ${fieldStyles}
`;

export const FieldTokens = styled.div`
  --field-bg: ${({ theme }) => theme.color.surfaceRaised};
  --field-border: ${({ theme }) => theme.color.border};
  --field-text: ${({ theme }) => theme.color.text};
  --field-placeholder: ${({ theme }) => theme.color.textFaint};
  --field-focus: ${({ theme }) => theme.color.accent};
  --field-focus-ring: ${({ theme }) => theme.color.accentSoft};
`;

export const FieldGroup = styled(FieldTokens)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: ${({ theme }) => theme.space(4)};
`;

export const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
`;

export const ErrorText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.color.danger};
`;

export const HelpText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textFaint};
`;

// Associates the label with its control via id/htmlFor — screen readers
// (and clicking the label text) otherwise only see them as visually-adjacent
// text, not a labeled control. Composite children (e.g. an Input plus a
// <datalist>) are handled by associating just the first real element, which
// is always the actual control in this codebase's usage — later siblings
// (a <datalist>, help markup, etc.) are left untouched.
export const Field = ({ label, error, help, children }) => {
  const generatedId = useId();
  const [first, ...rest] = Children.toArray(children);
  const canAssociate = isValidElement(first);
  const controlId = canAssociate ? first.props.id || generatedId : undefined;
  const control = canAssociate ? [cloneElement(first, { id: controlId, key: "control" }), ...rest] : children;

  return (
    <FieldGroup>
      {label && <Label htmlFor={controlId}>{label}</Label>}
      {control}
      {error ? <ErrorText>{error}</ErrorText> : help ? <HelpText>{help}</HelpText> : null}
    </FieldGroup>
  );
};

export default Field;
