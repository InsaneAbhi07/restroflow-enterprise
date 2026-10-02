import type { Material, PurchaseOrder, Recipe, StockMovement, StockTransfer, Supplier } from '@/types'
import { seeded } from '@/lib/rand'
import { isoDate } from '@/lib/format'

const R = seeded(42)
const dAgo = (n: number) => isoDate(new Date(Date.now() - n * 864e5))
const dAhead = (n: number) => isoDate(new Date(Date.now() + n * 864e5))

export const SUPPLIERS: Supplier[] = [
  ['Fresh Farms Agro', 'Vegetables', 'Ravi Bansal', 'Azadpur Mandi, Delhi'],
  ['Amul Dairy Distributors', 'Dairy', 'Nitin Jain', 'Noida'],
  ['Punjab Poultry Co.', 'Meat & Poultry', 'Harjeet Gill', 'Sonipat'],
  ['Spice Route Traders', 'Spices', 'Mukesh Agarwal', 'Khari Baoli, Delhi'],
  ['Annapurna Grains', 'Grains & Flour', 'Sunil Goyal', 'Ghaziabad'],
  ['Coastal Seafood Supply', 'Seafood', 'Joseph D’Souza', 'Okhla, Delhi'],
  ['Pure Oils Pvt Ltd', 'Oils & Ghee', 'Rakesh Mittal', 'Gurugram'],
  ['BevCo Beverages', 'Beverages', 'Anil Kapoor', 'Faridabad'],
  ['PackRight Solutions', 'Packaging', 'Sameer Khan', 'Noida Phase 2'],
  ['CleanPro Supplies', 'Housekeeping', 'Vivek Rana', 'Gurugram'],
].map(([name, category, contact, city], i) => ({
  id: 's' + (i + 1), code: 'SUP' + String(101 + i), name, category, contact, city,
  phone: '+91 98' + String(71000000 + i * 104729).slice(0, 8),
  email: name.toLowerCase().split(' ')[0] + '@supplier.in',
  gstin: '0' + ((i % 3) + 6) + 'AAB' + 'CDEFGHIJKL'[i] + 'F' + (5000 + i * 37) + 'Q1Z' + i,
  rating: [4.6, 4.8, 4.2, 4.5, 4.4, 3.9, 4.3, 4.7, 4.1, 4.0][i],
  outstanding: [42500, 18200, 67800, 9400, 22100, 31500, 15600, 8800, 4200, 2600][i],
  terms: ['7 days', '15 days', 'Immediate', '30 days'][i % 4],
}))

