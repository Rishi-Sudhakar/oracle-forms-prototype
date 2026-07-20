import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import FormOverview from './pages/FormOverview';
import BlockDetail from './pages/BlockDetail';
import TriggerInspector from './pages/TriggerInspector';
import ApexMapping from './pages/ApexMapping';
import UILayoutPage from './pages/UILayoutPage';
import PageBlueprintView from './pages/PageBlueprintView';
import PageDesignerPreview from './pages/PageDesignerPreview';
import ProgramUnitsPage from './pages/ProgramUnitsPage';
import BusinessLogicMapPage from './pages/BusinessLogicMapPage';
import MigrationReadinessPage from './pages/MigrationReadinessPage';
import GeneratedCodePage from './pages/GeneratedCodePage';
import StepByStepPage from './pages/StepByStepPage';
import CustomPLBExplorerPage from './pages/CustomPLBExplorerPage';
import LoginPage from './pages/LoginPage';
import ApiKeyModal from './components/ApiKeyModal';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ApiKeyModal />
                <Routes>
                    {/* Public route */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected routes */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="upload" element={<UploadPage />} />
                        <Route path="analysis/:fileId" element={<FormOverview />} />
                        <Route path="analysis/:fileId/blocks/:blockName" element={<BlockDetail />} />
                        <Route path="analysis/:fileId/triggers" element={<TriggerInspector />} />
                        <Route path="analysis/:fileId/layout" element={<UILayoutPage />} />
                        <Route path="analysis/:fileId/blueprint" element={<PageBlueprintView />} />
                        <Route path="analysis/:fileId/designer" element={<PageDesignerPreview />} />
                        <Route path="analysis/:fileId/mapping" element={<ApexMapping />} />
                        <Route path="analysis/:fileId/program-units" element={<ProgramUnitsPage />} />
                        <Route path="analysis/:fileId/business-logic" element={<BusinessLogicMapPage />} />
                        <Route path="analysis/:fileId/migration-readiness" element={<MigrationReadinessPage />} />
                        <Route path="analysis/:fileId/generated" element={<GeneratedCodePage />} />
                        <Route path="analysis/:fileId/step-by-step" element={<StepByStepPage />} />
                        <Route path="analysis/:fileId/plb-explorer" element={<CustomPLBExplorerPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
