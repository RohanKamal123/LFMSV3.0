import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Gatekeeper from './pages/Gatekeeper';
import BrowseItems from './pages/BrowseItems';
import FoundItemForm from './pages/FoundItemForm';
import ReportLost from './pages/ReportLost';
import ClaimFlow from './pages/ClaimFlow';
import StaffPanel from './pages/StaffPanel';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import FastID from './pages/FastID';
import RoadAccidentsShowcase from './pages/RoadAccidentsShowcase';
import LFMSPortfolio from './pages/LFMSPortfolio';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public Gatekeeper Entry */}
                    <Route path="/" element={<Gatekeeper />} />
                    <Route path="/portfolio" element={<LFMSPortfolio />} />
                    <Route path="/project-info" element={<LFMSPortfolio />} />
                    <Route path="/road-accidents" element={<RoadAccidentsShowcase />} />

                    {/* Main App Layout */}
                    <Route element={<MainLayout />}>
                        {/* Student Access */}
                        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/browse" element={<BrowseItems />} />
                            <Route path="/found" element={<FoundItemForm />} />
                            <Route path="/report-lost" element={<ReportLost />} />
                            <Route path="/claim" element={<ClaimFlow />} />
                            <Route path="/fast-id" element={<FastID />} />
                        </Route>

                        {/* Staff Access */}
                        <Route element={<ProtectedRoute allowedRoles={['STAFF']} />}>
                            <Route path="/staff" element={<StaffPanel />} />
                        </Route>

                        {/* Admin Access */}
                        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                        </Route>
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
