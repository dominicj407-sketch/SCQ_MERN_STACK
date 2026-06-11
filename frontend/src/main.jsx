import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './home/page.jsx'

import PatientSignup from './pages/patientsignup.jsx'
import PatientLogin from './pages/patientlogin.jsx'
import Patientdashboard from './pages/Patientdashboard.jsx'
import BookAppointment from './pages/bookappointment.jsx'
import MyAppointments from './pages/myappointments.jsx'
import PatientProfile from './pages/profile.jsx'

import Stafflogin from './Staffpages/login.jsx'
import Staffdash from './Staffpages/dash.jsx'
import StaffprofileEditor from './Staffpages/profile.jsx'
import ViewQueue from './Staffpages/viewqueue.jsx'

import DoctorLogin from './DoctorPages/login.jsx'
import Doctordash from './DoctorPages/Dashboard.jsx'
import ProfileEditor from './DoctorPages/Doctorprofile.jsx'
import Daily from './DoctorPages/dailylimits.jsx'

import AdminDashboard from './admin/AdminDashboard.jsx'
import AdminLogin from './admin/AdminLogin.jsx'

import TVDisplay from './pages/TVDisplay.jsx'
import Kiosk from './pages/Kiosk.jsx'

createRoot(document.getElementById('root')).render(
   <>
      <BrowserRouter>
         <Routes>
            {/* Home */}
            <Route path='/' element={<Home />} />

            {/* Doctor Routes */}
            <Route path='/doctor/login' element={<DoctorLogin />} />
            <Route path='/Doctor/login' element={<DoctorLogin />} />
            <Route path='/doctor/dash' element={<Doctordash />} />
            <Route path='/Doctor/dash' element={<Doctordash />} />
            <Route path='/doctor/profile' element={<ProfileEditor />} />
            <Route path='/doctor/dailycapacity' element={<Daily />} />

            {/* Staff Routes */}
            <Route path='/staff/login' element={<Stafflogin />} />
            <Route path='/staff/dash' element={<Staffdash />} />
            <Route path='/staff/ViewQueue' element={<ViewQueue />} />
            <Route path='/staff/profile' element={<StaffprofileEditor />} />

            {/* Patient Routes */}
            <Route path='/patient/dash' element={<Patientdashboard />} />
            <Route path='/patient/signup' element={<PatientSignup />} />
            <Route path='/patient/login' element={<PatientLogin />} />
            <Route path='/patient/appointments' element={<MyAppointments />} />
            <Route path='/patient/book' element={<BookAppointment />} />
            <Route path='/patient/profile' element={<PatientProfile />} />

            {/* Admin Routes */}
            <Route path='/admin/login' element={<AdminLogin />} />
            <Route path='/admin/dash' element={<AdminDashboard />} />

            {/* Public TV & Kiosk Screens */}
            <Route path='/tv-display' element={<TVDisplay />} />
            <Route path='/kiosk' element={<Kiosk />} />
         </Routes>
      </BrowserRouter>
   </>
)
