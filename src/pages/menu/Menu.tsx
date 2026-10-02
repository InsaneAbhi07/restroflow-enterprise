import { useState } from 'react'
import { BookOpen, Download, FolderTree, Layers, Smartphone, UtensilsCrossed } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { Button, PageHeader, Tabs } from '@/components/ui'
import { ItemsTab } from './ItemsTab'
import { CategoriesTab } from './CategoriesTab'
import { ModifiersTab } from './ModifiersTab'
import { PreviewTab } from './PreviewTab'

type Tab = 'items' | 'categories' | 'modifiers' | 'preview'

export default function Menu() {
  const menu = useStore((s) => s.menu)
  const categories = useStore((s) => s.categories)
  const { can } = usePermission()
  const [tab, setTab] = useState<Tab>('items')
  const out = menu.filter((m) => !m.available).length

  const exportCsv = () => {
    const rows = [['Code', 'Short', 'Name', 'Category', 'Price', 'GST', 'Veg', 'Station', 'Available'],
      ...menu.map((m) => [m.code, m.short, m.name, categories.find((c) => c.id === m.categoryId)?.name ?? '', m.price, m.gst, m.veg ? 'Veg' : 'Non-veg', m.station, m.available ? 'Yes' : 'No'])]
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'menu-items.csv'; a.click()
    toast.success('Menu exported', `${menu.length} items · menu-items.csv`)
  }

  return (
    <div>
      <PageHeader title="Menu Management" subtitle={`${menu.length} items · ${categories.length} categories · ${out} out of stock`}
        breadcrumbs={[{ label: 'Catalogue' }, { label: 'Menu' }]}
        actions={
          <>
            {can('menu', 'export') && <Button icon={<Download className="size-3.5" />} onClick={exportCsv}>Export CSV</Button>}
            <Button icon={<Smartphone className="size-3.5" />} onClick={() => setTab('preview')}>Preview menus</Button>
          </>
        } />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[
        { value: 'items', label: 'Items', count: menu.length, icon: <UtensilsCrossed className="size-3.5" /> },
        { value: 'categories', label: 'Categories', count: categories.length, icon: <FolderTree className="size-3.5" /> },
        { value: 'modifiers', label: 'Modifiers & Variants', icon: <Layers className="size-3.5" /> },
        { value: 'preview', label: 'Preview', icon: <BookOpen className="size-3.5" /> },
      ]} />
      {tab === 'items' && <ItemsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'modifiers' && <ModifiersTab />}
      {tab === 'preview' && <PreviewTab />}
    </div>
  )
}
