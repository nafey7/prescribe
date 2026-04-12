import { RouterProvider } from "react-router-dom";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import { PatientProvider } from "./contexts/PatientContext";
import { router } from "./router";

export default function App() {
  return (
    <FeatureFlagProvider>
      <PatientProvider>
        <RouterProvider router={router} />
      </PatientProvider>
    </FeatureFlagProvider>
  );
}