type MRow = [name: string, cat: string, unit: string, min: number, cost: number, base: number, sup: string, expiryDays?: number]
const MROWS: MRow[] = [
  ['Paneer', 'Dairy', 'kg', 15, 380, 32, 's2', 4],
  ['Butter (Amul)', 'Dairy', 'kg', 10, 520, 18, 's2', 25],
  ['Fresh Cream', 'Dairy', 'ltr', 8, 240, 14, 's2', 5],
  ['Curd', 'Dairy', 'kg', 10, 70, 22, 's2', 3],
  ['Milk', 'Dairy', 'ltr', 20, 60, 45, 's2', 2],
  ['Cheese (Processed)', 'Dairy', 'kg', 5, 460, 8, 's2', 40],
  ['Chicken (Curry Cut)', 'Meat & Poultry', 'kg', 20, 220, 38, 's3', 2],
  ['Chicken Boneless', 'Meat & Poultry', 'kg', 15, 310, 26, 's3', 2],
  ['Mutton', 'Meat & Poultry', 'kg', 10, 720, 14, 's3', 2],
  ['Fish (Basa)', 'Seafood', 'kg', 6, 340, 5, 's6', 3],
  ['Eggs', 'Meat & Poultry', 'tray', 4, 210, 9, 's3', 10],
  ['Onion', 'Vegetables', 'kg', 40, 32, 85, 's1', 20],
  ['Tomato', 'Vegetables', 'kg', 35, 28, 30, 's1', 6],
  ['Potato', 'Vegetables', 'kg', 30, 24, 70, 's1', 25],
  ['Capsicum', 'Vegetables', 'kg', 10, 60, 12, 's1', 6],
  ['Ginger Garlic Paste', 'Vegetables', 'kg', 8, 140, 11, 's1', 15],
  ['Green Chilli', 'Vegetables', 'kg', 3, 80, 4, 's1', 5],
  ['Coriander Leaves', 'Vegetables', 'kg', 2, 90, 1.5, 's1', 2],
  ['Sweet Corn', 'Vegetables', 'kg', 6, 110, 9, 's1', 30],
  ['Basmati Rice', 'Grains & Flour', 'kg', 50, 110, 140, 's5'],
  ['Maida', 'Grains & Flour', 'kg', 40, 38, 95, 's5'],
  ['Atta (Wheat Flour)', 'Grains & Flour', 'kg', 40, 36, 110, 's5'],
  ['Urad Dal', 'Grains & Flour', 'kg', 15, 130, 28, 's5'],
  ['Rajma', 'Grains & Flour', 'kg', 10, 140, 18, 's5'],
  ['Kabuli Chana', 'Grains & Flour', 'kg', 10, 120, 7, 's5'],
  ['Dosa Batter', 'Grains & Flour', 'kg', 15, 60, 24, 's5', 2],
  ['Hakka Noodles', 'Grains & Flour', 'kg', 10, 120, 16, 's5', 120],
  ['Refined Oil', 'Oils & Ghee', 'ltr', 30, 145, 65, 's7'],
  ['Desi Ghee', 'Oils & Ghee', 'kg', 8, 620, 12, 's7', 90],
  ['Garam Masala', 'Spices', 'kg', 2, 780, 3.2, 's4'],
  ['Red Chilli Powder', 'Spices', 'kg', 3, 320, 5, 's4'],
  ['Turmeric Powder', 'Spices', 'kg', 2, 260, 4, 's4'],
  ['Kasuri Methi', 'Spices', 'kg', 1, 540, 0.6, 's4'],
  ['Soya Sauce', 'Spices', 'ltr', 4, 160, 7, 's4', 180],
  ['Sugar', 'Grains & Flour', 'kg', 25, 44, 60, 's5'],
  ['Coffee Powder', 'Beverages', 'kg', 2, 900, 3, 's8', 150],
  ['Tea Leaves', 'Beverages', 'kg', 3, 480, 6, 's8', 200],
  ['Mineral Water (1L)', 'Beverages', 'case', 10, 180, 28, 's8', 300],
  ['Takeaway Containers', 'Packaging', 'pcs', 300, 6, 1400, 's9'],
  ['Paper Bags', 'Packaging', 'pcs', 200, 4, 650, 's9'],
]

const FACT: Record<string, number> = { o1: 1, o2: 0.8, o3: 0.6, o4: 0.95 }
export const MATERIALS: Material[] = MROWS.map(([name, category, unit, min, cost, base, sup, exp], i) => {
  const stock: Record<string, number> = {}
  for (const o of ['o1', 'o2', 'o3', 'o4']) {
    let q = base * FACT[o] * R.range(0.55, 1.35)
    // force some low / out of stock rows for realism
    if ((i === 0 && o === 'o3') || (i === 8 && o === 'o2') || (i === 17 && o === 'o1') || (i === 29 && o === 'o4')) q = min * 0.5
    if ((i === 9 && o === 'o1') || (i === 24 && o === 'o3')) q = 0
    if (i === 6 && o === 'o1') q = min * 0.7
    stock[o] = Math.round(q * 10) / 10
  }
  return {
    id: 'rm' + (i + 1), code: 'RM' + String(201 + i), name, category, unit,
    min: Math.round(min * 10) / 10, cost, stock, supplierId: sup,
    expiry: exp ? dAhead(Math.max(1, Math.round(exp * R.range(0.7, 1.5) + (i % 5 === 0 ? -2 : 3)))) : undefined,
  }
})
export const MATERIAL_CATEGORIES = [...new Set(MATERIALS.map((m) => m.category))]
export const materialById = (id: string) => MATERIALS.find((m) => m.id === id)

