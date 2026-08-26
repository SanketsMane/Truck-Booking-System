import { Stack } from "expo-router";
import { PostTripProvider } from "../../../../src/context/PostTripContext";

export default function PostTripLayout() {
  return (
    <PostTripProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PostTripProvider>
  );
}
