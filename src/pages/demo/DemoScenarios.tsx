import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play, Presentation, Sparkles, Square, Wand2 } from 'lucide-react'
import { Badge, Button, Checkbox, DynIcon, Modal, Progress } from '@/components/ui'
import { useUI } from '@/components/layout/uiStore'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { cn } from '@/lib/format'
import { SCENARIOS, type Scenario } from './scenarios'
import { useDemo } from './demoStore'

export default function DemoScenarios() {
  const open = useUI((s) => s.scenarios)
  const setOpen = useUI((s) => s.setScenarios)
  const nav = useNavigate()
  const demo = useDemo()

  const start = (sc: Scenario) => {
    setOpen(false)
    demo.start(sc.id)
    sc.steps[0].go({ nav })
    demo.toggleDone(sc.id, 0, true)
    toast.info(`Demo: ${sc.title}`, 'Follow the checklist at the bottom-left')
  }

  return (
    <>
      <Modal open={open} onClose={() => setOpen(false)} size="xl" icon={<Presentation />} title="Demo scenarios" subtitle="Guided walkthroughs — each sets up the right user, outlet and screen for you">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SCENARIOS.map((sc, i) => {
            const done = demo.done[sc.id]?.length ?? 0
            const active = demo.active === sc.id
            return (
              <div key={sc.id} className={cn('flex flex-col rounded-xl border bg-white p-4 transition hover:shadow-md', active ? 'border-brand-300 ring-2 ring-brand-100' : 'border-slate-200')}>
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: sc.color }}><DynIcon name={sc.icon} className="size-4.5" /></span>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Demo {i + 1}</p>
                    <h3 className="text-[13.5px] font-semibold leading-tight text-slate-900">{sc.title}</h3>
                  </div>
                  {active && <Badge tone="teal" className="ml-auto">Running</Badge>}
                </div>
                <p className="mt-2 text-[12px] text-slate-500">{sc.desc}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">{sc.persona}</p>
                <ol className="mt-3 flex-1 space-y-1">
                  {sc.steps.map((st, j) => (
                    <li key={j} className="flex items-start gap-2 text-[12px] text-slate-600">
                      <span className={cn('mt-px flex size-4 shrink-0 items-center justify-center rounded-full text-[9.5px] font-semibold', demo.done[sc.id]?.includes(j) ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500')}>{j + 1}</span>
                      {st.title}
                    </li>
                  ))}
                </ol>
                {done > 0 && <Progress className="mt-3" value={(done / sc.steps.length) * 100} />}
                <Button className="mt-3" block variant={active ? 'accent' : 'primary'} icon={<Play className="size-3.5" />} onClick={() => start(sc)}>{active ? 'Restart' : done ? 'Run again' : 'Start'}</Button>
              </div>
            )
          })}
          <div className="flex flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-[12px] text-slate-500">
            <Sparkles className="mb-2 size-5 text-amber-500" />
            <p className="font-medium text-slate-700">Presenter tips</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Each step's <b>Go</b> button navigates and sets up the state.</li>
              <li><b>Simulate</b> buttons complete an action instantly.</li>
              <li>Data is shared live between web, POS and mobile.</li>
              <li>Use Reset demo data in the demo panel to start fresh.</li>
            </ul>
          </div>
        </div>
      </Modal>
      <ScenarioPanel />
    </>
  )
}

function ScenarioPanel() {
  const nav = useNavigate()
  const demo = useDemo()
  const setScenarios = useUI((s) => s.setScenarios)
  const setUser = useStore((s) => s.setUser)
  const setOutlet = useStore((s) => s.setOutlet)
  const sc = SCENARIOS.find((s) => s.id === demo.active)
  if (!sc) return null
  const done = demo.done[sc.id] ?? []
  const pct = (done.length / sc.steps.length) * 100
  const cur = Math.min(demo.step, sc.steps.length - 1)

  const goTo = (i: number) => {
    demo.setStep(i)
    sc.steps[i].go({ nav })
    demo.toggleDone(sc.id, i, true)
  }
  const end = () => {
    demo.end()
    useUI.getState().setMobilePreview(false)
    setUser('u1'); setOutlet('all'); nav('/')
    toast.success('Demo ended', 'Back to the owner view')
  }

  if (demo.collapsed) {
    return createPortal(
      <button onClick={() => demo.setCollapsed(false)} className="fixed bottom-4 left-4 z-[105] flex items-center gap-2 rounded-full bg-navy-900 py-2 pl-3 pr-4 text-[12px] font-medium text-white shadow-pop hover:bg-navy-800">
        <Wand2 className="size-3.5 text-brand-300" />{sc.title}<span className="text-navy-300">{done.length}/{sc.steps.length}</span><ChevronUp className="size-3.5" />
      </button>,
      document.body,
    )
  }

  return createPortal(
    <div className="fixed bottom-4 left-4 z-[105] w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop animate-slide-up">
      <div className="bg-navy-900 px-3.5 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md" style={{ background: sc.color }}><DynIcon name={sc.icon} className="size-3.5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-300">Demo scenario</p>
            <p className="truncate text-[12.5px] font-semibold">{sc.title}</p>
          </div>
          <button title="Collapse" onClick={() => demo.setCollapsed(true)} className="rounded p-1 text-navy-200 hover:bg-white/10"><ChevronDown className="size-4" /></button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-brand-400 transition-all" style={{ width: pct + '%' }} /></div>
          <span className="text-[10.5px] text-navy-200">{done.length}/{sc.steps.length}</span>
        </div>
      </div>
      <div className="max-h-[46vh] overflow-y-auto p-1.5">
        {sc.steps.map((st, i) => {
          const isDone = done.includes(i)
          const isCur = i === cur
          return (
            <div key={i} className={cn('rounded-lg px-2 py-1.5 transition', isCur ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50')}>
              <div className="flex items-center gap-2">
                <Checkbox checked={isDone} onChange={(v) => demo.toggleDone(sc.id, i, v)} />
                <button onClick={() => demo.setStep(i)} className={cn('min-w-0 flex-1 truncate text-left text-[12px]', isDone ? 'text-slate-400 line-through' : 'font-medium text-slate-800')}>{i + 1}. {st.title}</button>
                <Button size="xs" variant={isCur ? 'accent' : 'outline'} onClick={() => goTo(i)}>Go</Button>
              </div>
              {isCur && (
                <div className="ml-6 mt-1">
                  <p className="text-[11px] leading-snug text-slate-500">{st.hint}</p>
                  {st.sim && <Button size="xs" variant="ghost" className="mt-1 -ml-2 text-brand-700" icon={<Wand2 className="size-3" />} onClick={() => { st.sim!.run({ nav }); demo.toggleDone(sc.id, i, true) }}>{st.sim.label}</Button>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/70 px-2 py-2">
        <Button size="xs" icon={<ChevronLeft className="size-3" />} disabled={cur === 0} onClick={() => goTo(cur - 1)}>Prev</Button>
        <Button size="xs" variant="primary" iconRight={<ChevronRight className="size-3" />} disabled={cur >= sc.steps.length - 1} onClick={() => goTo(cur + 1)}>Next</Button>
        <button onClick={() => setScenarios(true)} className="ml-auto text-[11px] font-medium text-slate-500 hover:text-slate-800">All scenarios</button>
        <Button size="xs" variant="ghost" className="text-rose-600" icon={<Square className="size-3" />} onClick={end}>End demo</Button>
      </div>
    </div>,
    document.body,
  )
}
