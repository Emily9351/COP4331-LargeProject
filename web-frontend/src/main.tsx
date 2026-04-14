import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { Login } from './pages/Login';
import { Registration } from './pages/Registration';
import { Dashboard } from './pages/Dashboard';
import { ProfessorDashboard } from './pages/ProfessorDashboard';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/registration" element={<PublicOnlyRoute><Registration /></PublicOnlyRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRole="student"><Dashboard /></ProtectedRoute>} />
        <Route path="/professor-dashboard" element={<ProtectedRoute allowedRole="professor"><ProfessorDashboard /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
        <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
