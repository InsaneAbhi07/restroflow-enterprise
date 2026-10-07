import { create } from 'zustand'

/** Transient UI state for global overlays (not persisted) */
interface UIState {
  search: boolean
  help: boolean
  mobilePreview: boolean
  demoPanel: boolean
  scenarios: boolean
  qrScan: boolean
  setSearch: (v: boolean) => void
  setHelp: (v: boolean) => void
  setMobilePreview: (v: boolean) => void
  setDemoPanel: (v: boolean) => void
  setScenarios: (v: boolean) => void
  setQrScan: (v: boolean) => void
}
export const useUI = create<UIState>((set) => ({
  search: false, help: false, mobilePreview: false, demoPanel: false, scenarios: false, qrScan: false,
  setSearch: (search) => set({ search }),
  setHelp: (help) => set({ help }),
  setMobilePreview: (mobilePreview) => set({ mobilePreview }),
  setDemoPanel: (demoPanel) => set({ demoPanel }),
  setScenarios: (scenarios) => set({ scenarios }),
  setQrScan: (qrScan) => set({ qrScan }),
}))
