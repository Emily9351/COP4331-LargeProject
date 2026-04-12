import React, { useEffect, useState } from "react";
import {
    LogOut,
    Plus,
    Trash2,
    Users,
    BookOpen,
    UserPlus,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { SearchableDropdown } from "../components/SearchableDropdown";
import "../css/professorView.css";

    /* ================= TYPES ================= */

interface User {
    _id: string;
    name: string;
    email: string;
    role: "student" | "professor";
}

interface Task {
    _id: string;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "done";
    assignedToClass?: string;
    assignedToGroup?: string;
}

interface Group {
    _id: string;
    name: string;
    members: User[];
}

interface Class {
    _id: string;
    name: string;
    students: User[];
    groups?: Group[];
}

    /* ================= COMPONENT ================= */

    export function ProfessorDashboard() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);

    const [groups, setGroups] = useState<Group[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    const [newClassName, setNewClassName] = useState("");
    const [newGroupName, setNewGroupName] = useState("");
    const [studentUsername, setStudentUsername] = useState("");

    const [isLoadingStudents, setIsLoadingStudents] = useState(false);

    const [taskInputs, setTaskInputs] = useState<
        Record<string, { title: string; description: string }>
    >({});

    const [groupInputs, setGroupInputs] = useState<Record<string, string>>({});

    const [deleteModal, setDeleteModal] = useState<{
        open: boolean;
        classId: string | null;
    }>({ open: false, classId: null });

    const token = localStorage.getItem("token");

    const parseJSON = async (res: Response) => {
        const text = await res.text();
        try {
        return text ? JSON.parse(text) : null;
        } catch {
        return null;
        }
    };

    /* ================= FETCH CLASSES ================= */

    const fetchClasses = async () => {
        const res = await fetch("/api/classes/professor", {
        headers: { Authorization: `Bearer ${token}` },
        });

        const data = await parseJSON(res);

        if (res.ok) setClasses(data || []);
        else toast.error(data?.error || "Failed to load classes");
    };

    /* ================= FETCH STUDENTS ================= */

    const fetchStudents = async () => {
        setIsLoadingStudents(true);

        try {
        const res = await fetch("/api/users", {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await parseJSON(res);

        if (res.ok) {
            setStudents((data || []).filter((u: User) => u.role === "student"));
        } else toast.error("Failed to fetch students");
        } finally {
        setIsLoadingStudents(false);
        }
    };

    useEffect(() => {
        fetchClasses();
        fetchStudents();
    }, []);

    /* ================= FETCH TASKS ================= */

    const fetchTasks = async (classId: string) => {
        const res = await fetch(`/api/tasks?classId=${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
        });

        const data = await parseJSON(res);

        if (res.ok) setTasks(data || []);
    };

    /* ================= SELECT CLASS ================= */

    const handleSelectClass = async (cls: Class) => {
        const res = await fetch(`/api/classes/${cls._id}/groups`, {
        headers: { Authorization: `Bearer ${token}` },
        });

        const groupsData = await res.json();

        const classRes = await fetch("/api/classes/professor", {
        headers: { Authorization: `Bearer ${token}` },
        });

        const classesList = await classRes.json();

        const fullClass = classesList.find((c: Class) => c._id === cls._id);

        setSelectedClass({ ...fullClass, groups: groupsData });
        setGroups(groupsData);

        fetchTasks(cls._id);
    };

    /* ================= CLASS ACTIONS ================= */

    const createClass = async () => {
        if (!newClassName) return;

        const res = await fetch("/api/classes/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newClassName }),
        });

        if (res.ok) {
        toast.success("Class created");
        setNewClassName("");
        fetchClasses();
        }
    };

    const deleteClass = async (classId: string) => {
        await fetch(`/api/classes/${classId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        });

        toast.success("Class deleted");
        fetchClasses();
    };

    /* ================= GROUP ================= */

    const createGroup = async () => {
        if (!selectedClass || !newGroupName) return;

        await fetch("/api/groups/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            name: newGroupName,
            classId: selectedClass._id,
        }),
        });

        setNewGroupName("");
        handleSelectClass(selectedClass);
    };

    const deleteGroup = async (groupId: string) => {
        await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        });

        handleSelectClass(selectedClass!);
    };

    /* ================= TASKS ================= */

    const createTask = async (targetId: string, type: "class" | "group") => {
        const input = taskInputs[targetId];
        if (!input?.title) return;

        const body: any = {
        title: input.title,
        description: input.description || "",
        };

        if (type === "class") body.assignedToClass = targetId;
        if (type === "group") body.assignedToGroup = targetId;

        await fetch("/api/tasks", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        });

        setTaskInputs((prev) => ({
        ...prev,
        [targetId]: { title: "", description: "" },
        }));

        if (selectedClass) handleSelectClass(selectedClass);
    };

    const deleteTask = async (taskId: string) => {
        await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        });

        if (selectedClass) handleSelectClass(selectedClass);
    };

    /* ================= STUDENTS ================= */

    const addStudent = async () => {
        if (!selectedClass || !studentUsername) return;

        await fetch("/api/classes/join", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            classId: selectedClass._id,
            username: studentUsername,
        }),
        });

        setStudentUsername("");
        handleSelectClass(selectedClass);
    };

    const removeStudent = async (studentId: string) => {
        await fetch(
        `/api/classes/${selectedClass!._id}/remove-student/${studentId}`,
        {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }
        );

        handleSelectClass(selectedClass!);
    };

    const addToGroup = async (groupId: string) => {
        const username = groupInputs[groupId];
        if (!username) return;

        await fetch(`/api/groups/${groupId}/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
        });

        setGroupInputs((p) => ({ ...p, [groupId]: "" }));
        handleSelectClass(selectedClass!);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        window.location.href = "/";
    };

    /* ================= UI ================= */

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

            {/* CONTENT */}
            <div className="dashboard-content">

            {!selectedClass && (
                <>
                <div className="card house-card">
                    <h2>Create Class</h2>

                    <input
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Class name"
                    />

                    <button className="button button-primary" onClick={createClass}>
                    <Plus size={16} /> Create
                    </button>
                </div>

                <div className="card badge-card">
                    <h2>Your Classes</h2>

                    {classes.map((c) => (
                    <div key={c._id} className="content-card">
                        <div className="content-card-header">
                        <div>
                            <div className="content-card-title">{c.name}</div>
                            <div className="content-card-meta">
                            {c.students?.length || 0} students •{" "}
                            {c.groups?.length || 0} groups
                            </div>
                        </div>

                        <button
                            className="button"
                            onClick={() => setDeleteModal({ open: true, classId: c._id })}
                        >
                            <Trash2 size={14} />
                        </button>
                        </div>

                        <button
                        className="button button-primary"
                        onClick={() => handleSelectClass(c)}
                        >
                        Manage →
                        </button>
                    </div>
                    ))}
                </div>
                </>
            )}

            {/* CLASS VIEW */}
            {selectedClass && (
                <div className="card house-card">

                <h2>{selectedClass.name}</h2>

                <button className="button" onClick={() => setSelectedClass(null)}>
                    ← Back
                </button>

                {/* Students */}
                <h3>Students</h3>

                {selectedClass.students?.map((s) => (
                    <div key={s._id} className="task-item">
                    {s.name}
                    <button onClick={() => removeStudent(s._id)}>
                        <X size={14} />
                    </button>
                    </div>
                ))}

                {/* Add student */}
                <SearchableDropdown
                    value={studentUsername}
                    onChange={setStudentUsername}
                    students={students}
                    isLoading={isLoadingStudents}
                    placeholder="Add student"
                />

                <button className="button button-primary" onClick={addStudent}>
                    Add
                </button>

                {/* Groups */}
                <h3>Groups</h3>

                {groups.map((g) => (
                    <div key={g._id} className="content-card">
                    <h4>{g.name}</h4>

                    <button onClick={() => deleteGroup(g._id)}>
                        Delete
                    </button>

                    <SearchableDropdown
                        value={groupInputs[g._id] || ""}
                        onChange={(v) =>
                        setGroupInputs((p) => ({ ...p, [g._id]: v }))
                        }
                        students={students}
                        isLoading={isLoadingStudents}
                        placeholder="Add to group"
                    />

                    <button onClick={() => addToGroup(g._id)}>
                        Add
                    </button>
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
                    <button
                    className="button"
                    onClick={() => setDeleteModal({ open: false, classId: null })}
                    >
                    Cancel
                    </button>

                    <button
                    className="button button-primary"
                    onClick={() => {
                        deleteClass(deleteModal.classId!);
                        setDeleteModal({ open: false, classId: null });
                    }}
                    >
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