import { BrowserRouter, Route, Routes } from "react-router-dom";
import RootProvider from "./providers/RootProvider";
import IndexLayout from "./layouts/IndexLayout";
import IndexPage from "./pages/IndexPage";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./layouts/DashboardLayout";
import HomePage from "./pages/dashboard/HomePage";
import ExplorePage from "./pages/dashboard/ExplorePage";
import DashboardProvider from "./providers/DashboardProvider";
import CreateSchemaPage from "./pages/dashboard/CreateSchemaPage";
import AuthProvider, { ProtectedRoute } from "./providers/AuthProvider";

export default function App() {
  return (
    <RootProvider>
      <BrowserRouter>
        <AuthProvider>
          <DashboardProvider>
            <Routes>
              <Route path="/" element={<IndexLayout />}>
                <Route index element={<IndexPage />} />
                <Route path="login" element={<LoginPage />} />
              </Route>

              {/* <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}> */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route path="home" element={<HomePage />} />
                <Route path="explore" element={<ExplorePage />} />
                <Route path="create-schema" element={<CreateSchemaPage />} />
              </Route>
            </Routes>
          </DashboardProvider>
        </AuthProvider>
      </BrowserRouter>
    </RootProvider>
  );
}
