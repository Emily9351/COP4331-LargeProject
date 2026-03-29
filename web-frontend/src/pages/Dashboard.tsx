import { useNavigate, Link } from "react-router-dom";
import "../css/Dashboard.css"

export function Dashboard() {
    const navigate = useNavigate();

return (
  <div className="dashboard-page">
    <div className="overlay">
        
      <nav className="dashboard-navbar">
        <div className="dashboard-brand">
        <div className="logo" />
        <div>
            <p className="name">TaskMaster</p>
            <p className="subtitle">Student Dashboard</p>
        </div>
        </div>
      </nav>
    </div>
  </div>
);
}