type Ing = [materialIndex: number, qty: number, unit: string, wastage?: number]
const RECIPE_DEFS: [menuId: string, ings: Ing[], prep: number][] = [
  ['m13', [[1, 0.15, 'kg'], [2, 0.03, 'kg'], [3, 0.04, 'ltr'], [13, 0.12, 'kg', 5], [12, 0.06, 'kg', 8], [16, 0.015, 'kg'], [33, 0.002, 'kg'], [30, 0.004, 'kg']], 18],
  ['m14', [[23, 0.08, 'kg'], [24, 0.02, 'kg'], [2, 0.03, 'kg'], [3, 0.03, 'ltr'], [13, 0.06, 'kg', 5], [16, 0.01, 'kg']], 25],
  ['m19', [[8, 0.22, 'kg'], [2, 0.035, 'kg'], [3, 0.05, 'ltr'], [13, 0.12, 'kg', 5], [16, 0.015, 'kg'], [33, 0.002, 'kg'], [30, 0.005, 'kg']], 22],
  ['m1', [[1, 0.2, 'kg', 3], [4, 0.05, 'kg'], [15, 0.04, 'kg', 10], [12, 0.04, 'kg', 8], [31, 0.004, 'kg'], [28, 0.015, 'ltr']], 15],
  ['m3', [[8, 0.25, 'kg', 4], [4, 0.06, 'kg'], [16, 0.015, 'kg'], [31, 0.005, 'kg'], [28, 0.015, 'ltr']], 18],
  ['m43', [[7, 0.25, 'kg', 3], [20, 0.15, 'kg'], [12, 0.08, 'kg', 8], [4, 0.05, 'kg'], [29, 0.02, 'kg'], [30, 0.004, 'kg']], 35],
  ['m26', [[1, 0.18, 'kg', 3], [15, 0.05, 'kg', 10], [12, 0.05, 'kg', 8], [34, 0.015, 'ltr'], [21, 0.03, 'kg'], [28, 0.04, 'ltr']], 12],
  ['m23', [[27, 0.15, 'kg'], [15, 0.04, 'kg', 10], [12, 0.04, 'kg', 8], [34, 0.01, 'ltr'], [28, 0.025, 'ltr']], 10],
  ['m30', [[26, 0.18, 'kg'], [14, 0.1, 'kg', 6], [12, 0.03, 'kg', 8], [28, 0.02, 'ltr']], 8],
  ['m36', [[21, 0.09, 'kg'], [4, 0.01, 'kg'], [2, 0.01, 'kg']], 4],
  ['m48', [[5, 0.25, 'ltr'], [36, 0.01, 'kg'], [35, 0.03, 'kg']], 4],
  ['m47', [[5, 0.1, 'ltr'], [37, 0.005, 'kg'], [35, 0.012, 'kg']], 5],
  ['m42', [[20, 0.15, 'kg'], [14, 0.08, 'kg', 6], [15, 0.03, 'kg', 10], [4, 0.04, 'kg'], [29, 0.015, 'kg']], 30],
  ['m53', [[5, 0.12, 'ltr'], [35, 0.04, 'kg'], [21, 0.03, 'kg'], [28, 0.03, 'ltr']], 10],
  ['m59', [[25, 0.12, 'kg'], [21, 0.12, 'kg'], [12, 0.04, 'kg', 8], [28, 0.06, 'ltr'], [4, 0.1, 'kg']], 20],
]
export const RECIPES: Recipe[] = RECIPE_DEFS.map(([menuItemId, ings, prepTime], i) => ({
  id: 'rc' + (i + 1), code: 'BOM' + String(301 + i), menuItemId, yield: 1, prepTime,
  ingredients: ings.map(([mi, qty, unit, w]) => ({ materialId: 'rm' + (mi), qty, unit, wastage: w ?? 2 })),
  method: 'Prepare base gravy, add main ingredient, finish with cream/butter and garnish. Follow plating SOP.',
}))

