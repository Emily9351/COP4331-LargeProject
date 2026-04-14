import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
import { Trash2, RotateCcw } from "lucide-react";
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
  studyGroupId?: string;
  isHidden: boolean;
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
  allowStudentTasks?: boolean;
  tasks?: Task[];
  createdBy?: {
    _id: string;
    role: string;
  };
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
  onToggleHide,
}: {
  task: Task;
  onToggle: () => void;
  onToggleHide: () => void;
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
        <span className="task-due">Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</span>
      </div>
      {(isDone || task.isHidden) && (
        <button 
          className="button" 
          style={{ padding: '2px 8px', fontSize: '0.7rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleHide();
          }}
          title={task.isHidden ? "Restore task" : "Delete task (Hide)"}
        >
          {task.isHidden ? (
            <><RotateCcw size={12} /> Restore</>
          ) : (
            <><Trash2 size={12} /> Delete</>
          )}
        </button>
      )}
    </div>
  );
}

function ClassCard({
  cls,
  onToggleTask,
  onAddTask,
  onToggleHide,
}: {
  cls: Class;
  onToggleTask: (taskId: string) => void;
  onAddTask: () => void;
  onToggleHide: (taskId: string) => void;
}) {
  const visibleTasks = cls.tasks.filter(t => !t.isHidden);
  const completed = visibleTasks.filter((t) => t.status === "done").length;
  return (
    <div className="content-card">
      <div className="content-card-header">
        <div>
          <h3 className="content-card-title">{cls.courseCode} — {cls.title}</h3>
          <span className="content-card-meta">{completed}/{visibleTasks.length} tasks complete</span>
        </div>
        <button className="add-task-btn" onClick={onAddTask} title="Add task">+</button>
      </div>
      <div className="task-list">
        {visibleTasks.map((task) => (
          <TaskItem 
            key={task._id} 
            task={task} 
            onToggle={() => onToggleTask(task._id)} 
            onToggleHide={() => onToggleHide(task._id)}
          />
        ))}
      </div>
    </div>
  );
}

function GroupCard({
  group,
  allStudents,
  onAddMember,
  onToggleTask,
  onAddTask,
  onToggleHide,
}: {
  group: StudentGroup;
  allStudents: { _id: string; name: string; email: string }[];
  onAddMember: (groupId: string, userId: string) => void;
  onToggleTask: (groupId: string, taskId: string) => void;
  onAddTask: (groupId: string, title: string) => void;
  onToggleHide: (groupId: string, taskId: string) => void;
}) {
  const isProfessorCreated = group.createdBy?.role === "professor";
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const visibleTasks = group.tasks?.filter(t => !t.isHidden) || [];

  return (
    <div className="content-card">
      <div className="content-card-header">
        <div>
          <h3 className="content-card-title">{group.name}</h3>
          <span className="content-card-meta">
            {group.memberIds.length} members · {group.description}
            {isProfessorCreated && <div style={{ color: "#38bdf8", fontSize: "0.8rem", marginTop: "4px" }}>Professor Managed</div>}
          </span>
        </div>
      </div>

      <div className="group-section">
        <h4 style={{ margin: '15px 0 10px' }}>Group Tasks</h4>
        <div className="task-list">
          {visibleTasks.length === 0 && <p className="empty-msg">No tasks for this group.</p>}
          {visibleTasks.map((task) => (
            <TaskItem 
              key={task._id} 
              task={task} 
              onToggle={() => onToggleTask(group._id, task._id)} 
              onToggleHide={() => onToggleHide(group._id, task._id)}
            />
          ))}
        </div>

        {(group.allowStudentTasks || !isProfessorCreated) && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input 
              className="modal-input" 
              style={{ marginBottom: 0 }}
              placeholder="Add group task..." 
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onAddTask(group._id, newTaskTitle);
                  setNewTaskTitle("");
                }
              }}
            />
            <button className="button button-primary" onClick={() => {
              onAddTask(group._id, newTaskTitle);
              setNewTaskTitle("");
            }}>+</button>
          </div>
        )}
      </div>

      <h4 style={{ margin: '15px 0 10px' }}>Members</h4>
      {!isProfessorCreated && (
        <div className="group-members-actions" style={{ marginTop: '10px' }}>
          <select 
            className="modal-input"
            style={{ width: '100%', marginBottom: '10px' }}
            onChange={(e) => {
              if (e.target.value) {
                onAddMember(group._id, e.target.value);
                e.target.value = "";
              }
            }}
          >
            <option value="">Add member by name...</option>
            {allStudents.filter(s => !group.memberIds.includes(s._id)).map(s => (
              <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
            ))}
          </select>
        </div>
      )}
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

