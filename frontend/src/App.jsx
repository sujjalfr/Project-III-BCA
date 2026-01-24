import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import FaceScan from './TestingTemp/FaceScan'
// import FaceScanFlow from './TestingTemp/FaceScanFlow'
// import ExitUi from './FaceScanFlowTemp/ExitUi'
import AttendancePage from './pages/AttendancePage'
import HomePage from './pages/HomePage'
import AdminDashboard  from './pages/AdminDashboard'
import AdminStudentsPage from './pages/AdminStudents'
import AdminAddStudent from './pages/AdminAddStudent'
import AdminSettings from './pages/AdminSettings'

function App() {

  return (
    <Router>
         <Routes>
            <Route path="/" element={<AttendancePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<AdminStudentsPage />} />
            <Route path="/admin/students/add" element={<AdminAddStudent />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
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