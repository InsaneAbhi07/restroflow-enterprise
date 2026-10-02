import { useNavigate, useParams } from 'react-router-dom'
import { BarChart3, Clock } from 'lucide-react'
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui'
import { fmtDateTime } from '@/lib/format'
import { Catalogue } from './Catalogue'
import { ReportView } from './ReportView'
import { ReportsHome } from './ReportsHome'
import { REPORTS, reportById } from './registry'

export default function Reports() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const def = reportById(reportId)

  return (
    <div>
      <PageHeader
        title="Reports Center"
        icon={<BarChart3 />}
        subtitle={`${REPORTS.length} reports · Sales, Inventory, Operations & HRMS`}
        breadcrumbs={def ? [{ label: 'Reports', to: '/reports' }, { label: def.group }, { label: def.title }] : [{ label: 'Reports' }]}
        actions={<Badge tone="teal" dot><Clock className="size-3" /> Data as of {fmtDateTime(Date.now())}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Catalogue />
        <div className="min-w-0">
          {reportId && !def ? (
            <Card>
              <EmptyState title="Report not found" body={`No report with id “${reportId}”. Pick one from the catalogue.`} action={<Button variant="primary" onClick={() => navigate('/reports')}>Go to Reports Home</Button>} />
            </Card>
          ) : def ? (
            <ReportView key={def.id} def={def} />
          ) : (
            <ReportsHome />
          )}
        </div>
      </div>
    </div>
  )
}
