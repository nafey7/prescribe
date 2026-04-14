import { createBrowserRouter, Navigate } from "react-router-dom";
import ProfileLegacyRedirect from "./components/ProfileLegacyRedirect";
import RouteErrorPage from "./components/RouteErrorPage";
import DoctorLayout from "./layouts/DoctorLayout";
import PatientLayout from "./layouts/PatientLayout";
import RootLayout from "./layouts/RootLayout";
import DashboardPage from "./pages/DashboardPage";
import DoctorChatPage from "./pages/doctor/DoctorChatPage";
import DoctorConnectionsPage from "./pages/doctor/DoctorConnectionsPage";
import DoctorDashboardPage from "./pages/doctor/DoctorDashboardPage";
import DoctorPatientDetailPage from "./pages/doctor/DoctorPatientDetailPage";
import DoctorPatientDocumentsPage from "./pages/doctor/DoctorPatientDocumentsPage";
import DoctorPatientListPage from "./pages/doctor/DoctorPatientListPage";
import DoctorPrescriptionsPage from "./pages/doctor/DoctorPrescriptionsPage";
import DoctorProfilePage from "./pages/doctor/DoctorProfilePage";
import DocumentsPage from "./pages/DocumentsPage";
import ProfilePage from "./pages/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "public/chat", element: <Navigate to="/doctor" replace /> },
      { path: "dashboard", element: <Navigate to="/" replace /> },
      {
        path: "doctor",
        element: <DoctorLayout />,
        children: [
          { index: true, element: <DoctorDashboardPage /> },
          { path: "profile", element: <DoctorProfilePage /> },
          { path: "patients", element: <DoctorPatientListPage /> },
          {
            path: "patients/:patientId/documents",
            element: <DoctorPatientDocumentsPage />,
          },
          { path: "patients/:patientId/chat", element: <DoctorChatPage /> },
          {
            path: "patients/:patientId/prescriptions",
            element: <DoctorPrescriptionsPage />,
          },
          {
            path: "patients/:patientId",
            element: <DoctorPatientDetailPage />,
          },
          { path: "connections", element: <DoctorConnectionsPage /> },
        ],
      },
      {
        element: <PatientLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "profile/:userId", element: <ProfileLegacyRedirect /> },
          { path: "documents", element: <DocumentsPage /> },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
