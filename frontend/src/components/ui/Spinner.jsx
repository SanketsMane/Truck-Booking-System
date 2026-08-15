import TruckLoader from "./TruckLoader";

// Every "loading" moment in the app used a generic ring spinner; it now
// renders the truck-on-a-road loader instead, so the same $size call sites
// (unchanged across ~30 pages) get the app's truck motif for free.
export const Spinner = (props) => <TruckLoader {...props} />;

export default Spinner;
