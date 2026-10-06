import { NextRequest, NextResponse } from 'next/server';

const defaultOfficers = [
  {
    id: "usr_1",
    officerId: "SSD-OFF-2026-001",
    batchNo: "BATCH-2026/EXEC",
    full_name: "Commander-in-Chief (Super Admin)",
    name: "Commander-in-Chief (Super Admin)",
    email: "admin@ssd.org",
    role: "super_admin",
    role_id: "super_admin",
    department: "Supreme Command Council",
    status: "Active",
    phone: "+91 98220 11927",
    primaryJurisdiction: { state_name: "All-India", district_name: "National HQ" }
  },
  {
    id: "usr_2",
    officerId: "SSD-OFF-2026-002",
    batchNo: "BATCH-2026/EXEC",
    full_name: "Commander Ravindra Gautam",
    name: "Commander Ravindra Gautam",
    email: "secretary@ssd.org",
    role: "executive",
    role_id: "executive",
    department: "National Executive Secretariat",
    status: "Active",
    phone: "+91 94221 21927",
    primaryJurisdiction: { state_name: "Maharashtra", district_name: "Nagpur" }
  },
  {
    id: "usr_3",
    officerId: "SSD-OFF-2026-003",
    batchNo: "BATCH-2026/EXEC",
    full_name: "Prof. Mahendra Khobragade",
    name: "Prof. Mahendra Khobragade",
    email: "finance@ssd.org",
    role: "treasurer",
    role_id: "treasurer",
    department: "National Treasury & Audit Bureau",
    status: "Active",
    phone: "+91 98223 31927",
    primaryJurisdiction: { state_name: "Maharashtra", district_name: "Nagpur" }
  },
  {
    id: "usr_4",
    officerId: "SSD-OFF-2026-004",
    batchNo: "BATCH-2026/EXEC",
    full_name: "Capt. Anand Meshram",
    name: "Capt. Anand Meshram",
    email: "media@ssd.org",
    role: "media",
    role_id: "media",
    department: "Gazette & Public Relations Cell",
    status: "Active",
    phone: "+91 98224 41927",
    primaryJurisdiction: { state_name: "Maharashtra", district_name: "Nagpur" }
  },
  {
    id: "usr_enlistment",
    officerId: "SSD-OFF-2026-005",
    batchNo: "BATCH-2026/EXEC",
    full_name: "Commander Surendra Meshram",
    name: "Commander Surendra Meshram",
    email: "approvals@ssd.org",
    role: "enlistment_officer",
    role_id: "enlistment_officer",
    department: "National Enlistment & Scrutiny Board",
    status: "Active",
    phone: "+91 98225 51927",
    primaryJurisdiction: { state_name: "Maharashtra", district_name: "Nagpur" }
  },
  {
    id: "usr_delhi",
    officerId: "SSD-OFF-2026-006",
    batchNo: "BATCH-2026/EXEC",
    full_name: "Commander Vikramjit Singh",
    name: "Commander Vikramjit Singh",
    email: "delhi@ssd.org",
    role: "state_official",
    role_id: "state_official",
    department: "Northern Directorate",
    status: "Active",
    phone: "+91 98110 61927",
    primaryJurisdiction: { state_name: "Delhi", district_name: "New Delhi" }
  },
  {
    id: "usr_up",
    officerId: "SSD-OFF-2026-007",
    batchNo: "BATCH-2026/EXEC",
    full_name: "Commander Ramakant Shastri",
    name: "Commander Ramakant Shastri",
    email: "up@ssd.org",
    role: "state_official",
    role_id: "state_official",
    department: "Awadh Regional Directorate",
    status: "Active",
    phone: "+91 94150 71927",
    primaryJurisdiction: { state_name: "Uttar Pradesh", district_name: "Lucknow" }
  }
];

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      officers: defaultOfficers
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
