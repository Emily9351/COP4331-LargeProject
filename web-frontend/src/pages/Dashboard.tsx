import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { BookOpen, Users, LogOut, Clock, Award } from "lucide-react";
import "../css/Dashboard.css";

// --- Types ---
interface Task {
  _id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  dueDate: string;
  priority: "low" | "medium" | "high";
  type: string;
  classId?: string;
}

interface Class {
  _id: string;
  title: string;
  courseCode: string;
  semester?: string;
  tasks: Task[];
}

interface StudentGroup {
  _id: string;
  name: string;
  description: string;
  memberIds: string[];
  classId: string;
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
  { id: "achiever", icon: "🔥", name: "Achiever", description: "Complete 5 tasks in a week!", tasksRequired: 5  },
  { id: "champion", icon: "🏆", name: "Champion", description: "Complete 10 tasks in a week!", tasksRequired: 10 },
  { id: "legend",   icon: "💎", name: "Legend",   description: "Complete 20 tasks in a week!", tasksRequired: 20 },
];

// --- Helper ---
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

// --- Sub-components ---

function TaskItem({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: () => void;
}) {
  const isDone = task.status === "done";
  return (
    <div className="task-item" onClick={onToggle}>
      <input
        type="checkbox"
        className="task-checkbox"
        checked={isDone}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="task-info">
        <span className={`task-title ${isDone ? "task-completed" : ""}`}>
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
  const completed = cls.tasks.filter((t) => t.status === "done").length;
  return (
    <div className="content-card">
      <div className="content-card-header">
        <div>
          <h3 className="content-card-title">{cls.courseCode} — {cls.title}</h3>
          <span className="content-card-meta">{completed}/{cls.tasks.length} tasks complete</span>
        </div>
        <button className="add-task-btn" onClick={onAddTask} title="Add task">+</button>
      </div>
      <div className="task-list">
        {cls.tasks.map((task) => (
          <TaskItem key={task._id} task={task} onToggle={() => onToggleTask(task._id)} />
        ))}
      </div>
    </div>
  );
}

function GroupCard({
  group,
}: {
  group: StudentGroup;
}) {
  return (
    <div className="content-card">
      <div className="content-card-header">
        <div>
          <h3 className="content-card-title">{group.name}</h3>
          <span className="content-card-meta">
            {group.memberIds.length} members · {group.description}
          </span>
        </div>
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
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
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

function BadgeSash({
  earnedBadges,
  currentWeekTasks,
}: {
  earnedBadges: BadgeType[];
  currentWeekTasks: number;
}) {
  return (
    <div className="badge-sash">
      {availableBadges.map((badge) => {
        const earned = earnedBadges.some((b) => b.id === badge.id);
        const progress = Math.min((currentWeekTasks / badge.tasksRequired) * 100, 100);
        return (
          <div key={badge.id} className={`badge-item ${earned ? "badge-earned" : "badge-locked"}`}>
            <span className="badge-icon">{badge.icon}</span>
            <span className="badge-name">{badge.name}</span>
            <span className="badge-req">{badge.tasksRequired} tasks</span>
            {!earned && (
              <div className="badge-progress-bar">
                <div className="badge-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Main Dashboard ---
export function Dashboard() {
  // const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [allStudents, setAllStudents] = useState<{_id: string, name: string, email: string}[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"classes" | "groups" | "browse">("classes");
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [earnedBadges, setEarnedBadges] = useState<BadgeType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<{ type: "class" | "group"; id: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch classes, tasks, and groups on mount
  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      console.warn("No userId found");
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        const [classRes, groupRes, studentsRes, allClassRes] = await Promise.all([
          fetch(`/api/classes?userId=${userId}`),
          fetch(`/api/groups?userId=${userId}`),
          fetch("/api/users?role=student"),
          fetch("/api/classes")
        ]);

        const classData = await classRes.json();
        const groupData = await groupRes.json();
        const studentsData = await studentsRes.json();
        const allClassData = await allClassRes.json();

        const classesWithTasks = await Promise.all(
          classData.map(async (cls: Class) => {
            const taskRes = await fetch(`/api/tasks?userId=${userId}&classId=${cls._id}`);
            return { ...cls, tasks: await taskRes.json() };
          })
        );

        setClasses(classesWithTasks);
        setGroups(groupData);
        setAllStudents(studentsData);
        
        // Filter out classes the student is already in
        const notEnrolled = allClassData.filter((ac: any) => 
          !classData.some((ec: any) => ec._id === ac._id)
        );
        setAvailableClasses(notEnrolled);

      } catch (error) {
        console.error("Fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleJoinClass = async (classId: string) => {
    const userId = localStorage.getItem("userId");
    const res = await fetch(`/api/classes/${classId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (res.ok) {
      showToast("Successfully enrolled in class!");
      window.location.reload(); // Simple way to refresh data
    } else {
      showToast("Failed to enroll");
    }
  };

  // Weekly tracking init
  useEffect(() => {
    const stored = localStorage.getItem("taskMasterWeekly");
    const storedBadges = localStorage.getItem("taskMasterBadges");
    if (storedBadges) setEarnedBadges(JSON.parse(storedBadges));

    if (stored) {
      const data = JSON.parse(stored);
      const storedDate = new Date(data.weekStart);
      const today = new Date();
      const daysSince = Math.floor((today.getTime() - storedDate.getTime()) / 86400000);
      const newWeek = daysSince >= 7 || (daysSince > 0 && today.getDay() < storedDate.getDay());

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
      const updated = [...currentBadges, newBadge];
      setEarnedBadges(updated);
      localStorage.setItem("taskMasterBadges", JSON.stringify(updated));
      showToast(`🎉 Badge Unlocked: ${next.icon} ${next.name}!`);
    }
  };

  const toggleClassTask = async (classId: string, taskId: string) => {
    // Optimistic UI update
    setClasses((prev) =>
      prev.map((cls) => {
        if (cls._id !== classId) return cls;
        return {
          ...cls,
          tasks: cls.tasks.map((task) => {
            if (task._id !== taskId) return task;
            if (task.status !== "done") incrementBalloons(weeklyCount, earnedBadges, weekStartDate);
            return {
              ...task,
              status: task.status === "done" ? "todo" : "done",
            } as Task;
          }),
        };
      })
    );

    // Sync to backend
    await fetch(`/api/tasks/${taskId}/toggle`, { method: "PATCH" });
  };

  const handleAddTask = async (title: string, dueDate: string) => {
    if (!modalTarget) return;
    const userId = localStorage.getItem("userId");

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        dueDate,
        userId,
        classId: modalTarget.type === "class" ? modalTarget.id : null,
      }),
    });

    const newTask: Task = await res.json();

    if (modalTarget.type === "class") {
      setClasses((prev) =>
        prev.map((c) =>
          c._id === modalTarget.id ? { ...c, tasks: [...c.tasks, newTask] } : c
        )
      );
    }
  };

  const openModal = (type: "class" | "group", id: string) => {
    setModalTarget({ type, id });
    setModalOpen(true);
  };

  const totalTasks = classes.reduce((a, c) => a + c.tasks.length, 0);

  const completedTasks = classes.reduce(
    (a, c) => a + c.tasks.filter((t) => t.status === "done").length,
    0
  );

  const handleLogout = () => {
    // navigate("/");
  };

  if (loading) {
    return <div className="dashboard-page"><div className="overlay"><p>Loading...</p></div></div>;
  }

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
          <div className="button" onClick={handleLogout}>
            Logout
          </div>
        </nav>

        {/* Scrollable content area */}
        <div className="dashboard-content">

          {/* Top cards: house + badges */}
          <div className="cards-grid">
            <div className="card house-card">
              <h2>Weekly Progress Adventure</h2>
              <div className="subtitle">Complete tasks to add balloons! Resets every Sunday.</div>
              <HouseWithBalloons count={weeklyCount} />
            </div>

            <div className="card badge-card">
              <h2>Achievement Badges</h2>
              <div className="subtitle">Earn badges by completing tasks each week!</div>
              <BadgeSash earnedBadges={earnedBadges} currentWeekTasks={weeklyCount} />
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
                📚 My Classes
              </button>
              <button
                className={`tab-btn ${activeTab === "groups" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("groups")}
              >
                👥 My Groups
              </button>
              <button
                className={`tab-btn ${activeTab === "browse" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("browse")}
              >
                🔍 Browse Classes
              </button>
            </div>

            {activeTab === "classes" && (
              <div className="tab-content-grid">
                {classes.length === 0 && <p className="empty-msg">You are not enrolled in any classes yet.</p>}
                {classes.map((cls) => (
                  <ClassCard
                    key={cls._id}
                    cls={cls}
                    onToggleTask={(taskId) => toggleClassTask(cls._id, taskId)}
                    onAddTask={() => openModal("class", cls._id)}
                  />
                ))}
              </div>
            )}

            {activeTab === "groups" && (
              <div className="tab-content-grid">
                <div className="content-card create-group-card">
                   <h3>Start a Study Group</h3>
                   <p>Collaborate with your peers on tasks and projects.</p>
                   <button className="button button-primary" onClick={() => setShowCreateGroup(true)}>Create Group</button>
                </div>
                {groups.map((group) => (
                  <GroupCard
                    key={group._id}
                    group={group}
                    allStudents={allStudents}
                  />
                ))}
              </div>
            )}

            {activeTab === "browse" && (
              <div className="tab-content-grid">
                {availableClasses.length === 0 && <p className="empty-msg">No new classes available to join.</p>}
                {availableClasses.map((cls) => (
                  <div key={cls._id} className="content-card">
                     <div className="content-card-header">
                        <div>
                           <h3 className="content-card-title">{cls.courseCode} — {cls.title}</h3>
                           <p className="content-card-meta">{cls.semester}</p>
                        </div>
                        <button className="button button-primary" onClick={() => handleJoinClass(cls._id)}>Join</button>
                     </div>
                  </div>
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