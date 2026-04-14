import { RouterProvider } from "react-router-dom";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import { router } from "./router";

export default function App() {
  return (
    <FeatureFlagProvider>
      <RouterProvider router={router} />
    </FeatureFlagProvider>
  );
}
