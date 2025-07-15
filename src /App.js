import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { Check, X, UserPlus, Calendar, AlertTriangle, DollarSign, Edit, Trash2, Save, ArrowLeft, MessageSquarePlus, CheckCircle2, XCircle, Search, Circle, UserCheck } from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cricnets-app-v6';

// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [view, setView] = useState('calendar'); // 'calendar', 'manage'
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [isAddingStudent, setIsAddingStudent] = useState(false);

    // --- Firebase Initialization and Authentication ---
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    try {
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            await signInWithCustomToken(authInstance, __initial_auth_token);
                        } else {
                            await signInAnonymously(authInstance);
                        }
                    } catch (authError) {
                        console.error("Authentication failed:", authError);
                        setError("Could not connect to authentication service.");
                    }
                }
                setIsAuthReady(true);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase initialization error:", e);
            setError("Failed to initialize the application. Please check the console.");
        }
    }, []);

    // --- Data Fetching (Students) ---
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;

        setLoading(true);
        const studentsCollectionPath = `artifacts/${appId}/users/${userId}/students`;
        const q = query(collection(db, studentsCollectionPath));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const studentsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStudents(studentsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching students:", err);
            setError("Failed to load student data.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isAuthReady, db, userId]);

    // --- Handlers for Data Manipulation ---
    const handleAddStudent = async (studentData) => {
        if (!db || !userId) return;
        try {
            const studentsCollectionPath = `artifacts/${appId}/users/${userId}/students`;
            await addDoc(collection(db, studentsCollectionPath), {
                ...studentData,
                notes: [],
                payments: [],
                attendance: {}
            });
            setIsAddingStudent(false);
        } catch (e) {
            console.error("Error adding student: ", e);
            setError("Could not add student.");
        }
    };

    const handleUpdateStudent = async (studentId, updatedData) => {
        if (!db || !userId) return;
        try {
            const studentDocRef = doc(db, `artifacts/${appId}/users/${userId}/students`, studentId);
            await updateDoc(studentDocRef, updatedData);
        } catch (e) {
            console.error("Error updating student: ", e);
            setError("Could not update student details.");
        }
    };
    
    const handleDeleteStudent = async (studentId) => {
        if (!db || !userId) return;
        try {
            const studentDocRef = doc(db, `artifacts/${appId}/users/${userId}/students`, studentId);
            await deleteDoc(studentDocRef);
            setSelectedStudentId(null);
        } catch(e) {
            console.error("Error deleting student: ", e);
            setError("Could not delete student.");
        }
    };

    // --- Derived State ---
    const selectedStudent = useMemo(() => {
        return students.find(s => s.id === selectedStudentId);
    }, [students, selectedStudentId]);

    // --- Render Logic ---
    if (error) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-red-400 p-4 text-center">{error}</div>;
    }

    if (!isAuthReady) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Initializing Academy...</div>;
    }
    
    const MainContent = () => {
        if (loading) {
            return <div className="flex items-center justify-center h-full text-white">Loading Students...</div>;
        }
        if (isAddingStudent) {
            return <StudentForm onSave={handleAddStudent} onCancel={() => setIsAddingStudent(false)} />;
        }
        if (selectedStudent) {
            return <StudentDetail 
                        student={selectedStudent} 
                        onUpdate={handleUpdateStudent}
                        onDelete={handleDeleteStudent}
                        onBack={() => setSelectedStudentId(null)} 
                    />;
        }

        switch (view) {
            case 'calendar':
                return <AttendanceCalendar students={students.filter(s => s.isActive)} onUpdateStudent={handleUpdateStudent} onSelectStudent={setSelectedStudentId} />;
            case 'manage':
                return <StudentList students={students} onSelectStudent={setSelectedStudentId} onAddStudent={() => setIsAddingStudent(true)} />;
            default:
                return <AttendanceCalendar students={students.filter(s => s.isActive)} onUpdateStudent={handleUpdateStudent} onSelectStudent={setSelectedStudentId} />;
        }
    };

    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen font-sans flex flex-col md:flex-row">
            <aside className="w-full md:w-64 bg-gray-950 p-4 border-b md:border-r border-gray-700 flex-shrink-0">
                <h1 className="text-2xl font-bold text-emerald-400 mb-2">Cricnets</h1>
                <p className="text-sm text-gray-400 mb-6">Coaching Dashboard</p>
                <nav className="flex md:flex-col gap-2">
                    <button onClick={() => { setView('calendar'); setSelectedStudentId(null); setIsAddingStudent(false); }} className={`flex items-center gap-3 p-3 rounded-lg w-full text-left transition-colors ${view === 'calendar' && !selectedStudentId ? 'bg-emerald-500/20 text-emerald-300' : 'hover:bg-gray-800'}`}>
                        <Calendar className="h-5 w-5" />
                        <span>Attendance</span>
                    </button>
                    <button onClick={() => { setView('manage'); setSelectedStudentId(null); setIsAddingStudent(false); }} className={`flex items-center gap-3 p-3 rounded-lg w-full text-left transition-colors ${view === 'manage' && !selectedStudentId ? 'bg-emerald-500/20 text-emerald-300' : 'hover:bg-gray-800'}`}>
                        <UserPlus className="h-5 w-5" />
                        <span>Manage Students</span>
                    </button>
                </nav>
                <div className="mt-auto pt-6 text-xs text-gray-500">
                    <p>Your Coach ID:</p>
                    <p className="break-all">{userId || 'Connecting...'}</p>
                </div>
            </aside>

            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <MainContent />
            </main>
        </div>
    );
}

