import { RouterProvider } from "react-router-dom";
import { PatientProvider } from "./contexts/PatientContext";
import { router } from "./router";

export default function App() {
  return (
    <PatientProvider>
      <RouterProvider router={router} />
    </PatientProvider>
  );
}
