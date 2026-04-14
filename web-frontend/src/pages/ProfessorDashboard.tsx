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
}

interface Group {
    _id: string;
    name: string;
    memberIds: User[];
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
    const [_students, setStudents] = useState<User[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    const [newCourseCode, setNewCourseCode] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [newGroupName, setNewGroupName] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");

    const [taskTitle, setTaskTitle] = useState("");

    const [deleteModal, setDeleteModal] = useState<{ open: boolean; classId: string | null }>({
        open: false, classId: null
    });

    // Get these from localStorage — make sure login stores them!
    const userId = localStorage.getItem("userId");

    /* ===== FETCH ALL CLASSES (using professorId filter) ===== */
    const fetchClasses = async () => {
        const res = await fetch(`/api/classes?professorId=${userId}`);
        const data = await res.json();
        if (res.ok) {
            setClasses(data);
        } else {
            toast.error("Failed to load classes");
        }
    };

    /* ===== FETCH ALL STUDENTS (using new /api/users endpoint) ===== */
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
        fetchClasses();
        fetchStudents();
    }, []);

    /* ===== FETCH TASKS ===== */
    const fetchTasks = async (classId: string) => {
        const res = await fetch(`/api/tasks?classId=${classId}`);
        const data = await res.json();
        if (res.ok) setTasks(data);
    };

    /* ===== SELECT CLASS ===== */
    const handleSelectClass = async (cls: Class) => {
        const [classRes, groupsRes] = await Promise.all([
            fetch(`/api/classes/${cls._id}`),
            fetch(`/api/classes/${cls._id}/groups`)
        ]);
        const fullClass = await classRes.json();
        const groupsData = await groupsRes.json();

        setSelectedClass({ ...fullClass, groups: groupsData });
        setGroups(groupsData);
        fetchTasks(cls._id);
    };

    /* ===== CREATE CLASS ===== */
    const createClass = async () => {
        if (!newCourseCode || !newTitle) return toast.error("Course code and title required");

        const res = await fetch("/api/classes", {   // ✅ was /api/classes/create
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

    /* ===== DELETE CLASS ===== */
    const deleteClass = async (classId: string) => {
        await fetch(`/api/classes/${classId}`, { method: "DELETE" });
        toast.success("Class deleted");
        fetchClasses();
    };

    /* ===== CREATE GROUP ===== */
    const createGroup = async () => {
        if (!selectedClass || !newGroupName) return;

        await fetch("/api/groups", {   // ✅ was /api/groups/create
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newGroupName, classId: selectedClass._id, createdBy: userId }),
        });

        setNewGroupName("");
        handleSelectClass(selectedClass);
    };

    /* ===== DELETE GROUP ===== */
    const deleteGroup = async (groupId: string) => {
        await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
        handleSelectClass(selectedClass!);
    };

    /* ===== ENROLL STUDENT ===== */
    const addStudent = async () => {
        if (!selectedClass || !selectedStudentId) return;

        const res = await fetch(`/api/classes/${selectedClass._id}/enroll`, {   // ✅ was /api/classes/join
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selectedStudentId }),   // ✅ sends userId not username
        });

        if (res.ok) {
            toast.success("Student enrolled");
            setSelectedStudentId("");
            handleSelectClass(selectedClass);
        } else {
            const data = await res.json();
            toast.error(data.message);
        }
    };

    /* ===== REMOVE STUDENT ===== */
    const removeStudent = async (studentId: string) => {
        await fetch(`/api/classes/${selectedClass!._id}/enroll/${studentId}`, {   // ✅ was /remove-student/
            method: "DELETE",
        });
        handleSelectClass(selectedClass!);
    };

    /* ===== ADD TO GROUP ===== */
    const addToGroup = async (groupId: string, memberId: string) => {
        if (!memberId) return;

        await fetch(`/api/groups/${groupId}/members`, {   // ✅ was /api/groups/:id/add
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: memberId }),
        });

        handleSelectClass(selectedClass!);
    };

    /* ===== CREATE TASK ===== */
    const createTask = async () => {
        if (!selectedClass || !taskTitle) return;

        const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: taskTitle,
                assignedTo: userId,   // ✅ backend requires this field
                classId: selectedClass._id,
            }),
        });

        if (res.ok) {
            toast.success("Task created");
            setTaskTitle("");
            fetchTasks(selectedClass._id);
        }
    };

    /* ===== DELETE TASK ===== */
    const deleteTask = async (taskId: string) => {
        await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
        if (selectedClass) fetchTasks(selectedClass._id);
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    /* ===== UI ===== */
    return (
        <div className="dashboard-page">
            <div className="overlay">

                {/* NAVBAR */}
                <div className="dashboard-navbar">
                    <div className="dashboard-brand">
                        <div className="logo" />
                        <div>
                            <p className="name">Professor Dashboard</p>
                            <p className="subtitle">Class Management System</p>
                        </div>
                    </div>
                    <button className="button" onClick={handleLogout}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>

                <div className="dashboard-content">

                    {/* CLASS LIST VIEW */}
                    {!selectedClass && (
                        <>
                            <div className="card house-card">
                                <h2>Create Class</h2>
                                <input value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value)} placeholder="Course code (e.g. COP4331)" />
                                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Class title" />
                                <button className="button button-primary" onClick={createClass}>
                                    <Plus size={16} /> Create
                                </button>
                            </div>

                            <div className="card badge-card">
                                <h2>Your Classes</h2>
                                {classes.length === 0 && <p style={{ color: "#94a3b8" }}>No classes yet.</p>}
                                {classes.map((c) => (
                                    <div key={c._id} className="content-card">
                                        <div className="content-card-header">
                                            <div>
                                                <div className="content-card-title">{c.courseCode} — {c.title}</div>
                                                <div className="content-card-meta">
                                                    {c.studentIds?.length || 0} students
                                                </div>
                                            </div>
                                            <button className="button" onClick={() => setDeleteModal({ open: true, classId: c._id })}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <button className="button button-primary" onClick={() => handleSelectClass(c)}>
                                            Manage →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* CLASS DETAIL VIEW */}
                    {selectedClass && (
                        <div className="card house-card">
                            <button className="button" onClick={() => setSelectedClass(null)}>← Back</button>
                            <h2>{selectedClass.courseCode} — {selectedClass.title}</h2>

                            {/* Students */}
                            <h3>Students</h3>
                            {(selectedClass.studentIds || []).map((s) => (
                                <div key={s._id} className="task-item">
                                    {s.name} ({s.email})
                                    <button className="button" onClick={() => removeStudent(s._id)}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}

                            <div className="content-card">
                                <h4>Enroll Student by ID</h4>
                                <input
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    placeholder="Paste student user ID"
                                />
                                <button className="button button-primary" onClick={addStudent}>
                                    Enroll
                                </button>
                            </div>

                            {/* Tasks */}
                            <h3>Tasks</h3>
                            <div className="content-card">
                                <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" />
                                <button className="button button-primary" onClick={createTask}>
                                    <Plus size={16} /> Create Task
                                </button>
                            </div>
                            {tasks.length === 0 && <p style={{ color: "#94a3b8" }}>No tasks yet.</p>}
                            {tasks.map((t) => (
                                <div key={t._id} className="task-item">
                                    <div>
                                        <div>{t.title}</div>
                                        <small>{t.status}</small>
                                    </div>
                                    <button className="button" onClick={() => deleteTask(t._id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            {/* Groups */}
                            <h3>Groups</h3>
                            <div className="content-card">
                                <h4>Create Group</h4>
                                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" />
                                <button className="button button-primary" onClick={createGroup}>
                                    <Plus size={16} /> Create Group
                                </button>
                            </div>

                            {groups.map((g) => (
                                <div key={g._id} className="content-card">
                                    <div className="content-card-header">
                                        <h4>{g.name}</h4>
                                        <button className="button" onClick={() => deleteGroup(g._id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {(g.memberIds || []).map((m) => (
                                        <div key={m._id} className="task-item">{m.name}</div>
                                    ))}
                                    <input
                                        placeholder="Paste student user ID to add"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") addToGroup(g._id, (e.target as HTMLInputElement).value);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* DELETE MODAL */}
                {deleteModal.open && (
                    <div className="modal-backdrop">
                        <div className="modal-box">
                            <h3 className="modal-title">Delete class?</h3>
                            <div className="modal-actions">
                                <button className="button" onClick={() => setDeleteModal({ open: false, classId: null })}>
                                    Cancel
                                </button>
                                <button className="button button-primary" onClick={() => {
                                    deleteClass(deleteModal.classId!);
                                    setDeleteModal({ open: false, classId: null });
                                }}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}