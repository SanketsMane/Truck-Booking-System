import styled from "styled-components";
import { Plus, X, ChevronUp, ChevronDown, MapPin } from "lucide-react";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { Button } from "./Button";
import { Stack, Muted } from "./Layout";

// The stops a driver actually passes through between pickup and drop.
// Shared by PostTrip and ManageTrip so both speak about a route the same
// way, and so the ordering rules only have to be right in one place.
//
// Order is the whole point, not decoration: the backend reads this list as
// the sequence the truck drives (tripController's tripLegPosition), which is
// what lets a shipper find a leg of a long run — and what stops that same
// truck matching the leg travelled backwards. So reordering has to be a
// first-class action here, not something a driver works around by deleting
// and re-adding.
export const MAX_TRIP_STOPS = 10;

const EMPTY_STOP = { address: "", lat: null, lng: null };

const List = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

const StopRow = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(2)};
`;

// The number carries the meaning "stop 1, then stop 2" — a plain bullet
// would lose exactly the thing that matters about this list.
const StopIndex = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  margin-top: 9px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accent};
  background: ${({ theme }) => theme.color.accentSoft};
`;

const StopBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const StopControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  border-radius: 6px;
  color: ${({ theme }) => theme.color.textMuted};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const AddRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  flex-wrap: wrap;
`;

export const TripStopsField = ({ stops = [], onChange, max = MAX_TRIP_STOPS }) => {
  const replaceAt = (index, next) => onChange(stops.map((stop, i) => (i === index ? next : stop)));

  const removeAt = (index) => onChange(stops.filter((_, i) => i !== index));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= stops.length) return;
    const next = [...stops];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <Stack $gap={2}>
      {stops.length > 0 && (
        <List>
          {stops.map((stop, index) => (
            // Index as key is normally a smell, but a stop has no id of its
            // own (tripModel stores them with _id: false) and the address is
            // empty for a stop the driver just added, so position is the
            // only stable handle there is. Reordering swaps the values
            // rather than the rows, so React re-rendering by position is
            // exactly right here.
            <StopRow key={index}>
              <StopIndex>{index + 1}</StopIndex>
              <StopBody>
                <LocationAutocomplete
                  placeholder="e.g. Pune — Hadapsar bypass"
                  value={stop}
                  onChange={(next) => replaceAt(index, next)}
                  showPreview={false}
                />
              </StopBody>
              <StopControls>
                <IconButton
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move stop ${index + 1} earlier`}
                >
                  <ChevronUp size={15} strokeWidth={2.4} />
                </IconButton>
                <IconButton
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === stops.length - 1}
                  aria-label={`Move stop ${index + 1} later`}
                >
                  <ChevronDown size={15} strokeWidth={2.4} />
                </IconButton>
                <IconButton type="button" onClick={() => removeAt(index)} aria-label={`Remove stop ${index + 1}`}>
                  <X size={15} strokeWidth={2.4} />
                </IconButton>
              </StopControls>
            </StopRow>
          ))}
        </List>
      )}

      <AddRow>
        <Button
          type="button"
          $variant="secondary"
          $size="sm"
          onClick={() => onChange([...stops, { ...EMPTY_STOP }])}
          disabled={stops.length >= max}
        >
          <Plus size={15} strokeWidth={2.4} />
          {stops.length === 0 ? "Add a stop" : "Add another stop"}
        </Button>
        <Muted style={{ margin: 0, fontSize: 13 }}>
          {stops.length >= max ? (
            `That's the maximum of ${max} stops.`
          ) : (
            <>
              <MapPin size={12} strokeWidth={2.4} style={{ verticalAlign: -1, marginRight: 4 }} />
              Optional — towns you pass through and can load or unload at. Shippers searching any leg of your route
              will find you.
            </>
          )}
        </Muted>
      </AddRow>
    </Stack>
  );
};

// Drops the blank rows a driver added but never filled in, and trims what's
// left. Called at submit time by both forms — an empty stop is an abandoned
// intention, not something to persist or to fail validation over.
export const cleanStops = (stops = []) =>
  stops
    .filter((stop) => stop?.address?.trim())
    .map((stop) => ({ ...stop, address: stop.address.trim() }));

export default TripStopsField;