export const PURCHASE_ORDERS: PurchaseOrder[] = Array.from({ length: 14 }, (_, i) => {
  const sup = SUPPLIERS[i % SUPPLIERS.length]
  const mats = MATERIALS.filter((m) => m.supplierId === sup.id).slice(0, 4)
  const statuses: PurchaseOrder['status'][] = ['Received', 'Received', 'Approved', 'Pending Approval', 'Received', 'Partially Received', 'Draft', 'Received', 'Returned', 'Approved', 'Received', 'Pending Approval', 'Received', 'Cancelled']
  const status = statuses[i]
  return {
    id: 'po' + (i + 1), no: 'PO/25-26/' + String(1180 + i), supplierId: sup.id, outletId: ['o1', 'o2', 'o3', 'o4'][i % 4],
    date: dAgo(14 - i), expected: dAgo(12 - i), status, createdBy: i % 2 ? 'Priya Sharma' : 'Amit Verma',
    grnNo: status === 'Received' || status === 'Partially Received' ? 'GRN/' + String(870 + i) : undefined,
    items: (mats.length ? mats : MATERIALS.slice(i, i + 3)).map((m) => {
      const qty = Math.max(1, Math.round(m.min * R.range(1, 2.5)))
      return { materialId: m.id, qty, rate: m.cost, received: status === 'Received' ? qty : status === 'Partially Received' ? Math.round(qty / 2) : 0 }
    }),
  }
})

export const STOCK_TRANSFERS: StockTransfer[] = [
  { id: 'st1', no: 'TRF-0412', from: 'o1', to: 'o3', date: dAgo(6), items: [{ materialId: 'rm1', qty: 8 }, { materialId: 'rm3', qty: 4 }], status: 'Received', createdBy: 'Priya Sharma', approvedBy: 'Rahul Sharma', log: [] },
  { id: 'st2', no: 'TRF-0413', from: 'o4', to: 'o2', date: dAgo(4), items: [{ materialId: 'rm9', qty: 5 }], status: 'Received', createdBy: 'Gurpreet Singh', approvedBy: 'Rahul Sharma', log: [] },
  { id: 'st3', no: 'TRF-0414', from: 'o1', to: 'o2', date: dAgo(2), items: [{ materialId: 'rm20', qty: 25 }, { materialId: 'rm28', qty: 10 }], status: 'In Transit', createdBy: 'Priya Sharma', approvedBy: 'Rahul Sharma', log: [] },
  { id: 'st4', no: 'TRF-0415', from: 'o2', to: 'o3', date: dAgo(1), items: [{ materialId: 'rm25', qty: 3 }], status: 'Approved', createdBy: 'Sanjay Malhotra', approvedBy: 'Rahul Sharma', log: [] },
  { id: 'st5', no: 'TRF-0416', from: 'o4', to: 'o1', date: dAgo(0), items: [{ materialId: 'rm10', qty: 4 }, { materialId: 'rm7', qty: 10 }], status: 'Pending Approval', createdBy: 'Amit Verma', log: [] },
].map((t) => ({ ...t, status: t.status as StockTransfer['status'], log: [{ at: Date.now() - 864e5, text: `Created by ${t.createdBy}` }] }))

export function seedMovements(): StockMovement[] {
  const r = seeded(7)
  const types: StockMovement['type'][] = ['Purchase', 'Consumption', 'Consumption', 'Consumption', 'Adjustment', 'Wastage', 'Transfer In', 'Transfer Out']
  return Array.from({ length: 60 }, (_, i) => {
    const m = r.pick(MATERIALS)
    const type = r.pick(types)
    const sign = ['Consumption', 'Wastage', 'Transfer Out'].includes(type) ? -1 : 1
    return {
      id: 'mv' + i, at: Date.now() - i * 3.3 * 36e5, materialId: m.id, outletId: r.pick(['o1', 'o2', 'o3', 'o4']), type,
      qty: sign * Math.round(r.range(0.5, m.min) * 10) / 10,
      ref: type === 'Purchase' ? 'GRN/' + (860 + i) : type === 'Consumption' ? 'Sales auto-deduct' : type.startsWith('Transfer') ? 'TRF-04' + (10 + (i % 6)) : 'Manual',
      by: r.pick(['Priya Sharma', 'Vikram Singh', 'System', 'Amit Verma']),
    }
  })
}
