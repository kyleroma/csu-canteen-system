import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Stalls from "./pages/student/Stalls";
import StallMenu from "./pages/student/StallMenu";
import Checkout from "./pages/student/Checkout";
import Orders from "./pages/student/Orders";
import VendorDashboard from "./pages/vendor/Dashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedRoute allow={["STUDENT"]}>
                <Stalls />
              </ProtectedRoute>
            }
          />

          <Route
            path="/stalls/:id"
            element={
              <ProtectedRoute allow={["STUDENT"]}>
                <StallMenu />
              </ProtectedRoute>
            }
          />

          <Route
            path="/stalls/:id/checkout"
            element={
              <ProtectedRoute allow={["STUDENT"]}>
                <Checkout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute allow={["STUDENT"]}>
                <Orders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendor"
            element={
              <ProtectedRoute allow={["VENDOR"]}>
                <VendorDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
