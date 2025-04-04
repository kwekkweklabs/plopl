import { BrowserRouter, Route, Routes } from "react-router";
import RootProvider from "./providers/RootProvider";
import IndexLayout from "./layouts/IndexLayout";
import IndexPage from "./pages/IndexPage";

export default function App() {
  return (
    <RootProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexLayout />}>
            <Route index element={<IndexPage />} />

            {/* Define another route or layout here */}
            {/* <Route path="dashboard" element={<LazyDashboardLayoutRoute />}>
            <Route index element={<LazyDashboardPageRoute />} />
            </Route> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </RootProvider>
  );
}
