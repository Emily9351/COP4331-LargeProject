import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { BookOpen, Users, LogOut, Clock, Award } from "lucide-react";
import "../css/Dashboard.css";

// --- Types ---
interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
}

interface Class {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}

interface StudentGroup {
  id: string;
  name: string;
  members: number;
  color: string;
  tasks: Task[];
}

interface BadgeType {
  id: string;
  name: string;
  icon: string;
  description: string;
  tasksRequired: number;
  weekEarned?: string;
}

// --- Badge definitions ---
const availableBadges: BadgeType[] = [
  { id: "starter",  icon: "⭐", name: "Starter",  description: "Complete your first task!",   tasksRequired: 1  },
  { id: "achiever", icon: "🔥", name: "Achiever", description: "Complete 5 tasks in a week!",  tasksRequired: 5  },
  { id: "champion", icon: "🏆", name: "Champion", description: "Complete 10 tasks in a week!", tasksRequired: 10 },
  { id: "legend",   icon: "💎", name: "Legend",   description: "Complete 20 tasks in a week!", tasksRequired: 20 },
];

// --- Mock data ---
const initialClasses: Class[] = [
  {
    id: "1",
    name: "Mobile Development",
    color: "#3b82f6",
    tasks: [
      { id: "t1", title: "Build React Native app",    completed: false, dueDate: "2026-04-05" },
      { id: "t2", title: "Implement authentication",  completed: true,  dueDate: "2026-03-30" },
      { id: "t3", title: "Add push notifications",    completed: false, dueDate: "2026-04-10" },
    ],
  },
  {
    id: "2",
    name: "Web Development",
    color: "#a855f7",
    tasks: [
      { id: "t4", title: "Create responsive layout",  completed: false, dueDate: "2026-04-02" },
      { id: "t5", title: "Setup React Router",        completed: true,  dueDate: "2026-03-28" },
      { id: "t6", title: "Implement API integration", completed: false, dueDate: "2026-04-08" },
    ],
  },
  {
    id: "3",
    name: "Database Design",
    color: "#22c55e",
    tasks: [
      { id: "t7", title: "Design ER diagram",  completed: true,  dueDate: "2026-03-25" },
      { id: "t8", title: "Normalize tables",   completed: false, dueDate: "2026-04-01" },
    ],
  },
];

const initialGroups: StudentGroup[] = [
  {
    id: "g1",
    name: "Team Alpha",
    members: 4,
    color: "#f97316",
    tasks: [
      { id: "gt1", title: "Project proposal presentation", completed: true,  dueDate: "2026-03-27" },
      { id: "gt2", title: "Design mockups",                completed: false, dueDate: "2026-04-05" },
      { id: "gt3", title: "Final report submission",       completed: false, dueDate: "2026-04-15" },
    ],
  },
  {
    id: "g2",
    name: "Team Beta",
    members: 5,
    color: "#ec4899",
    tasks: [
      { id: "gt4", title: "Research phase completion", completed: true,  dueDate: "2026-03-20" },
      { id: "gt5", title: "Prototype development",     completed: false, dueDate: "2026-04-07" },
    ],
  },
  {
    id: "g3",
    name: "Team Gamma",
    members: 3,
    color: "#14b8a6",
    tasks: [
      { id: "gt6", title: "Literature review", completed: false, dueDate: "2026-04-03" },
      { id: "gt7", title: "Testing plan",      completed: false, dueDate: "2026-04-12" },
    ],
  },
];

// --- Helper ---
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

// --- Sub-components ---

function TaskItem({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <div className="task-item" onClick={onToggle}>
      <input
        type="checkbox"
        className="task-checkbox"
        checked={task.completed}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="task-info">
        <span className={`task-title ${task.completed ? "task-completed" : ""}`}>
          {task.title}
        </span>
        <span className="task-due">Due: {task.dueDate}</span>
      </div>
    </div>
  );
}

function ClassCard({
  cls,
  onToggleTask,
  onAddTask,
}: {
  cls: Class;
  onToggleTask: (taskId: string) => void;
  onAddTask: () => void;
}) {
  const completed = cls.tasks.filter((t) => t.completed).length;
  return (
    <div className="content-card">
      <div className="content-card-header" style={{ borderLeft: `4px solid ${cls.color}` }}>
        <div>
          <h3 className="content-card-title">{cls.name}</h3>
          <span className="content-card-meta">{completed}/{cls.tasks.length} tasks complete</span>
        </div>
        <button className="add-task-btn" onClick={onAddTask} title="Add task">+</button>
      </div>
      <div className="task-list">
        {cls.tasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={() => onToggleTask(task.id)} />
        ))}
      </div>
    </div>
  );
}

