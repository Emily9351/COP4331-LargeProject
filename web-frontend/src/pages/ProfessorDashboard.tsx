import { useEffect, useState } from "react";
import { LogOut, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import "../css/ProfessorDashboard.css";

interface User {
    _id: string;
    name: string;
    email: string;
    role: "student" | "professor";
}

interface Task {
    _id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    dueDate?: string;
}

interface Group {
    _id: string;
    name: string;
    memberIds: User[];
    allowStudentTasks?: boolean;
}

interface Class {
    _id: string;
    courseCode: string;
    title: string;
    studentIds: User[];
    groups?: Group[];
}

export function ProfessorDashboard() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [groups, setGroups] = useState<Group[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    const [newCourseCode, setNewCourseCode] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [newGroupName, setNewGroupName] = useState("");
    const [allowStudentTasks, setAllowStudentTasks] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState("");

    const [taskTitle, setTaskTitle] = useState("");
    const [taskDueDate, setTaskDueDate] = useState("");
    const [groupTaskTitles, setGroupTaskTitles] = useState<{ [groupId: string]: string }>({});
    const [groupTaskDueDates, setGroupTaskDueDates] = useState<{ [groupId: string]: string }>({});

    const [deleteModal, setDeleteModal] = useState<{ open: boolean; classId: string | null }>({
        open: false, classId: null
    });

    const userId = localStorage.getItem("userId");

    const fetchClasses = async () => {
        const res = await fetch(`/api/classes?professorId=${userId}`);
        const data = await res.json();
        if (res.ok) {
            setClasses(data);
        } else {
            toast.error("Failed to load classes");
        }
    };

    const fetchStudents = async () => {
        const res = await fetch("/api/users?role=student");
        const data = await res.json();
        if (res.ok) {
            setStudents(data);
        } else {
            toast.error("Failed to load students");
        }
    };

    useEffect(() => {
        if (userId) {
            fetchClasses();
            fetchStudents();
        }
    }, [userId]);

    const fetchTasks = async (classId: string) => {
        const res = await fetch(`/api/tasks?classId=${classId}&studyGroupId=null`);
        const data = await res.json();
        if (res.ok) setTasks(data);
    };

    const refreshSelectedClassData = async (classId: string) => {
        const [classRes, groupsRes] = await Promise.all([
            fetch(`/api/classes/${classId}`),
            fetch(`/api/classes/${classId}/groups`)
        ]);
        const fullClass = await classRes.json();
        const groupsData = await groupsRes.json();

        setSelectedClass({ ...fullClass, groups: groupsData });
        setGroups(groupsData);
        fetchTasks(classId);
    };

    const handleSelectClass = async (cls: Class) => {
        refreshSelectedClassData(cls._id);
    };

    const createClass = async () => {
        if (!newCourseCode || !newTitle) return toast.error("Course code and title required");

        const res = await fetch("/api/classes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseCode: newCourseCode, title: newTitle, professorId: userId }),
        });

        if (res.ok) {
            toast.success("Class created");
            setNewCourseCode("");
            setNewTitle("");
            fetchClasses();
        } else {
            const data = await res.json();
            toast.error(data.message);
        }
    };

    const deleteClass = async (classId: string) => {
        const res = await fetch(`/api/classes/${classId}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Class deleted");
            fetchClasses();
        }
    };

    const createGroup = async () => {
        if (!selectedClass || !newGroupName) return;

        const res = await fetch("/api/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                name: newGroupName, 
                classId: selectedClass._id, 
                createdBy: userId,
                allowStudentTasks: allowStudentTasks 
            }),
        });

        if (res.ok) {
            setNewGroupName("");
            setAllowStudentTasks(true);
            refreshSelectedClassData(selectedClass._id);
        }
    };

    const deleteGroup = async (groupId: string) => {
        const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
        if (res.ok && selectedClass) {
            refreshSelectedClassData(selectedClass._id);
        }
    };

    const addStudent = async () => {
        if (!selectedClass || !selectedStudentId) return;

        const res = await fetch(`/api/classes/${selectedClass._id}/enroll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selectedStudentId }),
        });

        if (res.ok) {
            toast.success("Student enrolled");
            setSelectedStudentId("");
            refreshSelectedClassData(selectedClass._id);
        } else {
            const data = await res.json();
            toast.error(data.message);
        }
    };

    const removeStudent = async (studentId: string) => {
        const res = await fetch(`/api/classes/${selectedClass!._id}/enroll/${studentId}`, {
            method: "DELETE",
        });
        if (res.ok && selectedClass) {
            refreshSelectedClassData(selectedClass._id);
        }
    };

    const addToGroup = async (groupId: string, memberId: string) => {
        if (!memberId) return;

        const res = await fetch(`/api/groups/${groupId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: memberId }),
        });

        if (res.ok && selectedClass) {
            refreshSelectedClassData(selectedClass._id);
        }
    };

    const createTask = async () => {
        if (!selectedClass || !taskTitle) return;

        const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: taskTitle,
                dueDate: taskDueDate || null,
                classId: selectedClass._id,
            }),
        });

        if (res.ok) {
            toast.success("Task created for all students");
            setTaskTitle("");
            setTaskDueDate("");
            fetchTasks(selectedClass._id);
        }
    };

    const createGroupTask = async (groupId: string) => {
        const title = groupTaskTitles[groupId];
        const dueDate = groupTaskDueDates[groupId];
        if (!title) return;

        const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                dueDate: dueDate || null,
                studyGroupId: groupId,
            }),
        });

        if (res.ok && selectedClass) {
            toast.success("Task created for all group members");
            setGroupTaskTitles(prev => ({ ...prev, [groupId]: "" }));
            setGroupTaskDueDates(prev => ({ ...prev, [groupId]: "" }));
            refreshSelectedClassData(selectedClass._id);
        }
    };

    const deleteTask = async (taskId: string) => {
        const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
        if (res.ok && selectedClass) {
            fetchTasks(selectedClass._id);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    return (
        <div className="dashboard-page">
            <div className="overlay">
                <div className="dashboard-navbar">
                    <div className="dashboard-brand">
                        <div className="logo" />
                        <div>
                            <p className="name">Professor Dashboard</p>
                            <p className="subtitle">Class Management System</p>
                        </div>
                    </div>
                    <button className="button" onClick={handleLogout}><LogOut size={16} /> Logout</button>
                </div>

                <div className="dashboard-content">
                    {!selectedClass && (
                        <>
                            <div className="card house-card">
                                <h2>Create Class</h2>
                                <input value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value)} placeholder="Course code (e.g. COP4331)" />
                                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Class title" />
                                <button className="button button-primary" onClick={createClass}><Plus size={16} /> Create</button>
                            </div>
                            <div className="card badge-card">
                                <h2>Your Classes</h2>
                                {classes.length === 0 && <p style={{ color: "#94a3b8" }}>No classes yet.</p>}
                                {classes.map((c) => (
                                    <div key={c._id} className="content-card">
                                        <div className="content-card-header">
                                            <div><div className="content-card-title">{c.courseCode} — {c.title}</div><div className="content-card-meta">{c.studentIds?.length || 0} students</div></div>
                                            <button className="button" onClick={() => setDeleteModal({ open: true, classId: c._id })}><Trash2 size={14} /></button>
                                        </div>
                                        <button className="button button-primary" onClick={() => handleSelectClass(c)}>Manage →</button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {selectedClass && (
                        <div className="card house-card">
                            <button className="button" onClick={() => setSelectedClass(null)}>← Back</button>
                            <h2>{selectedClass.courseCode} — {selectedClass.title}</h2>
                            <h3>Students</h3>
                            {(selectedClass.studentIds || []).map((s) => (
                                <div key={s._id} className="task-item">{s.name} ({s.email})<button className="button" onClick={() => removeStudent(s._id)}><X size={14} /></button></div>
                            ))}
                            <div className="content-card">
                                <h4>Enroll Student</h4>
                                <select className="input" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', background: '#1e293b', color: 'white', border: '1px solid #334155' }}>
                                    <option value="">Select a student...</option>
                                    {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.email})</option>)}
                                </select>
                                <button className="button button-primary" onClick={addStudent}>Enroll</button>
                            </div>
                            <h3>Tasks</h3>
                            <div className="content-card">
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                    <input 
                                        value={taskTitle} 
                                        onChange={(e) => setTaskTitle(e.target.value)} 
                                        placeholder="Task title" 
                                        style={{ flex: 2, padding: '8px', borderRadius: '4px', background: '#1e293b', color: 'white', border: '1px solid #334155' }}
                                    />
                                    <input 
                                        type="date" 
                                        value={taskDueDate} 
                                        onChange={(e) => setTaskDueDate(e.target.value)} 
                                        style={{ flex: 1, padding: '8px', borderRadius: '4px', background: '#1e293b', color: 'white', border: '1px solid #334155' }}
                                    />
                                </div>
                                <button className="button button-primary" onClick={createTask}>
                                    <Plus size={16} /> Create Task
                                </button>
                            </div>
                            {tasks.length === 0 && <p style={{ color: "#94a3b8" }}>No tasks yet.</p>}
                            {[...tasks].sort((a,b) => {
                                const dA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                                const dB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                                return dA - dB;
                            }).map((t) => (
                                <div key={t._id} className="task-item">
                                    <div>
                                        <div>{t.title}</div>
                                        <small>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'} — {t.status}</small>
                                    </div>
                                    <button className="button" onClick={() => deleteTask(t._id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            <h3>Groups</h3>
                            <div className="content-card">
                                <h4>Create Group</h4>
                                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" />
                                <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" id="allowTasks" checked={allowStudentTasks} onChange={(e) => setAllowStudentTasks(e.target.checked)} /><label htmlFor="allowTasks" style={{ fontSize: '0.9rem', color: 'white' }}>Allow students to add tasks</label></div>
                                <button className="button button-primary" onClick={createGroup}><Plus size={16} /> Create Group</button>
                            </div>
                            {groups.map((g) => (
                                <div key={g._id} className="content-card">
                                    <div className="content-card-header"><h4>{g.name}</h4><button className="button" onClick={() => deleteGroup(g._id)}><Trash2 size={14} /></button></div>
                                    <div style={{ marginBottom: '10px' }}><span className="content-card-meta">{g.allowStudentTasks ? "✅ Students can add tasks" : "🔒 Professor-only tasks"}</span></div>
                                    <h5 style={{ color: 'white', marginBottom: '5px' }}>Members</h5>
                                    {(g.memberIds || []).map((m) => (<div key={m._id} className="task-item">{m.name}</div>))}
                                    <h5 style={{ marginTop: '15px', color: 'white', marginBottom: '5px' }}>Group Tasks</h5>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                        <input placeholder="Group task title" value={groupTaskTitles[g._id] || ""} onChange={(e) => setGroupTaskTitles(prev => ({ ...prev, [g._id]: e.target.value }))} style={{ flex: 1, padding: '8px', borderRadius: '4px', background: '#1e293b', color: 'white', border: '1px solid #334155' }} />
                                        <button className="button button-primary" onClick={() => createGroupTask(g._id)}>Add</button>
                                    </div>
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                                        <select className="input" style={{ flex: 1, padding: '8px', borderRadius: '4px', background: '#1e293b', color: 'white', border: '1px solid #334155' }} onChange={(e) => { if (e.target.value) { addToGroup(g._id, e.target.value); e.target.value = ""; } }}>
                                            <option value="">Add member...</option>
                                            {students.map(s => (<option key={s._id} value={s._id}>{s.name} ({s.email})</option>))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {deleteModal.open && (
                    <div className="modal-backdrop">
                        <div className="modal-box">
                            <h3 className="modal-title">Delete class?</h3>
                            <div className="modal-actions">
                                <button className="button" onClick={() => setDeleteModal({ open: false, classId: null })}>Cancel</button>
                                <button className="button button-primary" onClick={() => { deleteClass(deleteModal.classId!); setDeleteModal({ open: false, classId: null }); }}>Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
