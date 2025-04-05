import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import RootProvider from "./providers/RootProvider";
import IndexLayout from "./layouts/IndexLayout";
import IndexPage from "./pages/IndexPage";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./layouts/DashboardLayout";
import HomePage from "./pages/dashboard/HomePage";
import ExplorePage from "./pages/dashboard/ExplorePage";
import DashboardProvider from "./providers/DashboardProvider";
import CreateSchemaPage from "./pages/dashboard/CreateSchemaPage";
import AuthProvider, { ProtectedRoute, useAuth } from "./providers/AuthProvider";
import ExperimentPage from "./pages/dashboard/ExperimentPage";

// Component to handle root path redirection based on auth status
function RootRedirect() {
  const { authenticated } = useAuth();
  return authenticated ? <Navigate to="/dashboard/home" replace /> : <IndexPage />;
}

export default function App() {
  return (
    <RootProvider>
      <BrowserRouter>
        <AuthProvider>
          <DashboardProvider>
            <Routes>
              <Route path="/" element={<IndexLayout />}>
                <Route index element={<RootRedirect />} />
                <Route path="login" element={<LoginPage />} />
              </Route>

              {/* Dashboard routes with protection */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard/home" replace />} />
                <Route path="home" element={<HomePage />} />
                <Route path="explore" element={<ExplorePage />} />
                <Route path="create-schema" element={<CreateSchemaPage />} />
                <Route path="experiment" element={<ExperimentPage />} />
              </Route>
            </Routes>
          </DashboardProvider>
        </AuthProvider>
      </BrowserRouter>
    </RootProvider>
  );
}
