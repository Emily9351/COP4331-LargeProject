import  { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, User } from "lucide-react";
import "../css/SearchableDropdown.css";

/* ================= TYPES ================= */

interface Student {
    _id: string;
    name: string;
    email: string;
    role?: "student" | "professor";
    }

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    students: Student[];
    isLoading?: boolean;
}

    /* ================= COMPONENT ================= */

export function SearchableDropdown({
    value,
    onChange,
    placeholder = "Select a student...",
    students = [],
    isLoading = false,
    }: Props) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    /* ================= FILTER ================= */

    const filteredStudents = students.filter((student) => {
        const searchLower = searchTerm.toLowerCase();

        const fullName =
        `${student.name}`.toLowerCase();

        const name = student.name.toLowerCase();

        return (
        fullName.includes(searchLower) ||
        name.includes(searchLower)
        );
});

    /* ================= CLOSE ON OUTSIDE CLICK ================= */

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
        if (
            dropdownRef.current &&
            !dropdownRef.current.contains(event.target as Node)
        ) {
            setIsOpen(false);
        }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /* ================= SELECT ================= */

    const handleSelect = (student: Student) => {
        onChange(student.name);
        setIsOpen(false);
        setSearchTerm("");
    };

    const selectedStudent = students.find((s) => s.name === value);

    /* ================= UI ================= */

    return (
        <div className="searchable-dropdown" ref={dropdownRef}>
        {/* TRIGGER */}
        <div
            className="dropdown-trigger"
            onClick={() => setIsOpen((prev) => !prev)}
        >
            <div className="dropdown-value">
            {selectedStudent ? (
                <div className="selected-student">
                <User size={16} />
                <span>
                    {selectedStudent.name}
                </span>
                <span className="student-name">
                    @{selectedStudent.name}
                </span>
                </div>
            ) : (
                <span className="placeholder">{placeholder}</span>
            )}
            </div>

            <ChevronDown
            size={18}
            className={`dropdown-icon ${isOpen ? "open" : ""}`}
            />
        </div>

        {/* MENU */}
        {isOpen && (
            <div className="dropdown-menu">
            <div className="dropdown-search">
                <Search size={16} />
                <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                />
            </div>

            <div className="dropdown-list">
                {isLoading ? (
                <div className="dropdown-loading">Loading students...</div>
                ) : filteredStudents.length === 0 ? (
                <div className="dropdown-empty">
                    {searchTerm ? "No students found" : "No students available"}
                </div>
                ) : (
                filteredStudents.map((student) => (
                    <div
                    key={student._id}
                    className={`dropdown-item ${
                        value === student.name ? "selected" : ""
                    }`}
                    onClick={() => handleSelect(student)}
                    >
                    <User size={16} />

                    <div className="student-info">
                        <span className="student-name">
                        {student.name}
                        </span>
                        <span className="student-name-small">
                        @{student.name}
                        </span>
                    </div>
                    </div>
                ))
                )}
            </div>
            </div>
        )}
        </div>
    );
}