// --- Sub-Components ---

const StudentAttendanceCard = ({ student, selectedDate, onUpdateStudent, onSelectStudent }) => {
    const [note, setNote] = useState('');
    const dateStr = selectedDate.toISOString().split('T')[0];
    const currentMonthStr = selectedDate.toISOString().slice(0, 7);
    const currentMonthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const hasPaidCurrentMonth = student.payments?.some(p => p.month === currentMonthStr);
    const attendanceStatus = student.attendance?.[dateStr];

    const handleSetAttendance = (status) => {
        const updatedAttendance = { ...(student.attendance || {}), [dateStr]: status };
        onUpdateStudent(student.id, { attendance: updatedAttendance });
    };

    const handleAddNote = () => {
        if (!note.trim()) return;
        const newNote = { 
            id: crypto.randomUUID(),
            date: dateStr, 
            text: note.trim() 
        };
        const updatedNotes = [newNote, ...(student.notes || [])];
        onUpdateStudent(student.id, { notes: updatedNotes });
        setNote('');
    };

    return (
        <div className={`bg-gray-800 p-4 rounded-lg border-l-4 ${hasPaidCurrentMonth ? 'border-emerald-500' : 'border-red-500'} flex flex-col gap-3`}>
            <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold text-white">{student.name}</h3>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${student.waiverSigned ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                    {student.waiverSigned ? 'Waiver Signed' : 'No Waiver'}
                </span>
            </div>
            <p className="text-gray-400 text-sm -mt-2">{student.package} Package</p>
            
            {!hasPaidCurrentMonth && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-2 rounded-md text-sm">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">Payment due for {currentMonthName}</span>
                </div>
            )}

            <div className="flex gap-2">
                <button onClick={() => handleSetAttendance('present')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-semibold transition-colors ${attendanceStatus === 'present' ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    <CheckCircle2 size={16} /> Present
                </button>
                <button onClick={() => handleSetAttendance('absent')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-semibold transition-colors ${attendanceStatus === 'absent' ? 'bg-red-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    <XCircle size={16} /> Absent
                </button>
            </div>

            <div className="flex gap-2">
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add daily note..." className="flex-grow bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm" />
                <button onClick={handleAddNote} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold p-2 rounded-lg flex items-center"><MessageSquarePlus size={16} /></button>
            </div>

            <button onClick={() => onSelectStudent(student.id)} className="mt-2 text-emerald-400 hover:text-emerald-300 text-sm font-semibold text-right">
                View Full Profile &rarr;
            </button>
        </div>
    );
};

const AttendanceCalendar = ({ students, onUpdateStudent, onSelectStudent }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    const handleDateChange = (e) => {
        const dateString = e.target.value;
        const [year, month, day] = dateString.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
    };

    const dateStr = selectedDate.toISOString().split('T')[0];
    const selectedDayName = daysOfWeek[selectedDate.getDay()];

    const studentsToDisplay = useMemo(() => {
        return students
            .filter(student => student.enrolledDays?.includes(selectedDayName)) // Enrolled for the day
            .filter(student => !student.attendance?.[dateStr]) // Not yet marked
            .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase())); // Matches search term
    }, [students, selectedDayName, dateStr, searchTerm]);

    return (
        <div>
            <h2 className="text-3xl font-bold text-white mb-4">Daily Attendance</h2>
            <div className="bg-gray-800 p-4 rounded-lg mb-6 space-y-4">
                <div>
                    <label htmlFor="attendance-date" className="block text-sm font-medium text-gray-300 mb-2">Select Date:</label>
                    <input
                        id="attendance-date"
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={handleDateChange}
                        className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 w-full md:w-auto"
                    />
                </div>
                 <div>
                    <label htmlFor="search-attendance" className="block text-sm font-medium text-gray-300 mb-2">Find Student:</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            id="search-attendance"
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white"
                        />
                    </div>
                </div>
                <p className="pt-2 text-lg text-emerald-400 font-semibold">
                    {studentsToDisplay.length} student(s) pending attendance for: {selectedDate.toDateString()}
                </p>
            </div>

            {studentsToDisplay.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {studentsToDisplay.map(student => (
                        <StudentAttendanceCard key={student.id} student={student} selectedDate={selectedDate} onUpdateStudent={onUpdateStudent} onSelectStudent={onSelectStudent} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-800 rounded-lg">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                    <h3 className="mt-2 text-lg font-medium text-white">All Done!</h3>
                    <p className="mt-1 text-sm text-gray-400">All enrolled students for today have been marked.</p>
                </div>
            )}
        </div>
    );
};

const StudentList = ({ students, onSelectStudent, onAddStudent }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active'); // 'all', 'active', 'inactive'

    const filteredStudents = useMemo(() => {
        return students
            .filter(student => {
                if (statusFilter === 'all') return true;
                if (statusFilter === 'active') return student.isActive;
                if (statusFilter === 'inactive') return !student.isActive;
                return true;
            })
            .filter(student => 
                student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (student.parentName && student.parentName.toLowerCase().includes(searchTerm.toLowerCase()))
            );
    }, [students, searchTerm, statusFilter]);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-white">Manage Students</h2>
                <button onClick={onAddStudent} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full md:w-auto">
                    <UserPlus className="h-5 w-5" />
                    <span>Add Student</span>
                </button>
            </div>
            <div className="mb-4 p-4 bg-gray-800 rounded-lg flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search by student or parent name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white"
                    />
                </div>
                <div className="flex-shrink-0 bg-gray-700 rounded-lg p-1 flex">
                    <button onClick={() => setStatusFilter('active')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-gray-300'}`}>Active</button>
                    <button onClick={() => setStatusFilter('inactive')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'inactive' ? 'bg-yellow-600 text-white' : 'text-gray-300'}`}>Inactive</button>
                    <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'all' ? 'bg-gray-500 text-white' : 'text-gray-300'}`}>All</button>
                </div>
            </div>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Parent Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Package</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Waiver</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                <tr key={student.id} onClick={() => onSelectStudent(student.id)} className="hover:bg-gray-700/50 cursor-pointer">
                                    <td className="px-6 py-4"><Circle className={`h-4 w-4 ${student.isActive ? 'text-emerald-500' : 'text-yellow-500'}`} fill="currentColor" /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{student.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{student.parentName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{student.package}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {student.waiverSigned ? <Check className="h-5 w-5 text-green-400 mx-auto" /> : <X className="h-5 w-5 text-red-400 mx-auto" />}
                                    </td>
                                </tr>
                            )) : (
                               <tr><td colSpan="5" className="text-center py-10 text-gray-400">No students match your search.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StudentForm = ({ onSave, onCancel, student = {} }) => {
    const [formData, setFormData] = useState({
        name: student.name || '',
        parentName: student.parentName || '',
        contact: student.contact || '',
        package: student.package || '1-day',
        enrolledDays: student.enrolledDays || [],
        waiverSigned: student.waiverSigned || false,
        isActive: student.isActive === undefined ? true : student.isActive,
    });

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const handleDayToggle = (day) => {
        const currentDays = formData.enrolledDays;
        if (currentDays.includes(day)) {
            setFormData({ ...formData, enrolledDays: currentDays.filter(d => d !== day) });
        } else {
            setFormData({ ...formData, enrolledDays: [...currentDays, day] });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.contact) {
            alert("Please fill in the student's name and contact information.");
            return;
        }
        onSave(formData);
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">{student.id ? 'Edit Student' : 'Add New Student'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Student Name</label>
                        <input type="text" id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-white" required />
                    </div>
                     <div>
                        <label htmlFor="parentName" className="block text-sm font-medium text-gray-300">Parent Name</label>
                        <input type="text" id="parentName" value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-white" />
                    </div>
                </div>
                 <div>
                    <label htmlFor="contact" className="block text-sm font-medium text-gray-300">Contact Details (Phone/Email)</label>
                    <input type="text" id="contact" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-white" required />
                </div>
                <div>
                    <label htmlFor="package" className="block text-sm font-medium text-gray-300">Package</label>
                    <select id="package" value={formData.package} onChange={e => setFormData({...formData, package: e.target.value})} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-white">
                        <option>1-day</option>
                        <option>2-day</option>
                        <option>Adult</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Enrolled Days</label>
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {daysOfWeek.map(day => (
                            <button type="button" key={day} onClick={() => handleDayToggle(day)} className={`p-2 rounded-md text-sm font-semibold transition-colors ${formData.enrolledDays.includes(day) ? 'bg-emerald-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}>
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                    <div className="flex items-center">
                        <input id="waiver" type="checkbox" checked={formData.waiverSigned} onChange={e => setFormData({...formData, waiverSigned: e.target.checked})} className="h-4 w-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500" />
                        <label htmlFor="waiver" className="ml-2 block text-sm text-gray-300">Liability Waiver Signed</label>
                    </div>
                    <div className="flex items-center">
                        <input id="isActive" type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="h-4 w-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500" />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-300">Active Student</label>
                    </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><Save className="h-5 w-5" /> Save</button>
                </div>
            </form>
        </div>
    );
};


const EditableNote = ({ note, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(note.text);

    const handleSave = () => {
        onUpdate({ ...note, text });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="bg-gray-700 p-3 rounded-md space-y-2">
                <textarea value={text} onChange={e => setText(e.target.value)} className="w-full bg-gray-600 border-gray-500 rounded-md p-2 text-white text-sm" rows="3"></textarea>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-2 rounded">Save</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-3 rounded-md group">
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{note.text}</p>
            <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400 font-semibold">{new Date(note.date + 'T00:00:00').toDateString()}</p>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setIsEditing(true)}><Edit size={14} className="text-yellow-400 hover:text-yellow-300" /></button>
                    <button onClick={() => onDelete(note.id)}><Trash2 size={14} className="text-red-500 hover:text-red-400" /></button>
                </div>
            </div>
        </div>
    );
};

const StudentDetail = ({ student, onUpdate, onDelete, onBack }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newPaymentAmount, setNewPaymentAmount] = useState('');
    const [paymentMonth, setPaymentMonth] = useState(new Date().toISOString().slice(0, 7));

    const monthOptions = useMemo(() => {
        const options = [];
        const d = new Date();
        d.setMonth(d.getMonth() + 2); // Start 2 months in the future
        for (let i = 0; i < 12; i++) {
            d.setMonth(d.getMonth() - 1);
            const monthString = d.toISOString().slice(0, 7);
            const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            options.push({ value: monthString, label: monthName });
        }
        return options;
    }, []);

    const handleAddPayment = () => {
        if (!newPaymentAmount.trim() || isNaN(parseFloat(newPaymentAmount)) || !paymentMonth) return;
        const payment = {
            id: crypto.randomUUID(),
            month: paymentMonth,
            amount: parseFloat(newPaymentAmount),
            dateReceived: new Date().toISOString()
        };
        const updatedPayments = [payment, ...(student.payments || [])];
        onUpdate(student.id, { payments: updatedPayments });
        setNewPaymentAmount('');
    };

    const handleDeletePayment = (paymentId) => {
        const updatedPayments = student.payments.filter(p => p.id !== paymentId);
        onUpdate(student.id, { payments: updatedPayments });
    };
    
    const handleUpdateNote = (updatedNote) => {
        const updatedNotes = student.notes.map(n => n.id === updatedNote.id ? updatedNote : n);
        onUpdate(student.id, { notes: updatedNotes });
    };

    const handleDeleteNote = (noteId) => {
        const updatedNotes = student.notes.filter(n => n.id !== noteId);
        onUpdate(student.id, { notes: updatedNotes });
    };
    
    const handleDeleteStudentWithConfirmation = () => {
        if (window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
            onDelete(student.id);
        }
    }

    const sortedPayments = useMemo(() => (student.payments || []).sort((a, b) => new Date(b.dateReceived) - new Date(a.dateReceived)), [student.payments]);
    const sortedNotes = useMemo(() => (student.notes || []).sort((a, b) => new Date(b.date) - new Date(a.date)), [student.notes]);
    const sortedAttendance = useMemo(() => Object.entries(student.attendance || {}).sort((a, b) => new Date(b[0]) - new Date(a[0])), [student.attendance]);

    if (isEditing) {
        return <StudentForm student={student} onSave={(data) => { onUpdate(student.id, data); setIsEditing(false); }} onCancel={() => setIsEditing(false)} />;
    }

    return (
        <div>
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 mb-4 font-semibold">
                <ArrowLeft className="h-4 w-4" />
                Back to List
            </button>
            <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold text-white">{student.name}</h2>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${student.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                {student.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-gray-400 mt-1">
                            <UserCheck size={14} className="inline mr-2" />
                            Parent: {student.parentName || 'N/A'}
                        </p>
                        <p className="text-gray-400">{student.package} Package &bull; {student.contact}</p>
                        <p className="text-gray-400 text-sm mt-1">Enrolled Days: {student.enrolledDays?.join(', ') || 'None'}</p>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => setIsEditing(true)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg" title="Edit Student Info"><Edit className="h-5 w-5 text-yellow-400" /></button>
                         <button onClick={handleDeleteStudentWithConfirmation} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg" title="Delete Student"><Trash2 className="h-5 w-5 text-red-500" /></button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                            <h3 className="font-bold text-lg text-white mb-3">Payment History</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                                <select value={paymentMonth} onChange={e => setPaymentMonth(e.target.value)} className="sm:col-span-1 bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm">
                                    {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                                <input type="number" value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value)} placeholder="Amount" className="sm:col-span-1 flex-grow bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm" />
                                <button onClick={handleAddPayment} title="Record Payment" className="sm:col-span-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold p-2 rounded-lg flex items-center justify-center gap-2"><DollarSign className="h-5 w-5" /><span>Record</span></button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {sortedPayments.length > 0 ? sortedPayments.map((payment) => (
                                    <div key={payment.id} className="bg-gray-800 p-2 rounded-md flex justify-between items-center text-sm group">
                                        <div>
                                            <p className="text-green-300 font-semibold">Paid: ${payment.amount}</p>
                                            <p className="text-xs text-gray-400">For: {monthOptions.find(m => m.value === payment.month)?.label || payment.month}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs text-gray-400">{new Date(payment.dateReceived).toLocaleDateString()}</p>
                                            <button onClick={() => handleDeletePayment(payment.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} className="text-red-500 hover:text-red-400" /></button>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-gray-400 text-center py-4">No payment history.</p>}
                            </div>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                            <h3 className="font-bold text-lg text-white mb-3">Attendance History</h3>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {sortedAttendance.length > 0 ? sortedAttendance.map(([date, status]) => (
                                    <div key={date} className="bg-gray-800 p-2 rounded-md flex justify-between items-center text-sm">
                                        <p className="text-gray-200">{new Date(date + 'T00:00:00').toDateString()}</p>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${status === 'present' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{status}</span>
                                    </div>
                                )) : <p className="text-sm text-gray-400 text-center py-4">No attendance history.</p>}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-lg flex flex-col">
                        <h3 className="font-bold text-lg text-white mb-3 flex-shrink-0">All Player Notes</h3>
                        <div className="flex-grow overflow-y-auto space-y-3">
                            {sortedNotes.length > 0 ? sortedNotes.map((note) => (
                                <EditableNote key={note.id} note={note} onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
                            )) : <p className="text-sm text-gray-400 text-center py-4">No notes for this player.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
