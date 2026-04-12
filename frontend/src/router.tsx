import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import ChatPage from "./components/ChatPage";
import ProfileLegacyRedirect from "./components/ProfileLegacyRedirect";
import RouteErrorPage from "./components/RouteErrorPage";
import PatientLayout from "./layouts/PatientLayout";
import DashboardPage from "./pages/DashboardPage";
import DocumentsPage from "./pages/DocumentsPage";
import ProfilePage from "./pages/ProfilePage";

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/public/chat", element: <ChatPage /> },
      { path: "/dashboard", element: <Navigate to="/" replace /> },
      {
        path: "/",
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
