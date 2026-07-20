import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import EBSConsole from './pages/EBSConsole'
import Dashboard from './pages/Dashboard'
import LegacyReplica from './pages/LegacyReplica'
import AccountOpening from './pages/AccountOpening'
import ManagerApproval from './pages/ManagerApproval'
import CheckStatus from './pages/CheckStatus'
import AuditConsole from './pages/AuditConsole'
import AgentPipeline from './pages/AgentPipeline'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<EBSConsole />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/audit" element={<AuditConsole />} />
        <Route path="/pipeline" element={<AgentPipeline />} />
        <Route path="/legacy" element={<LegacyReplica />} />
        <Route path="/live/account-opening" element={<AccountOpening />} />
        <Route path="/live/manager-approval" element={<ManagerApproval />} />
        <Route path="/live/check-status" element={<CheckStatus />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
