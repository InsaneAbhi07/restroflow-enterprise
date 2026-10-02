# RestroFlow Enterprise — Multi-Outlet Restaurant POS/ERP (Mock UI)

Frontend-only, client-presentation prototype. Everything is sample data and simulated, kept in browser
localStorage. There's no backend, real payment or printer integration. Browser printing of thermal receipts works.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

## Highlights
- **Multi-outlet:** 4 outlets plus "All Outlets" consolidated view in the top bar. Every module is outlet-scoped.
- **Role-based demo:** use the user menu (top right) to switch between 9 demo accounts. The sidebar, dashboards and actions change per role, and restricted pages show an access-denied screen.
- **Fast billing POS:** add items by numeric code (`113`), short code (`PBM`) or quantity syntax (`2*PBM`). Includes quick payment modes, KOT/print flows and an Express (text-tile) mode.
- **Thermal printing:** 80 mm / 58 mm bill, KOT and Day-End Z-report previews with real `window.print()`.
- **Staff mobile app:** `/mobile` or "Staff Mobile App" in the sidebar, using the same live data as the web.
- **QR ordering:** customer app at `/qr-order/o1/t_o1_2`.
- **Demo mode:** the "Demo Mode" badge opens the simulation panel, and the sidebar has "Demo Scenarios" with guided checklists.

## Keyboard
`Ctrl+K` search · `Ctrl+B` new bill · `F1` shortcuts · `F2` item search · `F4` settle · `F8` print · `F9` KOT · `Ctrl+S` save · `Esc` close · `Alt+←/→` back/forward

Demo PINs (mobile app): Rohit Kumar 5555 · Arjun Nair 1414 · Amit Verma 3333 · Neha Gupta 4444