function CreateGroupModal({
  open,
  onClose,
  onAdd,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, description: string, classId: string) => void;
  classes: Class[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim() || !classId) return;
    onAdd(name.trim(), description.trim(), classId);
    setName("");
    setDescription("");
    setClassId("");
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Create Study Group</h3>
        <input
          className="modal-input"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="modal-input"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: '80px', padding: '10px' }}
        />
        <select 
          className="modal-input"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">Select a class...</option>
          {classes.map(c => (
            <option key={c._id} value={c._id}>{c.courseCode} - {c.title}</option>
          ))}
        </select>
        <div className="modal-actions">
          <button className="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" onClick={handleSubmit}>Create</button>
        </div>
      </div>
    </div>
  );
}

function ArchivedTasksModal({
  open,
  onClose,
  classes,
  groups,
  onToggleTask,
  onToggleGroupTask,
  onToggleHide,
}: {
  open: boolean;
  onClose: () => void;
  classes: Class[];
  groups: StudentGroup[];
  onToggleTask: (classId: string, taskId: string) => void;
  onToggleGroupTask: (groupId: string, taskId: string) => void;
  onToggleHide: (taskId: string) => void;
}) {
  if (!open) return null;

  const hiddenClassTasks = classes.flatMap(c => c.tasks.filter(t => t.isHidden).map(t => ({ task: t, classId: c._id })));
  const hiddenGroupTasks = groups.flatMap(g => g.tasks?.filter(t => t.isHidden).map(t => ({ task: t, groupId: g._id })) || []);

  const hasHidden = hiddenClassTasks.length > 0 || hiddenGroupTasks.length > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">📦 Archived Tasks</h3>
        <p className="modal-subtitle" style={{ color: '#94a3b8', marginBottom: '20px' }}>
          Restore tasks to bring them back to your active list.
        </p>
        
        <div className="task-list" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
          {!hasHidden && <p className="empty-msg">No archived tasks found.</p>}
          
          {hiddenClassTasks.map(({ task, classId }) => (
            <TaskItem 
              key={task._id} 
              task={task} 
              onToggle={() => onToggleTask(classId, task._id)} 
              onToggleHide={() => onToggleHide(task._id)} 
            />
          ))}
          
          {hiddenGroupTasks.map(({ task, groupId }) => (
            <TaskItem 
              key={task._id} 
              task={task} 
              onToggle={() => onToggleGroupTask(groupId, task._id)} 
              onToggleHide={() => onToggleHide(task._id)} 
            />
          ))}
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="button button-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// --- Main Dashboard ---
export function Dashboard() {
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
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [modalTarget, setModalTarget] = useState<{ type: "class" | "group"; id: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchAll = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

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
          const taskRes = await fetch(`/api/tasks?userId=${userId}&classId=${cls._id}&studyGroupId=null`);
          return { ...cls, tasks: await taskRes.json() };
        })
      );

      const groupsWithTasks = await Promise.all(
        groupData.map(async (group: StudentGroup) => {
          const taskRes = await fetch(`/api/tasks?userId=${userId}&studyGroupId=${group._id}`);
          return { ...group, tasks: await taskRes.json() };
        })
      );

      setClasses(classesWithTasks);
      setGroups(groupsWithTasks);
      setAllStudents(studentsData);
      
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

  useEffect(() => {
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
      fetchAll(); // Dynamic update
    } else {
      showToast("Failed to enroll");
    }
  };

  const handleCreateGroup = async (name: string, description: string, classId: string) => {
    const userId = localStorage.getItem("userId");
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        classId,
        createdBy: userId,
      }),
    });

    if (res.ok) {
      showToast("Group created! Now add some members.");
      fetchAll(); // Dynamic update
    } else {
      showToast("Failed to create group");
    }
  };

  const handleAddMemberToGroup = async (groupId: string, userId: string) => {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (res.ok) {
      showToast("Member added to group!");
      fetchAll(); // Dynamic update
    } else {
      const data = await res.json();
      showToast(data.message || "Failed to add member");
    }
  };

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
    await fetch(`/api/tasks/${taskId}/toggle`, { method: "PATCH" });
  };

  const toggleGroupTask = async (groupId: string, taskId: string) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group._id !== groupId) return group;
        return {
          ...group,
          tasks: group.tasks?.map((task) => {
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
    await fetch(`/api/tasks/${taskId}/toggle`, { method: "PATCH" });
  };

  const handleToggleHideTask = async (taskId: string) => {
    // Optimistic update
    setClasses(prev => prev.map(c => ({
      ...c,
      tasks: c.tasks.map(t => t._id === taskId ? { ...t, isHidden: !t.isHidden } : t)
    })));
    setGroups(prev => prev.map(g => ({
      ...g,
      tasks: g.tasks?.map(t => t._id === taskId ? { ...t, isHidden: !t.isHidden } : t)
    })));

    await fetch(`/api/tasks/${taskId}/toggle-hide`, { method: "PATCH" });
    showToast("Task updated!");
  };

  const handleAddGroupTask = async (groupId: string, title: string) => {
    if (!title) return;
    const userId = localStorage.getItem("userId");

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        studyGroupId: groupId,
        userId, 
      }),
    });

    if (res.ok) {
      showToast("Group task created!");
      fetchAll(); // Dynamic update
    }
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

    if (res.ok) {
      showToast("Task added!");
      fetchAll(); // Dynamic update
    }
  };

  const openModal = (type: "class" | "group", id: string) => {
    setModalTarget({ type, id });
    setModalOpen(true);
  };

  // Weekly tracking init
  useEffect(() => {
    const stored = localStorage.getItem("taskMasterWeekly");
    const storedBadges = localStorage.getItem("taskMasterBadges");
    if (storedBadges) setEarnedBadges(JSON.parse(storedBadges));

    if (stored) {
      const data = JSON.parse(stored);
      const ws = getWeekStart(new Date()).toISOString();
      if (data.weekStart !== ws) {
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

  const totalTasks = classes.reduce((a, c) => a + c.tasks.length, 0);
  const completedTasks = classes.reduce((a, c) => a + c.tasks.filter((t) => t.status === "done").length, 0);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  if (loading) {
    return <div className="dashboard-page"><div className="overlay"><p>Loading...</p></div></div>;
  }

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
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="button" onClick={() => setShowArchived(true)}>Restore</button>
            <button className="button" onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        <div className="dashboard-content">
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

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-card-content"><div className="stat-row"><div><p className="stat-label">Total Classes</p><p className="stat-value">{classes.length}</p></div><div className="stat-icon-box blue">📚</div></div></div></div>
            <div className="stat-card"><div className="stat-card-content"><div className="stat-row"><div><p className="stat-label">Student Groups</p><p className="stat-value">{groups.length}</p></div><div className="stat-icon-box purple">👥</div></div></div></div>
            <div className="stat-card"><div className="stat-card-content"><div className="stat-row"><div><p className="stat-label">Total Tasks</p><p className="stat-value">{totalTasks}</p></div><div className="stat-icon-box green">⏰</div></div></div></div>
            <div className="stat-card"><div className="stat-card-content"><div className="stat-row"><div><p className="stat-label">Completed</p><p className="stat-value">{completedTasks}</p></div><div className="stat-icon-box orange">✅</div></div></div></div>
          </div>

          <div className="tabs-container">
            <div className="tabs-header">
              <button className={`tab-btn ${activeTab === "classes" ? "tab-active" : ""}`} onClick={() => setActiveTab("classes")}>📚 My Classes</button>
              <button className={`tab-btn ${activeTab === "groups" ? "tab-active" : ""}`} onClick={() => setActiveTab("groups")}>👥 My Groups</button>
              <button className={`tab-btn ${activeTab === "browse" ? "tab-active" : ""}`} onClick={() => setActiveTab("browse")}>🔍 Browse Classes</button>
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
                    onToggleHide={handleToggleHideTask}
                  />
                ))}
              </div>
            )}

            {activeTab === "groups" && (
              <div className="tab-content-grid">
                <div className="content-card create-group-card">
                    <h3>Start a Study Group</h3>
                    <button className="button button-primary" onClick={() => setShowCreateGroup(true)}>Create Group</button>
                </div>
                {groups.map((group) => (
                  <GroupCard 
                    key={group._id} 
                    group={group} 
                    allStudents={allStudents} 
                    onAddMember={handleAddMemberToGroup} 
                    onToggleTask={toggleGroupTask} 
                    onAddTask={handleAddGroupTask}
                    onToggleHide={(_gid, tid) => handleToggleHideTask(tid)}
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
                        <div><h3 className="content-card-title">{cls.courseCode} — {cls.title}</h3><p className="content-card-meta">{cls.semester}</p></div>
                        <button className="button button-primary" onClick={() => handleJoinClass(cls._id)}>Join</button>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAddTask} />
      {toast && <div className="toast">{toast}</div>}
      <CreateGroupModal open={showCreateGroup} onClose={() => setShowCreateGroup(false)} onAdd={handleCreateGroup} classes={classes} />
      <ArchivedTasksModal 
        open={showArchived} 
        onClose={() => setShowArchived(false)} 
        classes={classes} 
        groups={groups} 
        onToggleTask={toggleClassTask}
        onToggleGroupTask={toggleGroupTask}
        onToggleHide={handleToggleHideTask}
      />
    </div>
  );
}
