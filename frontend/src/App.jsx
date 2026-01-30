import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import FaceScan from './TestingTemp/FaceScan'
// import FaceScanFlow from './TestingTemp/FaceScanFlow'
// import ExitUi from './FaceScanFlowTemp/ExitUi'
import AttendancePage from './pages/AttendancePage'
import HomePage from './pages/HomePage'
import AdminDashboard  from './pages/AdminDashboard'
import AdminStudentsPage from './pages/AdminStudents'
import AdminSettings from './pages/AdminSettings'
import StudentDetail from './pages/StudentDetail'
import AddStudent from "./components/Admin/StudentManagement/AddStudent";

function App() {

  return (
    <Router>
         <Routes>
            <Route path="/" element={<AttendancePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<AdminStudentsPage />} />
            <Route path="/admin/students/add" element={<AddStudent />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/student" element={<StudentDetail />} />
            <Route path="/admin/student/:rollNo" element={<StudentDetail />} />
         </Routes>
    </Router>
  )
}

export default App

    // <>
    //   {/* <FaceScan /> */}
    //   {/* <FaceScanFlow />*/}
    //   {/* <ExitUi />*/}
    //   <AttendancePage />
    // </>