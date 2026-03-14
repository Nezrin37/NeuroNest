import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./routes/ProtectedRoute";
import ModuleRouteGuard from "./routes/ModuleRouteGuard";
import { ModuleConfigProvider } from "./context/ModuleConfigContext";
import { ThemeProvider } from "./context/ThemeContext";
import SessionManager from "./components/SessionManager";

import PatientLayout from "./layouts/PatientLayout";
import AdminLayout from "./layouts/AdminLayout";
import DoctorLayout from "./layouts/doctor/DoctorLayout";
import Forbidden from "./pages/Forbidden";
import NotFound from "./pages/NotFound";
import VideoConsultation from "./pages/shared/VideoConsultation";
import PatientHub from "./pages/doctor/PatientHub";
import {
  getModuleChildRouteForRole,
  getModuleComponentForRole,
  moduleRegistry,
} from "./modules/moduleRegistry";

const renderRoleRoutes = (role) => {
  const modules = moduleRegistry.filter((moduleConfig) =>
    moduleConfig.rolesAllowed.includes(role),
  );

  return modules
    .map((moduleConfig) => {
      const ModuleComponent = getModuleComponentForRole(moduleConfig, role);
      if (!ModuleComponent) return null;

      return (
        <Route
          key={`${role}-${moduleConfig.key}`}
          path={getModuleChildRouteForRole(moduleConfig, role)}
          element={
            <ModuleRouteGuard moduleConfig={moduleConfig} role={role}>
              <ModuleComponent />
            </ModuleRouteGuard>
          }
        />
      );
    })
    .filter(Boolean);
};

export default function App() {
  return (
    <ModuleConfigProvider>
      <ThemeProvider>
        <BrowserRouter>
          <SessionManager />
          <Routes>
            {/* Default */}
            <Route path="/" element={<Navigate to="/login" />} />

            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/403" element={<Forbidden />} />
            <Route path="/404" element={<NotFound />} />

            {/* ================= PATIENT ================= */}
            <Route
              path="/patient"
              element={
                <ProtectedRoute allowedRoles={["patient"]}>
                  <PatientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              {renderRoleRoutes("patient")}
            </Route>

            {/* ================= DOCTOR ================= */}
            <Route
              path="/doctor"
              element={
                <ProtectedRoute allowedRoles={["doctor"]}>
                  <DoctorLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="patient-hub" element={<PatientHub />} />
              {renderRoleRoutes("doctor")}
            </Route>

            {/* ================= ADMIN ================= */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              {renderRoleRoutes("admin")}
            </Route>


            <Route 
              path="/consultation/:roomId" 
              element={
                <ProtectedRoute allowedRoles={["patient", "doctor"]}>
                  <VideoConsultation />
                </ProtectedRoute>
              } 
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ModuleConfigProvider>
  );
}
