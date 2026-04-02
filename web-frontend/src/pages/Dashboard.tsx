import { useNavigate, Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import "../css/Dashboard.css"

export function Dashboard() {
    const navigate = useNavigate();

    const handleLogout = () => {
      navigate("/");
    }

return (
  <div className="dashboard-page">
    <div className="overlay">

      {/* Navigation Bar */}
      <nav className="dashboard-navbar">
        <div className="dashboard-brand">
        <div className="logo" />
        <div>
            <p className="name">TaskMaster</p>
            <p className="subtitle">Student Dashboard</p>
        </div>
        </div>

        <div className="button" onClick={handleLogout}>
          Logout
        </div>
      </nav>

      {/* Cards Grid */}
      <div className="cards-grid">

        {/* House Card */}
        <div className="card house-card">
          <h2>Weekly Progress Adventure</h2>
          <div className="subtitle">
            Complete tasks to add balloons! Resets every Sunday.
          </div>
        </div>

        {/* Badge Card */}
        <div className="card badge-card">
          <h2>Badges</h2>
          <div className="subtitle">
            Earn badges by completing tasks each week!
          </div>
        </div>

      </div>


      {/* Stats Overview */}
      <div className="stats-grid">

        {/* Total Classes */}
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-row">
              <div>
                <p className="stat-label">Total Classes</p>
                <p className="stat-value">NEEDS INFO</p>
              </div>
              <div className="stat-icon-box blue">
                NEEDS INFO
              </div>
            </div>
          </div>
        </div>

          {/* Student Groups */}
          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-row">
                <div>
                  <p className="stat-label">Student Groups</p>
                  <p className="stat-value">NEEDS INFO</p>
                </div>
                <div className="stat-icon-box purple">
                  NEEDS INFO
                </div>
              </div>
            </div>
          </div>

          {/* Total Tasks */}
          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-row">
                <div>
                  <p className="stat-label">Total Tasks</p>
                  <p className="stat-value">
                    NEEDS INFO
                  </p>
                </div>
                <div className="stat-icon-box green">
                  NEEDS INFO
                </div>
              </div>
            </div>
          </div>
                    
          {/* Completed */}
          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-row">
                <div>
                  <p className="stat-label">Completed</p>
                  <p className="stat-value">
                    NEEDS INFO
                  </p>
                </div>
                <div className="stat-icon-box orange">
                  NEEDS INFO
                </div>
              </div>
            </div>
          </div>
        </div>
        
    </div>
  </div>
);
}