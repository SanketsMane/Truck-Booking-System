import styled from "styled-components";
import { Input, Select } from "./Form";

const Row = styled.div`
  display: flex;
  gap: 8px;
`;

const AmountInput = styled(Input)`
  flex: 1;
  min-width: 0;
`;

const UnitSelect = styled(Select)`
  width: auto;
  flex-shrink: 0;
`;

// Pairs a numeric amount input with a tons/kg unit select — used everywhere
// a truck-capacity or shipment-weight value is entered, driven by
// useUnitAmount (which does the actual kg<->ton conversion; this component
// is purely the input+select layout). minTons/maxTons are always expressed
// in tons, since that's the canonical backend unit — this component
// rescales them to whichever unit is currently selected for the native
// input's own min/max.
//
// Accepts and forwards `id` so it composes with Layout/Form's <Field>,
// which associates its label via cloneElement(firstChild, {id}) — without
// this, the label would target the wrapper div instead of the real input.
export const UnitAmountInput = ({
  id,
  value,
  unit,
  onValueChange,
  onUnitChange,
  minTons = 0,
  maxTons,
  placeholder,
  autoFocus,
  ...inputProps
}) => {
  const scale = unit === "kg" ? 1000 : 1;
  return (
    <Row>
      <AmountInput
        id={id}
        type="number"
        min={minTons * scale}
        max={maxTons != null ? maxTons * scale : undefined}
        step="any"
        placeholder={placeholder}
        value={value}
        onChange={onValueChange}
        autoFocus={autoFocus}
        {...inputProps}
      />
      <UnitSelect value={unit} onChange={onUnitChange} aria-label="Unit">
        <option value="t">Tons</option>
        <option value="kg">Kg</option>
      </UnitSelect>
    </Row>
  );
};

export default UnitAmountInput;
