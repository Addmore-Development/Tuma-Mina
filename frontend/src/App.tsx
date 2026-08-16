import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SupervisorDashboard from "./Supervisor/supervisorDashboard";
import CustomerDashboard from "./Customer/customerDashboard";
import RunnerDashboard from "./Runner/runnerDashboard";
import AdminDashboard from "./Admin/adminDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<SupervisorDashboard />} />
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/runner" element={<RunnerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}