function GroupCard({
  group,
  onToggleTask,
  onAddTask,
}: {
  group: StudentGroup;
  onToggleTask: (taskId: string) => void;
  onAddTask: () => void;
}) {
  const completed = group.tasks.filter((t) => t.completed).length;
  return (
    <div className="content-card">
      <div className="content-card-header" style={{ borderLeft: `4px solid ${group.color}` }}>
        <div>
          <h3 className="content-card-title">{group.name}</h3>
          <span className="content-card-meta">
            {group.members} members · {completed}/{group.tasks.length} tasks complete
          </span>
        </div>
        <button className="add-task-btn" onClick={onAddTask} title="Add task">+</button>
      </div>
      <div className="task-list">
        {group.tasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={() => onToggleTask(task.id)} />
        ))}
      </div>
    </div>
  );
}

function AddTaskModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (title: string, dueDate: string) => void;
}) {
  const [title, setTitle]     = useState("");
  const [dueDate, setDueDate] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), dueDate);
    setTitle("");
    setDueDate("");
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add New Task</h3>
        <input
          className="modal-input"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
        />
        <input
          className="modal-input"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <div className="modal-actions">
          <button className="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" onClick={handleSubmit}>Add Task</button>
        </div>
      </div>
    </div>
  );
}

function HouseWithBalloons({ count }: { count: number }) {
  const balloons = Array.from({ length: Math.min(count, 20) });
  return (
    <div className="house-scene">
      <div className="balloon-cluster">
        {balloons.map((_, i) => (
          <div
            key={i}
            className="balloon"
            style={{
              backgroundColor: `hsl(${(i * 47) % 360}, 70%, 60%)`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <div className="house-emoji">🏠</div>
      <p className="balloon-count-label">🎈 {count} balloon{count !== 1 ? "s" : ""} this week</p>
    </div>
  );
}

// --- Scout Badge Sash ---
function BadgeSash({
  earnedBadges,
  currentWeekTasks,
}: {
  earnedBadges: BadgeType[];
  currentWeekTasks: number;
}) {
  const earned    = availableBadges.filter((b) => earnedBadges.some((e) => e.id === b.id));
  const nextBadge = availableBadges.find((b) => !earnedBadges.some((e) => e.id === b.id));
  const progPct   = nextBadge
    ? Math.min(100, Math.round((currentWeekTasks / nextBadge.tasksRequired) * 100))
    : 100;

  return (
    <div className="sash-root">

      {/* Progress box */}
      <div className="sash-progress-box">
        <div className="sash-progress-top">
          <span className="sash-progress-title">This week's progress</span>
          <span className="sash-progress-count">
            {currentWeekTasks}
            <span className="sash-balloon-icon">🎈</span>
          </span>
        </div>
        <p className="sash-progress-sub">
          {nextBadge
            ? `Next badge: ${nextBadge.name} — ${currentWeekTasks}/${nextBadge.tasksRequired}`
            : "All badges earned!"}
        </p>
        <div className="sash-bar-track">
          <div className="sash-bar-fill" style={{ width: `${progPct}%` }} />
        </div>
      </div>

      {/* Scout sash body */}
      <div className="sash-body">
        <div className="sash-tab sash-tab--left">
          <div className="sash-pip" /><div className="sash-pip" /><div className="sash-pip" />
        </div>
        <div className="sash-tab sash-tab--right">
          <div className="sash-pip" /><div className="sash-pip" /><div className="sash-pip" />
        </div>
        <div className="sash-rivet sash-rivet--tl" />
        <div className="sash-rivet sash-rivet--tr" />
        <div className="sash-rivet sash-rivet--bl" />
        <div className="sash-rivet sash-rivet--br" />

        <p className="sash-title">Wilderness Explorer Sash</p>
        <p className="sash-earned-label">
          {earned.length} {earned.length === 1 ? "badge" : "badges"} earned
        </p>

        {earned.length === 0 ? (
          <div className="sash-empty">
            <div className="sash-empty-icon">🎯</div>
            <p className="sash-empty-msg">Complete tasks to earn your first badge!</p>
            <p className="sash-empty-sub">
              Start your adventure by completing {availableBadges[0].tasksRequired} tasks this week
            </p>
          </div>
        ) : (
          <div className="sash-earned-grid">
            {earned.map((b) => (
              <div key={b.id} className="sash-earned-badge">
                <span className="sash-badge-icon">{b.icon}</span>
                <span className="sash-badge-name">{b.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available badges */}
      <div className="sash-available">
        <p className="sash-available-title">Available Badges</p>
        <div className="sash-available-grid">
          {availableBadges.map((b) => {
            const unlocked = earnedBadges.some((e) => e.id === b.id);
            return (
              <div
                key={b.id}
                className={`sash-avail-badge${unlocked ? " sash-avail-badge--unlocked" : ""}`}
                title={b.description}
              >
                <span className="sash-avail-icon">{b.icon}</span>
                <span className="sash-avail-name">{b.name}</span>
                <span className="sash-avail-req">{b.tasksRequired} tasks</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// --- Main Dashboard ---
export function Dashboard() {
  // const navigate = useNavigate();
  const [classes, setClasses]           = useState<Class[]>(initialClasses);
  const [groups, setGroups]             = useState<StudentGroup[]>(initialGroups);
  const [activeTab, setActiveTab]       = useState<"classes" | "groups">("classes");
  const [weeklyCount, setWeeklyCount]   = useState(0);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [earnedBadges, setEarnedBadges] = useState<BadgeType[]>([]);
  const [modalOpen, setModalOpen]       = useState(false);
  const [modalTarget, setModalTarget]   = useState<{ type: "class" | "group"; id: string } | null>(null);
  const [toast, setToast]               = useState<string | null>(null);

  // Weekly tracking init
  useEffect(() => {
    const stored       = localStorage.getItem("taskMasterWeekly");
    const storedBadges = localStorage.getItem("taskMasterBadges");
    if (storedBadges) setEarnedBadges(JSON.parse(storedBadges));

    if (stored) {
      const data       = JSON.parse(stored);
      const storedDate = new Date(data.weekStart);
      const today      = new Date();
      const daysSince  = Math.floor((today.getTime() - storedDate.getTime()) / 86400000);
      const newWeek    = daysSince >= 7 || (daysSince > 0 && today.getDay() < storedDate.getDay());

      if (newWeek) {
        const ws = getWeekStart(today).toISOString();
        setWeeklyCount(0);
        setWeekStartDate(ws);
        localStorage.setItem("taskMasterWeekly", JSON.stringify({ count: 0, weekStart: ws }));
      } else {
        setWeeklyCount(data.count);
        setWeekStartDate(data.weekStart);
      }
    } else {
      const ws = getWeekStart(new Date()).toISOString();
      setWeekStartDate(ws);
      localStorage.setItem("taskMasterWeekly", JSON.stringify({ count: 0, weekStart: ws }));
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const incrementBalloons = (currentCount: number, currentBadges: BadgeType[], ws: string) => {
    const newCount = currentCount + 1;
    setWeeklyCount(newCount);
    localStorage.setItem("taskMasterWeekly", JSON.stringify({ count: newCount, weekStart: ws }));

    const next = availableBadges.find((b) => !currentBadges.some((e) => e.id === b.id));
    if (next && newCount >= next.tasksRequired) {
      const newBadge = { ...next, weekEarned: ws };
      const updated  = [...currentBadges, newBadge];
      setEarnedBadges(updated);
      localStorage.setItem("taskMasterBadges", JSON.stringify(updated));
      showToast(`🎉 Badge Unlocked: ${next.icon} ${next.name}!`);
    }
  };

  const toggleClassTask = (classId: string, taskId: string) => {
    setClasses((prev) =>
      prev.map((cls) => {
        if (cls.id !== classId) return cls;
        return {
          ...cls,
          tasks: cls.tasks.map((task) => {
            if (task.id !== taskId) return task;
            if (!task.completed) incrementBalloons(weeklyCount, earnedBadges, weekStartDate);
            return { ...task, completed: !task.completed };
          }),
        };
      })
    );
  };

  const toggleGroupTask = (groupId: string, taskId: string) => {
    setGroups((prev) =>
      prev.map((grp) => {
        if (grp.id !== groupId) return grp;
        return {
          ...grp,
          tasks: grp.tasks.map((task) => {
            if (task.id !== taskId) return task;
            if (!task.completed) incrementBalloons(weeklyCount, earnedBadges, weekStartDate);
            return { ...task, completed: !task.completed };
          }),
        };
      })
    );
  };

  const handleAddTask = (title: string, dueDate: string) => {
    if (!modalTarget) return;
    const newTask: Task = { id: `task-${Date.now()}`, title, completed: false, dueDate };
    if (modalTarget.type === "class") {
      setClasses((prev) =>
        prev.map((c) => (c.id === modalTarget.id ? { ...c, tasks: [...c.tasks, newTask] } : c))
      );
    } else {
      setGroups((prev) =>
        prev.map((g) => (g.id === modalTarget.id ? { ...g, tasks: [...g.tasks, newTask] } : g))
      );
    }
  };

  const openModal = (type: "class" | "group", id: string) => {
    setModalTarget({ type, id });
    setModalOpen(true);
  };

  const totalTasks =
    classes.reduce((a, c) => a + c.tasks.length, 0) +
    groups.reduce((a, g) => a + g.tasks.length, 0);

  const completedTasks =
    classes.reduce((a, c) => a + c.tasks.filter((t) => t.completed).length, 0) +
    groups.reduce((a, g) => a + g.tasks.filter((t) => t.completed).length, 0);

  const handleLogout = () => {
    // navigate("/");
  };

  return (
    <div className="dashboard-page">
      <div className="overlay">

        {/* Navbar */}
        <nav className="dashboard-navbar">
          <div className="dashboard-brand">
            <div className="logo" />
            <div>
              <p className="name">TaskMaster</p>
              <p className="subtitle">Student Dashboard</p>
            </div>
          </div>
          <div className="button" onClick={handleLogout}>Logout</div>
        </nav>

        {/* Scrollable content area */}
        <div className="dashboard-content">

          {/* Top cards: house + badge sash */}
          <div className="cards-grid">
            <div className="card house-card">
              <h2>Weekly Progress Adventure</h2>
              <div className="subtitle">Complete tasks to add balloons! Resets every Sunday.</div>
              <HouseWithBalloons count={weeklyCount} />
            </div>

            <div className="card badge-card">
              <header>
                <div className="header-title-row">
                  <span className="award-icon">🏅</span>
                  <h2>Achievement Badges</h2>
                </div>
                <p className="subtitle">Earn badges by completing tasks each week!</p>
              </header>
              <BadgeSash
                earnedBadges={earnedBadges}
                currentWeekTasks={weeklyCount}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-row">
                  <div>
                    <p className="stat-label">Total Classes</p>
                    <p className="stat-value">{classes.length}</p>
                  </div>
                  <div className="stat-icon-box blue">📚</div>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-row">
                  <div>
                    <p className="stat-label">Student Groups</p>
                    <p className="stat-value">{groups.length}</p>
                  </div>
                  <div className="stat-icon-box purple">👥</div>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-row">
                  <div>
                    <p className="stat-label">Total Tasks</p>
                    <p className="stat-value">{totalTasks}</p>
                  </div>
                  <div className="stat-icon-box green">⏰</div>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-row">
                  <div>
                    <p className="stat-label">Completed</p>
                    <p className="stat-value">{completedTasks}</p>
                  </div>
                  <div className="stat-icon-box orange">✅</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs-header">
              <button
                className={`tab-btn ${activeTab === "classes" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("classes")}
              >
                📚 Classes
              </button>
              <button
                className={`tab-btn ${activeTab === "groups" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("groups")}
              >
                👥 Student Groups
              </button>
            </div>

            {activeTab === "classes" && (
              <div className="tab-content-grid">
                {classes.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    cls={cls}
                    onToggleTask={(taskId) => toggleClassTask(cls.id, taskId)}
                    onAddTask={() => openModal("class", cls.id)}
                  />
                ))}
              </div>
            )}

            {activeTab === "groups" && (
              <div className="tab-content-grid">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onToggleTask={(taskId) => toggleGroupTask(group.id, taskId)}
                    onAddTask={() => openModal("group", group.id)}
                  />
                ))}
              </div>
            )}
          </div>

        </div>{/* end dashboard-content */}
      </div>{/* end overlay */}

      {/* Add Task Modal */}
      <AddTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddTask}
      />

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
