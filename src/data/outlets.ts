import type { Outlet } from '@/types'

export const ORG = {
  name: 'The Grand Kitchen',
  legal: 'Grand Kitchen Hospitality Pvt. Ltd.',
  tagline: 'Fine Indian & Oriental Dining',
  gstin: '09AAGCG4521K1Z7',
  cin: 'U55101UP2019PTC118742',
  pan: 'AAGCG4521K',
  email: 'accounts@grandkitchen.in',
  phone: '+91 120 455 7800',
  hq: 'Plot 14, Sector 62, Noida, Uttar Pradesh 201309',
  website: 'www.grandkitchen.in',
}

export const OUTLETS: Outlet[] = [
  {
    id: 'o1', code: 'GK-MB', name: 'The Grand Kitchen – Main Branch', short: 'Main Branch', city: 'Noida',
    address: 'Plot 14, Sector 62, Noida, UP 201309', phone: '+91 98110 45001', email: 'main@grandkitchen.in',
    manager: 'Amit Verma', hours: '11:00 AM – 11:30 PM', status: 'Open', gstin: '09AAGCG4521K1Z7', fssai: '12719005000418',
    seats: 120, factor: 1.0, color: '#1d3f70', openedOn: '2019-04-12',
  },
  {
    id: 'o2', code: 'GK-CC', name: 'The Grand Kitchen – City Center', short: 'City Center', city: 'Delhi',
    address: 'Block N, Connaught Place, New Delhi 110001', phone: '+91 98110 45002', email: 'citycenter@grandkitchen.in',
    manager: 'Sanjay Malhotra', hours: '11:00 AM – 12:00 AM', status: 'Open', gstin: '07AAGCG4521K1Z1', fssai: '13319005000622',
    seats: 90, factor: 0.82, color: '#14a891', openedOn: '2020-11-03',
  },
  {
    id: 'o3', code: 'GK-MO', name: 'The Grand Kitchen – Mall Outlet', short: 'Mall Outlet', city: 'Gurugram',
    address: 'Level 3, Ambience Mall, Gurugram, HR 122002', phone: '+91 98110 45003', email: 'mall@grandkitchen.in',
    manager: 'Pooja Arora', hours: '10:00 AM – 10:30 PM', status: 'Open', gstin: '06AAGCG4521K1Z3', fssai: '10819005000955',
    seats: 70, factor: 0.68, color: '#7c3aed', openedOn: '2022-02-18',
  },
  {
    id: 'o4', code: 'GK-HW', name: 'The Grand Kitchen – Highway Outlet', short: 'Highway Outlet', city: 'Murthal',
    address: 'NH-44, Murthal, Sonipat, HR 131027', phone: '+91 98110 45004', email: 'highway@grandkitchen.in',
    manager: 'Gurpreet Singh', hours: '24 Hours', status: 'Open', gstin: '06AAGCG4521K2Z2', fssai: '10819005001207',
    seats: 160, factor: 0.91, color: '#ea580c', openedOn: '2023-07-09',
  },
]

export const outletById = (id?: string) => OUTLETS.find((o) => o.id === id)
