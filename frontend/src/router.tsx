import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from "react-router-dom";
import ChatPage from "./components/ChatPage";
import ProfileLegacyRedirect from "./components/ProfileLegacyRedirect";
import RouteErrorPage from "./components/RouteErrorPage";
import DoctorLayout from "./layouts/DoctorLayout";
import PatientLayout from "./layouts/PatientLayout";
import ProtectedAppShell from "./layouts/ProtectedAppShell";
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
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import PatientDoctorsPage from "./pages/patient/PatientDoctorsPage";
import PatientMealPlanDetailPage from "./pages/patient/PatientMealPlanDetailPage";
import PatientMealPlansPage from "./pages/patient/PatientMealPlansPage";
import ProfilePage from "./pages/ProfilePage";
import SignupPage from "./pages/SignupPage";
import { paths } from "./router/paths";

export const appRouteTree: RouteObject[] = [
  {
    path: paths.root,
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      // Reserve the admin namespace for a future portal; redirect to root for now.
      { path: "admin", element: <Navigate to={paths.root} replace /> },
      { path: "admin/*", element: <Navigate to={paths.root} replace /> },
      {
        element: <ProtectedAppShell />,
        children: [
          // Legacy redirects — kept indefinitely so bookmarks resolve in one hop.
          {
            path: "home",
            element: <Navigate to={paths.patient.root} replace />,
          },
          {
            path: "profile",
            element: <Navigate to={paths.patient.profile} replace />,
          },
          {
            path: "documents",
            element: <Navigate to={paths.patient.documents} replace />,
          },
          {
            path: "dashboard",
            element: <Navigate to={paths.patient.root} replace />,
          },
          {
            path: "public/chat",
            element: <Navigate to={paths.patient.chat} replace />,
          },
          // Legacy `/profile/:userId` — picker-sync redirect kept reachable.
          {
            element: <PatientLayout />,
            children: [
              { path: "profile/:userId", element: <ProfileLegacyRedirect /> },
            ],
          },
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
            path: "patient",
            element: <PatientLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "profile/:userId", element: <ProfileLegacyRedirect /> },
              { path: "documents", element: <DocumentsPage /> },
              { path: "doctors", element: <PatientDoctorsPage /> },
              { path: "meal-plans", element: <PatientMealPlansPage /> },
              { path: "meal-plans/:shareId", element: <PatientMealPlanDetailPage /> },
              { path: "chat", element: <ChatPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <Navigate to={paths.root} replace /> },
    ],
  },
];

export const router = createBrowserRouter(appRouteTree);
