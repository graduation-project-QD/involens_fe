import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import StatsGrid from '../components/dashboard/StatsGrid'
import ActivityChart from '../components/dashboard/ActivityChart'
import DocumentsTable from '../components/documents/DocumentsTable'
import { dailyActivity, recentDocuments, statistics } from '../data/dashboard'

export default function DashboardPage() {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Tổng quan hoạt động xử lý hóa đơn"
        action={
          <Button onClick={() => navigate('/upload')}>
            <Plus size={14} />
            Tải hóa đơn mới
          </Button>
        }
      />
      <div className="space-y-5">
        <StatsGrid items={statistics} />
        <ActivityChart data={dailyActivity} />
        <DocumentsTable documents={recentDocuments} />
      </div>
    </>
  )
}
