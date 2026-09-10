'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import * as XLSX from 'xlsx'

// 1. MSM 고장 원인 중분류 및 대표 처리 구분 매핑
const CAUSE_CLASSIFICATIONS = [
  { code: 'A', label: '기타' },
  { code: 'B', label: '사용자부주의' },
  { code: 'F', label: '원자재불량' },
  { code: 'D', label: '악세서리불량' },
  { code: 'C', label: '성능불만족' },
  { code: 'E', label: '증상재현안됨' },
  { code: 'X', label: '미분류' },
]

const ACTION_CLASSIFICATIONS = [
  { code: 'PC00', label: '미결정' },
  { code: 'PC01', label: '부품교체' },
  { code: 'PC02', label: '사용자교육' },
  { code: 'PC03', label: '수리취소' },
  { code: 'PC04', label: '장비점검' },
  { code: 'PC05', label: '조정수리' },
  { code: 'PC06', label: '폐기' },
  { code: 'PC07', label: '장비교체' },
  { code: 'PC08', label: '소모품교체' },
]

// 2. 주문코드(품목코드) 기준 매출 구분 매핑 테이블 
const ORDER_CODE_MAP: Record<string, string> = {
  "MB0019_09": "상품", "MA0115_01": "서비스", "AR0110_00": "상품", "PG0305_00": "상품", "MA0420_00": "상품",
  "PG0330_02": "상품", "MA0335_04": "서비스", "MV0030_09": "제품", "AG0035_00": "OPTION", "PG0092_00": "서비스",
  "AF0094_01": "서비스", "114143": "MH100", "12518": "MV2000", "140404040": "상품", "AB0001_00": "서비스",
  "AB0002_00": "서비스", "AB0003_00": "서비스", "AB0004_00": "서비스", "AB0005_00": "서비스", "AB0005_01": "서비스",
  "AB0006_00": "서비스", "AB0006_01": "서비스", "AB0007_00": "서비스", "AB0008_00": "서비스", "AB0009_00": "서비스",
  "AB0010_00": "서비스", "AB0011_00": "서비스", "AB0012_00": "서비스", "AB0014_00": "서비스", "AB0016_00": "서비스",
  "AB0016_01": "서비스", "AB0017_00": "서비스", "AB0019_00": "서비스", "AB0020_00": "서비스", "AB0021_01": "서비스",
  "AB0022_00": "서비스", "AB0022_01": "서비스", "AB0022_02": "서비스", "AB0023_00": "서비스", "AB0024_00": "서비스",
  "AB0024_01": "서비스", "AB0024_02": "서비스", "AB0024_03": "서비스", "AB0024_04": "서비스", "AB0028_00": "서비스",
  "AB0028_01": "서비스", "AB0029_00": "서비스", "AB0030_00": "서비스", "AB0030_01": "서비스", "AB0033_00": "서비스",
  "AB0034_00": "서비스", "AB0035_00": "서비스", "AB0036_00": "서비스", "AB0038_00": "서비스", "AB0039_00": "서비스",
  "AB0040_00": "서비스", "AB0041_00": "서비스", "AB0043_00": "서비스", "AB0044_00": "서비스", "AB0045_00": "서비스",
  "AB0045_02": "서비스", "AB0046_00": "서비스", "AB0046_01": "서비스", "AB0047_00": "서비스", "AB0048_00": "서비스",
  "AB0049_00": "서비스", "AB0050_00": "서비스", "AB0052_00": "서비스", "AB0054_00": "서비스", "AB0058_00": "서비스",
  "AB0058_01": "서비스", "AB0058_02": "서비스", "AB0059_00": "서비스", "AB0060_00": "서비스", "AB0062_00": "서비스",
  "AB0063_00": "상품", "AB0064_02": "상품", "AB0064_03": "상품", "AB0069_01": "서비스", "AB0070_00": "서비스",
  "AB0070_01": "서비스", "AB0072_00": "서비스", "AB0074_00": "상품", "AB0074_01": "상품", "AB0074_02": "상품",
  "AB0074_03": "상품", "AB0074_04": "상품", "AB0074_05": "상품", "AB0081_00": "상품", "AB0085_01": "서비스",
  "AB0090_00": "서비스", "AB0091_00": "서비스", "AB0092_00": "서비스", "AB0093_00": "서비스", "AB0105_10": "상품",
  "AB0113_00": "상품", "AB0118_00": "서비스", "AC0004_01": "서비스", "AC0005_00": "상품", "AC0006_01": "상품",
  "AC0006_02": "상품", "AC0006_03": "상품", "AC0007_00": "상품", "AC0007_01": "상품", "AC0008_00": "상품",
  "AC0010_00": "서비스", "AC0011_00": "서비스", "AC0016_00": "서비스", "AC0017_00": "서비스", "AC0026_00": "상품",
  "AC0026_01": "상품", "AC0026_02": "상품", "AC0027_01": "서비스", "AC0027_02": "서비스", "AC0029_00": "서비스",
  "AC0035_00": "서비스", "AC0044_01": "서비스", "AC0046_01": "서비스", "AC0052_00": "상품", "AC0052_01": "상품",
  "AC0053_00": "상품", "AC0054_00": "상품", "AC0057_00": "서비스", "AC0065_00": "서비스", "AC0066_00": "서비스",
  "AC0067_00": "서비스", "AC0068_00": "서비스", "AC0069_00": "서비스", "AC0070_00": "서비스", "AC0071_00": "서비스",
  "AC0072_00": "서비스", "AC0073_00": "서비스", "AC0075_00": "서비스", "AC0076_00": "서비스", "AC0077_00": "서비스",
  "AC0079_01": "서비스", "AC0081_00": "서비스", "AC0082_00": "서비스", "AC0083_00": "서비스", "AC0085_00": "서비스",
  "AC0086_00": "서비스", "AC0087_00": "서비스", "AC0093_00": "서비스", "AC0097_00": "상품", "AC0098_00": "상품",
  "AC0099_00": "상품", "AC0100_00": "상품", "AC0101_00": "상품", "AC0102_00": "상품", "AC0105_00": "상품",
  "AC0106_00": "상품", "AC0107_00": "상품", "AC0108_00": "상품", "AC0109_00": "상품", "AC0111_00": "상품",
  "AC0114_00": "상품", "AC0114_01": "상품", "AC0115_00": "서비스", "AC0117_00": "상품", "AC0118_00": "상품",
  "AC0120_00": "상품", "AC0121_00": "서비스", "AC0122_00": "상품", "AC0124_00": "상품", "AC0126_00": "상품",
  "AC0127_00": "상품", "AC0128_00": "상품", "AC0131_00": "상품", "AC0132_00": "상품", "AC0133_00": "상품",
  "AC0138_00": "서비스", "AC0138_01": "서비스", "AC0138_02": "서비스", "AC0138_03": "서비스", "AC0140_00": "상품",
  "AC0144_00": "상품", "AC0144_01": "상품", "AC0145_00": "상품", "AC0145_01": "상품", "AC0145_02": "상품",
  "AC0147_00": "서비스", "AC0152_00": "서비스", "AC0157_00": "상품", "AC0157_01": "서비스", "AC0158_00": "상품",
  "AC0160_00": "상품", "AC0166_00": "서비스", "AC0167_00": "서비스", "AC0183_00": "상품", "AC0185_00": "상품",
  "AC0186_00": "상품", "AC0188_00": "상품", "AC0191_00": "서비스", "AC0193_00": "상품", "AC0200_00": "상품",
  "AC0201_00": "서비스", "AC0202_00": "서비스", "AC0203_00": "서비스", "AC0204_00": "서비스", "AC0207_00": "상품",
  "AC0212_00": "상품", "AC0212_01": "상품", "AC0218_00": "서비스", "AC0220_00": "서비스", "AC0229_00": "서비스",
  "AC0230_00": "서비스", "AC0231_00": "서비스", "AC0232_00": "서비스", "AC0234_00": "서비스", "AC0236_00": "서비스",
  "AC0237_00": "서비스", "AC0238_00": "서비스", "AC0240_00": "상품", "AC0250_00": "서비스", "AC0251_00": "서비스",
  "AC0258_00": "상품", "AC0284_00": "상품", "AC0286_00": "상품", "AC0338_00": "서비스", "AC0340_00": "상품",
  "AD0001_00": "서비스", "AD0002_00": "서비스", "AD0003_00": "서비스", "AD0004_00": "서비스", "AD0004_01": "서비스",
  "AD0005_00": "서비스", "AD0006_00": "서비스", "AD0007_00": "서비스", "AD0008_00": "서비스", "AD0008_01": "서비스",
  "AD0009_00": "서비스", "AD0009_01": "서비스", "AD0010_00": "서비스", "AD0011_00": "서비스", "AD0012_00": "서비스",
  "AD0013_00": "서비스", "AD0014_00": "서비스", "AD0015_00": "서비스", "AD0015_01": "서비스", "AD0017_00": "서비스",
  "AD0018_00": "서비스", "AD0019_00": "서비스", "AD0020_00": "서비스", "AE0001_00": "서비스", "AE0004_00": "서비스",
  "AE0005_00": "서비스", "AE0006_00": "서비스", "AE0007_00": "서비스", "AE0009_01": "서비스", "AE0010_00": "서비스",
  "AE0010_01": "서비스", "AE0011_00": "서비스", "AE0012_00": "서비스", "AE0013_01": "서비스", "AE0014_01": "서비스",
  "AE0015_01": "서비스", "AE0016_01": "서비스", "AE0017_01": "서비스", "AE0018_01": "서비스", "AE0019_01": "서비스",
  "AE0020_00": "서비스", "AE0021_00": "서비스", "AE0026_00": "서비스", "AE0027_00": "서비스", "AE0030_01": "서비스",
  "AE0032_00": "서비스", "AE0033_00": "서비스", "AE0034_00": "서비스", "AE0038_00": "서비스", "AE0048_00": "서비스",
  "AE0050_00": "서비스", "AE0051_00": "서비스", "AE0051_01": "서비스", "AE0051_02": "서비스", "AE0052_00": "서비스",
  "AE0052_02": "서비스", "AE0054_00": "서비스", "AE0055_00": "서비스", "AE0057_00": "서비스", "AE0058_00": "서비스",
  "AE0059_00": "서비스", "AE0061_00": "서비스", "AE0063_00": "서비스", "AE0064_00": "서비스", "AE0064_01": "SKD",
  "AE0065_00": "서비스", "AE0065_01": "SKD", "AE0066_00": "서비스", "AE0067_00": "서비스", "AE0068_02": "SKD",
  "AE0068_03": "서비스", "AE0069_00": "서비스", "AE0069_01": "SKD", "AE0070_00": "서비스", "AE0070_01": "SKD",
  "AE0071_00": "서비스", "AE0074_00": "서비스", "AE0076_02": "서비스", "AE0079_00": "서비스", "AE0086_00": "서비스",
  "AE0089_00": "서비스", "AE0092_00": "서비스", "AE0093_01": "서비스", "AE0094_00": "서비스", "AE0095_01": "서비스",
  "AE0096_00": "서비스", "AE0096_01": "서비스", "AE0097_00": "서비스", "AE0097_01": "서비스", "AE0098_00": "서비스",
  "AE0098_01": "서비스", "AE0099_00": "서비스", "AE0099_01": "서비스", "AE0100_00": "서비스", "AE0100_01": "서비스",
  "AE0101_00": "서비스", "AE0101_01": "서비스", "AE0102_00": "서비스", "AE0103_00": "서비스", "AE0104_00": "서비스",
  "AE0104_01": "서비스", "AE0105_00": "서비스", "AE0105_01": "서비스", "AE0106_00": "서비스", "AE0107_00": "서비스",
  "AE0108_00": "서비스", "AE0110_01": "서비스", "AE0111_00": "서비스", "AE0112_00": "서비스", "AE0113_00": "서비스",
  "AE0113_01": "서비스", "AE0114_00": "서비스", "AE0114_01": "서비스", "AE0115_00": "서비스", "AE0116_00": "서비스",
  "AE0119_01": "서비스", "AE0123_00": "서비스", "AE0123_01": "서비스", "AE0124_01": "서비스", "AE0125_01": "서비스",
  "AE0126_01": "서비스", "AE0127_00": "서비스", "AE0128_01": "서비스", "AE0129_01": "서비스", "AE0130_00": "서비스",
  "AE0132_01": "서비스", "AE0133_00": "서비스", "AE0134_01": "서비스", "AE0135_00": "서비스", "AE0136_00": "서비스",
  "AE0137_00": "서비스", "AE0138_01": "서비스", "AE0139_01": "서비스", "AE0140_01": "서비스", "AE0140_02": "서비스",
  "AE0141_00": "서비스", "AE0142_00": "서비스", "AE0142_01": "서비스", "AE0143_00": "서비스", "AE0143_01": "서비스",
  "AE0168_03": "서비스", "AE0169_00": "서비스", "AE0170_02": "서비스", "AE0171_00": "서비스", "AF0001_00": "서비스",
  "AF0028_01": "서비스", "AF0032_00": "서비스", "AF0038_02": "서비스", "AF0040_01": "서비스", "AF0040_02": "서비스",
  "AF0041_00": "서비스", "AF0043_01": "서비스", "AF0052_02": "서비스", "AF0058_02": "서비스", "AF0059_00": "서비스",
  "AF0067_01": "서비스", "AF0069_00": "서비스", "AF0083_00": "서비스", "AF0084_00": "상품", "AF0095_01": "서비스",
  "AF0121_00": "서비스", "AF0132_00": "서비스", "AF0132_01": "서비스", "AF0132_02": "서비스", "AF0137_01": "서비스",
  "AG0001_00": "서비스", "AG0002_00": "서비스", "AG0003_02": "기타", "AG0006_00": "OPTION", "AG0007_00": "OPTION",
  "AG0008_00": "OPTION", "AG0009_00": "OPTION", "AG0010_00": "OPTION", "AG0011_00": "OPTION", "AG0012_00": "OPTION",
  "AG0013_00": "OPTION", "AG0014_00": "OPTION", "AG0015_00": "OPTION", "AG0015_01": "OPTION", "AG0018_00": "OPTION",
  "AG0029_00": "OPTION", "AG0020_00": "기타", "AG0020_01": "운송비", "AG0021_00": "상품", "AG0022_00": "상품",
  "AG0023_00": "OPTION", "AG0024_00": "OPTION", "AG0025_00": "기타", "AG0026_00": "기타", "AG0028_00": "운송비",
  "MA0002_00": "서비스", "MA0003_00": "서비스", "MA0025_01": "서비스", "MA0025_04": "서비스", "MV0028_00": "MV2000",
  "MV0030_00": "MV50", "PG0001_00": "상품", "PG0001_07": "상품", "PG0023_02": "상품", "PG0027_02": "상품", "PG0141_01": "상품"
}

const getItemTypeByOrderCode = (orderCode: string, fallbackType: string) => {
  const code = String(orderCode || '').trim().toUpperCase()
  if (ORDER_CODE_MAP[code]) return ORDER_CODE_MAP[code]
  return fallbackType || '제품'
}

const getModelFromSN = (sn: string, originalModel?: string) => {
  const s = String(sn).toUpperCase()
  if (s.includes('MTV1K')) return 'MTV1000'
  if (s.includes('MV2000')) return 'MV2000'
  if (s.includes('MV50')) return 'MV50'
  if (s.includes('HFT700')) return 'HFT700'
  if (originalModel && originalModel !== 'nan' && !originalModel.includes('자동등록')) return originalModel
  return 'MEK-ICS Ventilator'
}

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false)
  const [session, setSession] = useState<any>(null)
  
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'home' | 'production' | 'sales' | 'service' | 'warranty'>('home')

  const [equipments, setEquipments] = useState<any[]>([])
  const [allServiceCases, setAllServiceCases] = useState<any[]>([])
  const [salesRecords, setSalesRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  
  const [prodSearch, setProdSearch] = useState('')
  const [salesSearch, setSalesSearch] = useState('')

  const [serialQuery, setSerialQuery] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [searchError, setSearchError] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadReport, setUploadReport] = useState<{
    show: boolean, type: string, total: number, inserted: number, duplicates: string[]
  }>({ show: false, type: '', total: 0, inserted: 0, duplicates: [] })

  const [showNewServiceModal, setShowNewServiceModal] = useState(false)
  const [newServiceSn, setNewServiceSn] = useState('')
  const [autoFetchedInfo, setAutoFetchedInfo] = useState<{
    hospital_name: string; product_model: string; isWarrantyIn: boolean; sales_date?: string; shipment_date?: string
  }>({ hospital_name: '', product_model: '', isWarrantyIn: true })

  const [serviceForm, setServiceForm] = useState({
    hospital_name: '', contact_person: '', contact_phone: '', email: '',
    symptom: '', problem_description: '', priority: 'Medium', classification: 'warranty in',
    cause_code: 'X', action_code: 'PC00', remark: ''
  })

  const [reportModalCase, setSelectedReportCase] = useState<any>(null)
  const [isEditingReport, setIsEditingReport] = useState(false)
  const [reportEditForm, setReportEditForm] = useState({
    reviewer: 'Scott Hong', reviewer_date: new Date().toISOString().slice(0, 10),
    classification: 'warranty in', cause_code: 'X', action_code: 'PC00', cause_analysis: '', repair_info: '',
    repair_period: '', repair_cost: 0, inspector: 'Scott Hong', processing_date: new Date().toISOString().slice(0, 10)
  })

  const prodFileInputRef = useRef<HTMLInputElement>(null)
  const salesFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMounted(true)
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadAllData()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadAllData()
    })

    return () => subscription.unsubscribe()
  }, [])

  // --- 🔍 생산이력 및 매출현황 검색 필터링 ---
  const filteredEquipments = equipments.filter((item: any) => {
    if (!prodSearch.trim()) return true
    const q = prodSearch.toLowerCase()
    return (
      (item.serial_number || '').toLowerCase().includes(q) ||
      (item.product_model || '').toLowerCase().includes(q) ||
      (item.hospital_name || '').toLowerCase().includes(q)
    )
  })

  const filteredSalesRecords = salesRecords.filter((item: any) => {
    if (!salesSearch.trim()) return true
    const q = salesSearch.toLowerCase()
    return (
      (item.serial_number || '').toLowerCase().includes(q) ||
      (item.customer_name || item.hospital_name || '').toLowerCase().includes(q) ||
      (item.item_name || item.product_model || '').toLowerCase().includes(q)
    )
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setLoginError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      setLoginError('로그인 실패: 이메일 또는 비밀번호를 확인해 주세요.')
    } else {
      setSession(data.session)
      loadAllData()
    }
    setAuthLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  const loadAllData = async () => {
    setLoading(true)
    const { data: eqData } = await supabase.from('equipments').select('*').order('manufacture_date', { ascending: false })
    if (eqData) setEquipments(eqData.map(eq => ({ ...eq, model_name: getModelFromSN(eq.serial_number, eq.model_name) })))

    const { data: caseData } = await supabase.from('service_cases').select('*').order('id', { ascending: false })
    if (caseData) setAllServiceCases(caseData)

    const { data: salesData } = await supabase.from('sales_records').select('*').order('sales_date', { ascending: false })
    if (salesData) setSalesRecords(salesData)

    setLoading(false)
  }

  const handleAutoFetchServiceInfo = async (sn: string) => {
    setNewServiceSn(sn)
    if (!sn.trim()) return

    const cleanSn = sn.trim().toUpperCase()
    const { data: eq } = await supabase.from('equipments').select('*').eq('serial_number', cleanSn).maybeSingle()
    const { data: sales } = await supabase.from('sales_records').select('*').eq('serial_number', cleanSn).maybeSingle()

    const hospital = sales?.customer_name || 'Symbiomed'
    const model = getModelFromSN(cleanSn, eq?.model_name)
    
    const refDateStr = sales?.sales_date || eq?.shipment_date || eq?.manufacture_date
    let isWarrantyIn = true
    if (refDateStr) {
      const refDate = new Date(refDateStr)
      const now = new Date()
      const diffYears = (now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      if (diffYears > 2) isWarrantyIn = false
    }

    setAutoFetchedInfo({
      hospital_name: hospital, product_model: model, isWarrantyIn: isWarrantyIn,
      sales_date: sales?.sales_date, shipment_date: eq?.shipment_date
    })

    setServiceForm(prev => ({
      ...prev, hospital_name: hospital, classification: isWarrantyIn ? 'warranty in' : 'warranty out'
    }))
  }

  const handleSubmitNewService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newServiceSn.trim()) return alert('시리얼 번호를 입력해주세요.')
    const caseNo = `CS-${Date.now().toString().slice(-6)}`

    setUploadingFiles(true)
    const uploadedUrls: string[] = []

    for (const file of attachedFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      const filePath = `cases/${fileName}`

      const { error } = await supabase.storage.from('service-attachments').upload(filePath, file)
      if (!error) {
        const { data: publicUrlData } = supabase.storage.from('service-attachments').getPublicUrl(filePath)
        if (publicUrlData.publicUrl) uploadedUrls.push(publicUrlData.publicUrl)
      } else {
        console.error('파일 업로드 에러:', error.message)
      }
    }
    setUploadingFiles(false)

    const { error } = await supabase.from('service_cases').insert([{
      case_number: caseNo,
      serial_number: newServiceSn.trim().toUpperCase(),
      hospital_name: serviceForm.hospital_name,
      contact_person: serviceForm.contact_person,
      contact_phone: serviceForm.contact_phone,
      email: serviceForm.email,
      product_model: autoFetchedInfo.product_model,
      symptom: serviceForm.symptom,
      problem_description: serviceForm.problem_description,
      priority: serviceForm.priority,
      classification: serviceForm.classification,
      cause_code: serviceForm.cause_code,
      action_code: serviceForm.action_code,
      status: 'Open',
      issue_description: serviceForm.symptom || serviceForm.problem_description,
      remark: serviceForm.remark,
      file_urls: uploadedUrls
    }])

    if (!error) {
      alert(`신규 서비스 접수 완료! (첨부파일 ${uploadedUrls.length}개 업로드됨)`)
      setShowNewServiceModal(false)
      setNewServiceSn('')
      setAttachedFiles([])
      setServiceForm({
        hospital_name: '', contact_person: '', contact_phone: '', email: '',
        symptom: '', problem_description: '', priority: 'Medium', classification: 'warranty in',
        cause_code: 'X', action_code: 'PC00', remark: ''
      })
      loadAllData()
    } else {
      alert(`접수 실패: ${error.message}`)
    }
  }

  const handleSaveReportProcessing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportModalCase) return

    const { error } = await supabase.from('service_cases').update({
      status: 'Closed',
      reviewer: reportEditForm.reviewer,
      cause_code: reportEditForm.cause_code,
      action_code: reportEditForm.action_code,
      cause_analysis: reportEditForm.cause_analysis,
      repair_info: reportEditForm.repair_info,
      repair_period: reportEditForm.repair_period,
      repair_cost: reportEditForm.repair_cost,
      inspector: reportEditForm.inspector,
      processing_date: reportEditForm.processing_date,
      classification: reportEditForm.classification,
      resolution_note: reportEditForm.repair_info
    }).eq('id', reportModalCase.id)

    if (!error) {
      alert('서비스 레포트 수리 내용이 저장되었습니다.')
      setIsEditingReport(false)
      loadAllData()
      setSelectedReportCase({
        ...reportModalCase, status: 'Closed', ...reportEditForm, resolution_note: reportEditForm.repair_info
      })
    } else {
      alert(`저장 실패: ${error.message}`)
    }
  }

  const handleSearch = async (e?: React.FormEvent, targetSn?: string) => {
    if (e) e.preventDefault()
    const query = (targetSn || serialQuery).trim()
    if (!query) return

    setSearchError(false)
    setSearchResult(null)
    if (targetSn) setSerialQuery(targetSn)

    setActiveTab('warranty')

    const { data: eq } = await supabase.from('equipments').select('*').eq('serial_number', query).maybeSingle()
    if (!eq) {
      setSearchError(true)
      return
    }

    eq.model_name = getModelFromSN(eq.serial_number, eq.model_name)

    const [installRes, warrantyRes, serviceRes, salesRes] = await Promise.all([
      supabase.from('installations').select('*').eq('serial_number', query).maybeSingle(),
      supabase.from('warranties').select('*').eq('serial_number', query).maybeSingle(),
      supabase.from('service_cases').select('*').eq('serial_number', query).order('id', { ascending: false }),
      supabase.from('sales_records').select('*').eq('serial_number', query).maybeSingle()
    ])

    setSearchResult({ equipment: eq, installation: installRes.data, warranty: warrantyRes.data, serviceCases: serviceRes.data || [], sales: salesRes.data })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'omega' | 'sales') => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()

    reader.onload = async (evt) => {
      try {
        const matrix: any[][] = XLSX.utils.sheet_to_json(XLSX.read(evt.target?.result, { type: 'array' }).Sheets[XLSX.read(evt.target?.result, { type: 'array' }).SheetNames[0]], { header: 1 })
        if (!matrix || matrix.length <= 1) { setUploading(false); return alert('파일 형식 오류.') }

        if (type === 'omega') {
          const rows: any[] = []
          matrix.forEach((row) => {
            const sn = String(row[3] || row[0] || '').trim()
            if (!sn || sn === 'SN' || sn === '품목코드' || sn.includes('제품생산이력')) return
            rows.push({
              serial_number: sn,
              model_name: getModelFromSN(sn, String(row[7] || '').trim()),
              manufacture_date: row[4] ? String(row[4]).replace(/\./g, '-').trim() : '2026-01-01',
              shipment_date: row[70] ? String(row[70]).replace(/\./g, '-').trim() : null,
              board_info: [String(row[8]||''), String(row[14]||'')].filter(x => x && x!=='LOT'&&x!=='MCU B/D'&&x!=='MAIN B/D').join(' | ') || 'Standard Board Set',
              sw_version: String(row[10]||'') || 'v1.0',
              status: row[70] ? 'Installed' : 'In Stock'
            })
          })
          
          if (rows.length === 0) { setUploading(false); return alert('유효한 생산 데이터가 없습니다.') }

          const { data: allEq } = await supabase.from('equipments').select('serial_number')
          const existingSns = new Set((allEq || []).map(e => e.serial_number))
          
          const duplicates: string[] = []
          rows.forEach(r => { if (existingSns.has(r.serial_number)) duplicates.push(r.serial_number) })

          await supabase.from('equipments').upsert(rows, { onConflict: 'serial_number' })
          setUploadReport({ show: true, type: '생산이력조회', total: rows.length, inserted: rows.length - duplicates.length, duplicates })
          
        } else {
          const hr = matrix.findIndex(r => r && (r.includes('LOT번호') || r.includes('매출일')))
          if (hr === -1) { setUploading(false); return alert('매출 헤더를 찾을 수 없습니다.') }
          
          const headers = matrix[hr].map(h => String(h || '').trim())
          const rawRows: any[] = []
          
          const idxLot = headers.indexOf('LOT번호')
          const idxDate = headers.indexOf('매출일')
          const idxCust = headers.indexOf('거래처명')
          const idxAmt = headers.indexOf('매출액(자사)')
          const idxCountry = headers.indexOf('국가')
          const idxItemCode = headers.indexOf('품목')
          const idxItemName = headers.indexOf('품목명')
          const idxBigo = headers.indexOf('비고')

          matrix.slice(hr + 1).forEach(row => {
            const lot = String((idxLot !== -1 ? row[idxLot] : row[7]) || '').trim()
            if (!lot || lot === '*' || lot === 'LOT번호') return
            
            let rawDate = String(row[idxDate !== -1 ? idxDate : 1] || '')
            if (rawDate.length === 8) rawDate = `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`
            
            const amt = parseFloat(String(row[idxAmt !== -1 ? idxAmt : 15] || '0'))
            const country = String(row[idxCountry !== -1 ? idxCountry : 27] || '대한민국')
            const itemCode = String(row[idxItemCode !== -1 ? idxItemCode : 4] || '')
            const itemName = String(row[idxItemName !== -1 ? idxItemName : 5] || '')
            
            const itemType = getItemTypeByOrderCode(itemCode, String(row[idxBigo] || ''))

            rawRows.push({
              serial_number: lot, sales_date: rawDate, amount: isNaN(amt) ? 0 : amt,
              market_type: (country === '대한민국' || country === '한국') ? '국내' : '해외',
              item_type: itemType, customer_name: String(row[idxCust !== -1 ? idxCust : 26] || '미등록'), 
              currency: country, item_name: itemName
            })
          })

          if (rawRows.length === 0) { setUploading(false); return alert('유효한 매출 데이터가 없습니다.') }

          const { data: allSales } = await supabase.from('sales_records').select('serial_number, sales_date, amount')
          const existingSalesSet = new Set((allSales || []).map(s => `${s.serial_number}|${s.sales_date}|${s.amount}`))
          
          const duplicates: string[] = []
          const newRows: any[] = []

          rawRows.forEach(r => {
            const key = `${r.serial_number}|${r.sales_date}|${r.amount}`
            if (existingSalesSet.has(key)) duplicates.push(`${r.serial_number} (금액: ${r.amount.toLocaleString()}원)`)
            else newRows.push(r)
          })

          if (newRows.length > 0) {
            await supabase.from('equipments').upsert(Array.from(new Set(newRows.map(r => r.serial_number))).map(sn => ({ serial_number: sn, model_name: getModelFromSN(sn), status: 'Installed', board_info: '매출 내역 기반 등록' })), { onConflict: 'serial_number', ignoreDuplicates: true })
            await supabase.from('sales_records').insert(newRows)
          }

          setUploadReport({ show: true, type: '매출이력조회', total: rawRows.length, inserted: newRows.length, duplicates })
        }
      } catch (err: any) { alert(`파싱 오류: ${err.message}`) } 
      finally { setUploading(false); if(e.target) e.target.value = ''; }
    }
    reader.readAsArrayBuffer(file)
  }

  // 매출 대시보드 가공
  const targets = { domestic: 63.21, overseasAgency: 28.03, domesticService: 3.75, overseasService: 8.05, ckd: 20.48, india: 23.92, turkey: 15.44, japan: 9.34, usa: 32.26 }
  const actuals = { domestic: 0, overseasAgency: 0, domesticService: 0, overseasService: 0, ckd: 0, india: 0, turkey: 0, japan: 0, usa: 0 }

  salesRecords.forEach(s => {
    const amtIn100M = (Number(s.amount) || 0) / 100000000 
    const country = s.currency || ''; const isService = s.item_type === '서비스'
    if (s.market_type === '국내') {
      if (isService) actuals.domesticService += amtIn100M; else actuals.domestic += amtIn100M
    } else {
      if (isService) actuals.overseasService += amtIn100M
      else {
        if (country.includes('인도')) actuals.india += amtIn100M
        else if (country.includes('터키')) actuals.turkey += amtIn100M
        else if (country.includes('일본')) actuals.japan += amtIn100M
        else if (country.includes('미국')) actuals.usa += amtIn100M
        else if (s.customer_name?.includes('CKD')) actuals.ckd += amtIn100M
        else actuals.overseasAgency += amtIn100M
      }
    }
  })

  const reportData = [
    { label: '국내', target: targets.domestic, actual: actuals.domestic }, { label: '해외 대리점', target: targets.overseasAgency, actual: actuals.overseasAgency },
    { label: '국내서비스', target: targets.domesticService, actual: actuals.domesticService }, { label: '해외서비스', target: targets.overseasService, actual: actuals.overseasService },
    { label: '서비스합계', target: targets.domesticService + targets.overseasService, actual: actuals.domesticService + actuals.overseasService, isGroup: true },
    { label: 'CKD', target: targets.ckd, actual: actuals.ckd }, { label: '지사-인도', target: targets.india, actual: actuals.india },
    { label: '지사-터키', target: targets.turkey, actual: actuals.turkey }, { label: '일본', target: targets.japan, actual: actuals.japan }, { label: '미국', target: targets.usa, actual: actuals.usa }
  ]
  const totalTarget = reportData.filter(d => !d.isGroup).reduce((acc, curr) => acc + curr.target, 0)
  const totalActual = reportData.filter(d => !d.isGroup).reduce((acc, curr) => acc + curr.actual, 0)
  const maxVal = Math.max(...reportData.map(d => Math.max(d.target, d.actual))) * 1.2

  // 서비스 통계
  const serviceSales = salesRecords.filter(s => s.item_type === '서비스')
  const totalServiceSalesAmt = serviceSales.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

  const partsMap: Record<string, number> = {}
  serviceSales.forEach(s => { const name = s.item_name || '기타 부품'; partsMap[name] = (partsMap[name] || 0) + Number(s.amount) })
  const top10Parts = Object.entries(partsMap).sort((a,b) => b[1] - a[1]).slice(0, 10)

  const agencyMap: Record<string, number> = {}
  serviceSales.forEach(s => { const name = s.customer_name || '미등록'; agencyMap[name] = (agencyMap[name] || 0) + Number(s.amount) })
  const top10Agencies = Object.entries(agencyMap).sort((a,b) => b[1] - a[1]).slice(0, 10)

  const issueMap: Record<string, number> = {}
  allServiceCases.forEach(sc => {
    const eq = equipments.find(e => e.serial_number === sc.serial_number)
    const model = eq ? eq.model_name : (sc.product_model || 'Unknown')
    const desc = sc.symptom || sc.issue_description || '기타 고장'
    const key = `${model}|${desc.substring(0, 25)}`
    issueMap[key] = (issueMap[key] || 0) + 1
  })
  const top5Issues = Object.entries(issueMap).sort((a,b) => b[1] - a[1]).slice(0, 5).map(e => {
    const parts = e[0].split('|')
    return { model: parts[0], desc: parts[1], count: e[1] }
  })

  const exportServiceExcel = () => {
    const ws = XLSX.utils.json_to_sheet(allServiceCases.map(c => {
      const causeLabel = CAUSE_CLASSIFICATIONS.find(x => x.code === c.cause_code)?.label || c.cause_code || '미분류'
      const actionLabel = ACTION_CLASSIFICATIONS.find(x => x.code === c.action_code)?.label || c.action_code || '미결정'
      return {
        '접수번호': c.case_number, 
        '시리얼번호': c.serial_number, 
        '병원/대리점': c.hospital_name || '-', 
        '담당자': c.contact_person || '-',
        '모델명': c.product_model || equipments.find(e=>e.serial_number===c.serial_number)?.model_name || '-',
        '대표증상원인': causeLabel,
        '대표처리구분': actionLabel,
        '워런티구분': c.classification || 'warranty in', 
        '상태': c.status, 
        '증상': c.symptom || c.issue_description,
        '원인분석': c.cause_analysis || '', 
        '수리내용': c.repair_info || c.resolution_note || '', 
        '검수자': c.inspector || '', 
        '처리일': c.processing_date || ''
      }
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Service_Records")
    XLSX.writeFile(wb, `MEKICS_서비스현황_ISO심사용_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  if (!isMounted) return null

  // 🔐 로그인 화면
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0B1727] flex items-center justify-center p-6 text-white font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="bg-white px-5 py-3.5 rounded-2xl inline-block shadow-md">
              <img src="/MEKICS-Service-Portal/logo.png" alt="MEK Logo" className="h-8 w-auto object-contain" />
            </div>
            <p className="text-base font-bold text-slate-200">Global Service Portal Admin</p>
            <p className="text-xs text-slate-400">포털 접속을 위해 관리자 계정으로 로그인하세요.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">이메일 주소</label>
              <input 
                type="email" 
                required
                placeholder="admin@mek-ics.com" 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)} 
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">비밀번호</label>
              <input 
                type="password" 
                required
                placeholder="••••••••" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" 
              />
            </div>

            {loginError && (
              <p className="text-xs font-bold text-rose-400 bg-rose-950/50 p-3 rounded-lg border border-rose-900">{loginError}</p>
            )}

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg mt-2"
            >
              {authLoading ? '로그인 처리 중...' : '관리자 로그인'}
            </button>
          </form>

          <p className="text-[11px] text-center text-slate-600">© 2026 MEKICS Co., Ltd. Internal Use Only.</p>
        </div>
      </div>
    )
  }

  // 🖥️ 메인 포털 화면
  const pageTitles = { 
    home: '📊 매출 현황', production: '🏭 생산이력조회', sales: '💰 매출이력조회', service: '🛠️ 서비스 현황', warranty: '🔍 워런티 및 라이프사이클 조회'
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* 1. 좌측 사이드바 (LNB) */}
      <aside className="w-64 bg-[#0B1727] text-white fixed h-screen top-0 left-0 flex flex-col shadow-2xl z-50 print:hidden">
        <div className="p-6 pb-6">
          <div className="bg-white px-4 py-2.5 rounded-xl inline-block shadow-md mb-2">
            <img src="/MEKICS-Service-Portal/logo.png" alt="MEKICS Logo" className="h-7 w-auto object-contain" />
          </div>
          <p className="text-xs font-bold text-slate-300">Global Service Portal</p>
          
          <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
            <span className="bg-blue-600/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30">
              {session.user.email?.split('@')[0]} (관리자)
            </span>
            <button onClick={handleLogout} className="text-[11px] text-slate-400 hover:text-rose-300 underline font-medium">로그아웃</button>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => { setActiveTab('home'); setSearchResult(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'home' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>📊 매출 현황</button>
          <button onClick={() => { setActiveTab('production'); setSearchResult(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'production' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>🏭 생산이력조회</button>
          <button onClick={() => { setActiveTab('sales'); setSearchResult(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'sales' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>💰 매출이력조회</button>
          <button onClick={() => { setActiveTab('service'); setSearchResult(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'service' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>🛠️ 서비스 현황</button>
          <button onClick={() => { setActiveTab('warranty'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'warranty' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>🔍 워런티 조회</button>
        </nav>

        <div className="p-6 text-xs text-slate-500 font-medium"><p>© 2026 MEKICS.</p><p>All rights reserved.</p></div>
      </aside>

      {/* 2. 메인 콘텐츠 영역 */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center print:hidden shadow-sm">
          <h2 className="text-xl font-black text-slate-800">{pageTitles[activeTab]}</h2>
        </header>

        <main className="flex-1 p-8 space-y-8 print:p-0">
          
          {/* 워런티 전용 조회 탭 */}
          {activeTab === 'warranty' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 print:hidden">
                <h3 className="text-xl font-black text-slate-800 mb-4">장비 시리얼 번호 (SN) 통합 검색</h3>
                <form onSubmit={handleSearch} className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="예: HFT700UA1B0870 또는 MV2000ZA1D0073" 
                    value={serialQuery} 
                    onChange={(e) => setSerialQuery(e.target.value)} 
                    className="flex-1 border-2 border-slate-200 bg-slate-50 rounded-xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:bg-white text-lg font-mono uppercase transition-colors shadow-inner" 
                    autoFocus 
                  />
                  <button type="submit" className="px-8 py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition shadow-lg whitespace-nowrap">조회하기</button>
                </form>
                {searchError && (
                  <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold px-5 py-4 rounded-xl shadow-sm">
                    ❌ 해당 시리얼 번호의 장비 정보를 찾을 수 없습니다.
                  </div>
                )}
              </div>

              {searchResult && (
                <section className="bg-white rounded-2xl shadow-xl border-2 border-blue-500 overflow-hidden relative animate-fade-in">
                  <div className="bg-blue-50 px-6 py-5 border-b border-blue-100 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">통합 라이프사이클 이력</span>
                      <div className="flex items-center gap-3 mt-1">
                        <h3 className="text-2xl font-black text-slate-800 font-mono">{searchResult.equipment.serial_number}</h3>
                        <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold">{searchResult.equipment.model_name}</span>
                      </div>
                    </div>
                    <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-bold transition print:hidden shadow-sm">📄 PDF 출력</button>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm space-y-3">
                      <h4 className="font-extrabold text-slate-800 border-b pb-3 flex items-center gap-2">🏭 제조 스펙</h4>
                      <p><span className="text-slate-500 w-20 inline-block">생산일자:</span> <span className="font-bold text-slate-800">{searchResult.equipment.manufacture_date || '-'}</span></p>
                      <p><span className="text-slate-500 w-20 inline-block">메인보드:</span> <span className="font-bold text-slate-800">{searchResult.equipment.board_info || '-'}</span></p>
                      <p><span className="text-slate-500 w-20 inline-block">펌웨어:</span> <span className="font-bold text-slate-800">{searchResult.equipment.sw_version || 'v1.0'}</span></p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm space-y-3">
                      <h4 className="font-extrabold text-slate-800 border-b pb-3 flex items-center gap-2">💰 판매 이력</h4>
                      <p><span className="text-slate-500 w-20 inline-block">고객사:</span> <span className="font-bold text-blue-700">{searchResult.sales?.customer_name || '미등록'}</span></p>
                      <p><span className="text-slate-500 w-20 inline-block">판매금액:</span> <span className="font-black text-emerald-600">₩{Number(searchResult.sales?.amount || 0).toLocaleString()}</span></p>
                      <p><span className="text-slate-500 w-20 inline-block">매출구분:</span> <span className="font-bold text-slate-800">{searchResult.sales?.item_type || '제품'} ({searchResult.sales?.market_type || '국내'})</span></p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-800 border-b pb-3 mb-3 flex items-center gap-2">🛠️ A/S 현황</h4>
                        <p><span className="text-slate-500">총 A/S 접수:</span> <span className="font-black text-rose-600 text-lg ml-2">{searchResult.serviceCases.length}</span>건</p>
                      </div>
                      <button onClick={() => { handleAutoFetchServiceInfo(searchResult.equipment.serial_number); setShowNewServiceModal(true); }} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 rounded-xl transition shadow print:hidden">+ 신규 서비스 접수</button>
                    </div>
                  </div>
                  
                  {searchResult.serviceCases.length > 0 && (
                    <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">최근 A/S 내역</h4>
                      <div className="space-y-2">
                        {searchResult.serviceCases.map((sc: any) => (
                          <div key={sc.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center text-sm shadow-sm">
                            <div className="flex items-center gap-4">
                              <span className="font-mono font-black text-rose-600">{sc.case_number}</span>
                              <span className="text-slate-700 font-medium">{sc.symptom || sc.issue_description}</span>
                            </div>
                            <button onClick={() => setSelectedReportCase(sc)} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm flex items-center gap-1">
                              📄 레포트 보기/출력
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {/* 매출 현황 (Home) */}
          {activeTab === 'home' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 mb-6 gap-4">
                <h2 className="text-2xl font-black text-slate-800">매출 현황 : <span className="font-medium text-slate-600 text-lg ml-2">2026년 누적 실적 현황 (단위: 억원)</span></h2>
                <div className="flex items-center gap-5 text-sm font-bold bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2"><span className="w-4 h-4 bg-blue-500 rounded shadow-sm"></span>목표</div>
                  <div className="flex items-center gap-2"><span className="w-4 h-4 bg-rose-500 rounded shadow-sm"></span>실적</div>
                </div>
              </div>
              <div className="w-full bg-white rounded-xl mb-8 overflow-x-auto">
                <div className="h-[320px] flex items-end gap-3 md:gap-5 min-w-[800px] pb-8 relative">
                  {reportData.map((d, idx) => {
                    const tHeight = (d.target / maxVal) * 100; const aHeight = (d.actual / maxVal) * 100
                    return (
                      <div key={idx} className={`flex-1 flex flex-col items-center justify-end h-full ${d.isGroup ? 'bg-slate-50 rounded-xl border border-slate-100' : ''}`}>
                        <div className="flex items-end gap-1.5 w-full justify-center h-full group">
                          <div className="w-10 md:w-14 bg-blue-500 rounded-t-md relative flex flex-col justify-end shadow-md" style={{ height: `${tHeight}%` }}><span className="absolute -top-7 w-full text-center text-xs font-black text-blue-600">{d.target.toFixed(2)}</span></div>
                          <div className="w-10 md:w-14 bg-rose-500 rounded-t-md relative flex flex-col justify-end shadow-md" style={{ height: `${aHeight}%` }}><span className="absolute -top-7 w-full text-center text-xs font-black text-rose-600">{d.actual.toFixed(2)}</span></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 mt-5 whitespace-nowrap">{d.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-center text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="p-4 border-r border-slate-300 font-bold text-slate-800" rowSpan={2}>매출현황</th><th className="p-4 border-r border-slate-300 font-bold text-slate-800" rowSpan={2}>국내</th><th className="p-4 border-r border-slate-300 font-bold text-slate-800" rowSpan={2}>해외 대리점</th><th className="p-3 border-b border-r border-slate-300 font-bold text-slate-800" colSpan={3}>서비스</th><th className="p-3 border-b border-r border-slate-300 font-bold text-slate-800" colSpan={5}>전략 (지사/해외)</th><th className="p-4 font-bold text-slate-800" rowSpan={2}>총합계</th>
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-300 text-xs">
                      <th className="p-3 border-r border-slate-200 text-slate-600 font-bold">국내서비스</th><th className="p-3 border-r border-slate-200 text-slate-600 font-bold">해외서비스</th><th className="p-3 border-r border-slate-300 bg-slate-100 text-slate-800 font-bold">서비스합계</th><th className="p-3 border-r border-slate-200 text-slate-600 font-bold">CKD</th><th className="p-3 border-r border-slate-200 text-slate-600 font-bold">지사-인도</th><th className="p-3 border-r border-slate-200 text-slate-600 font-bold">지사-터키</th><th className="p-3 border-r border-slate-200 text-slate-600 font-bold">일본</th><th className="p-3 border-r border-slate-300 text-slate-600 font-bold">미국</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium text-slate-700">
                    <tr className="border-b border-slate-200 bg-white"><td className="p-4 border-r border-slate-300 font-black text-slate-800">목표</td>{reportData.map((d, i) => <td key={i} className={`p-4 font-bold text-blue-700 ${d.isGroup ? 'bg-slate-50 border-r-2 border-slate-300' : 'border-r border-slate-200'}`}>{d.target.toFixed(2)}</td>)}<td className="p-4 font-black text-blue-800 bg-blue-50 text-base">{totalTarget.toFixed(2)}</td></tr>
                    <tr className="border-b border-slate-200 bg-white"><td className="p-4 border-r border-slate-300 font-black text-slate-800">실적</td>{reportData.map((d, i) => <td key={i} className={`p-4 font-bold text-rose-600 ${d.isGroup ? 'bg-slate-50 border-r-2 border-slate-300' : 'border-r border-slate-200'}`}>{d.actual.toFixed(2)}</td>)}<td className="p-4 font-black text-rose-700 bg-rose-50 text-base">{totalActual.toFixed(2)}</td></tr>
                    <tr className="bg-slate-50"><td className="p-4 border-r border-slate-300 font-black text-slate-800">달성%</td>{reportData.map((d, i) => { const pct = d.target ? Math.round((d.actual / d.target) * 100) : 0; return <td key={i} className={`p-4 font-black ${pct >= 100 ? 'text-blue-600' : 'text-slate-600'} ${d.isGroup ? 'border-r-2 border-slate-300' : 'border-r border-slate-200'}`}>{pct}%</td> })}<td className="p-4 font-black text-slate-800 bg-slate-200 text-base">{totalTarget ? Math.round((totalActual / totalTarget) * 100) : 0}%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 생산이력조회 */}
          {activeTab === 'production' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-slate-800">생산/제조 마스터 DB</h3>
                  <span className="text-sm bg-blue-50 text-blue-700 px-4 py-1.5 rounded-lg font-bold border border-blue-100">총 {equipments.length}대</span>
                </div>
                <input type="file" accept=".xlsx, .xls, .csv" ref={prodFileInputRef} onChange={(e) => handleFileUpload(e, 'omega')} className="hidden" />
                <button onClick={() => prodFileInputRef.current?.click()} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition shadow-sm flex items-center gap-2">
                  {uploading ? '저장 중...' : '🏭 생산이력 업로드'}
                </button>
              </div>

              <div className="mb-4 flex justify-end">
                <input
                  type="text"
                  placeholder="🔍 시리얼 번호, 모델명, 병원명 검색..."
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  className="w-full md:w-80 px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[700px] overflow-y-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 shadow-sm z-10">
                    <tr><th className="p-4">시리얼 번호</th><th className="p-4">감지 모델명</th><th className="p-4">생산일자</th><th className="p-4">HW/SW 사양</th><th className="p-4">상태</th></tr>
                  </thead>
                  <tbody>
                    {filteredEquipments.map((eq) => (
                      <tr key={eq.serial_number} onClick={() => handleSearch(undefined, eq.serial_number)} className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition">
                        <td className="p-4 font-mono font-bold text-blue-700">{eq.serial_number}</td><td className="p-4 font-bold text-emerald-700">{eq.model_name}</td><td className="p-4 text-slate-600 font-medium">{eq.manufacture_date || '-'}</td><td className="p-4 text-slate-500 truncate max-w-[300px]">{eq.board_info}</td><td className="p-4"><span className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">{eq.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 매출이력조회 */}
          {activeTab === 'sales' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
               <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-slate-800">전체 매출 전표 내역</h3>
                  <span className="text-sm bg-blue-50 text-blue-700 px-4 py-1.5 rounded-lg font-bold border border-blue-100">총 {salesRecords.length}건</span>
                </div>
                <input type="file" accept=".xlsx, .xls, .csv" ref={salesFileInputRef} onChange={(e) => handleFileUpload(e, 'sales')} className="hidden" />
                <button onClick={() => salesFileInputRef.current?.click()} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition shadow-sm flex items-center gap-2">
                  {uploading ? '저장 중...' : '💰 매출현황 업로드'}
                </button>
              </div>

              <div className="mb-4 flex justify-end">
                <input
                  type="text"
                  placeholder="🔍 시리얼 번호, 모델명, 거래처명 검색..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full md:w-80 px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[700px] overflow-y-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 shadow-sm z-10">
                    <tr><th className="p-4">매출일자</th><th className="p-4">판매 시리얼</th><th className="p-4">품목명</th><th className="p-4">거래처명</th><th className="p-4">구분</th><th className="p-4 text-right">매출액 (KRW)</th></tr>
                  </thead>
                  <tbody>
                    {filteredSalesRecords.map((s, idx) => (
                      <tr key={s.id || idx} onClick={() => handleSearch(undefined, s.serial_number)} className="border-b border-slate-100 hover:bg-emerald-50 cursor-pointer transition">
                        <td className="p-4 text-slate-500 font-mono font-medium">{s.sales_date}</td>
                        <td className="p-4 font-mono font-black text-blue-700">{s.serial_number}</td>
                        <td className="p-4 text-slate-700 font-medium truncate max-w-xs">{s.item_name || '-'}</td>
                        <td className="p-4 font-bold text-slate-800">{s.customer_name}</td>
                        <td className="p-4"><span className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-sm border ${s.item_type === '서비스' ? 'bg-amber-50 border-amber-200 text-amber-800' : s.item_type === '상품' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>{s.item_type || '제품'}</span></td>
                        <td className="p-4 text-right font-black text-slate-900 text-base">{Number(s.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 서비스 현황 */}
          {activeTab === 'service' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
                  <h3 className="font-bold text-slate-500 mb-1">올해 서비스 파트 총 매출</h3>
                  <p className="text-3xl font-black text-blue-700 mb-6 border-b border-slate-100 pb-6">₩{totalServiceSalesAmt.toLocaleString()}</p>
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">🥇 많이 판매된 부품 TOP 10</h4>
                  <div className="space-y-3">
                    {top10Parts.length === 0 ? <p className="text-sm text-slate-400">데이터가 없습니다.</p> : top10Parts.map(([part, amt], idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                        <span className="font-medium text-slate-700 truncate pr-2"><span className="text-slate-400 font-bold mr-2">{idx+1}</span>{part}</span>
                        <span className="font-mono font-bold text-blue-600">₩{(amt/1000).toLocaleString(undefined, {maximumFractionDigits:0})}k</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">🏆 서비스/부품 구매 우수 대리점 TOP 10</h4>
                    <div className="space-y-3">
                      {top10Agencies.length === 0 ? <p className="text-sm text-slate-400">데이터가 없습니다.</p> : top10Agencies.map(([agency, amt], idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                          <span className="font-medium text-slate-700 truncate pr-2"><span className="text-slate-400 font-bold mr-2">{idx+1}</span>{agency}</span>
                          <span className="font-mono font-bold text-emerald-600">₩{(amt/1000).toLocaleString(undefined, {maximumFractionDigits:0})}k</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">🚨 제품별 주요 고장 증상 TOP 5</h4>
                    <div className="space-y-3">
                      {top5Issues.length === 0 ? <p className="text-sm text-slate-400">데이터가 없습니다.</p> : top5Issues.map((issue, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="block text-xs font-black text-rose-500 mb-1">{issue.model}</span>
                            <span className="font-medium text-slate-700">{issue.desc}...</span>
                          </div>
                          <span className="font-black text-slate-800 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">{issue.count}건</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black text-slate-800">글로벌 서비스 A/S 현황</h3>
                    <span className="text-sm bg-rose-50 text-rose-700 px-4 py-1.5 rounded-lg font-bold border border-rose-100">총 {allServiceCases.length}건</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setNewServiceSn(''); setAutoFetchedInfo({ hospital_name: '', product_model: '', isWarrantyIn: true }); setShowNewServiceModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition shadow-sm flex items-center gap-2">
                      🛠️ 신규 서비스 접수
                    </button>
                    <button onClick={exportServiceExcel} className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition shadow-sm flex items-center gap-2">
                      📄 ISO 심사용 엑셀 다운로드
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 shadow-sm z-10">
                      <tr><th className="p-4">접수번호</th><th className="p-4">시리얼 번호</th><th className="p-4">병원/대리점</th><th className="p-4">대표증상원인</th><th className="p-4">대표처리구분</th><th className="p-4">상태</th><th className="p-4">워런티 구분</th><th className="p-4">증상 및 요청사항</th><th className="p-4">레포트 출력</th></tr>
                    </thead>
                    <tbody>
                      {allServiceCases.map((sc) => {
                        const causeLabel = CAUSE_CLASSIFICATIONS.find(x => x.code === sc.cause_code)?.label || sc.cause_code || '미분류'
                        const actionLabel = ACTION_CLASSIFICATIONS.find(x => x.code === sc.action_code)?.label || sc.action_code || '미결정'
                        return (
                          <tr key={sc.id} className="border-b border-slate-100 hover:bg-rose-50 transition">
                            <td className="p-4 font-mono font-black text-rose-600">{sc.case_number}</td>
                            <td className="p-4 font-mono font-bold text-blue-700 cursor-pointer hover:underline" onClick={() => handleSearch(undefined, sc.serial_number)}>{sc.serial_number}</td>
                            <td className="p-4 font-bold text-slate-800">{sc.hospital_name || '-'}</td>
                            <td className="p-4 font-medium text-slate-700"><span className="bg-slate-100 px-2.5 py-1 rounded text-xs border">{causeLabel}</span></td>
                            <td className="p-4 font-medium text-slate-700"><span className="bg-slate-100 px-2.5 py-1 rounded text-xs border">{actionLabel}</span></td>
                            <td className="p-4"><span className={`px-3 py-1 rounded-lg text-xs font-bold border shadow-sm ${sc.status==='Closed'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>{sc.status}</span></td>
                            <td className="p-4"><span className={`px-2.5 py-1 rounded text-xs font-bold ${sc.classification==='warranty in'?'bg-blue-100 text-blue-800':'bg-slate-100 text-slate-700'}`}>{sc.classification==='warranty in'?'Warranty In (무상)':'Warranty Out (유상)'}</span></td>
                            <td className="p-4 text-slate-800 font-medium truncate max-w-xs">{sc.symptom || sc.issue_description}</td>
                            <td className="p-4">
                              <button onClick={() => { setSelectedReportCase(sc); setReportEditForm({ reviewer: sc.reviewer||'Scott Hong', reviewer_date: sc.created_at?.slice(0,10)||new Date().toISOString().slice(0,10), classification: sc.classification||'warranty in', cause_code: sc.cause_code||'X', action_code: sc.action_code||'PC00', cause_analysis: sc.cause_analysis||'', repair_info: sc.repair_info||'', repair_period: sc.repair_period||'2026.08.01 ~ 2026.08.10', repair_cost: sc.repair_cost||0, inspector: sc.inspector||'Scott Hong', processing_date: sc.processing_date||new Date().toISOString().slice(0,10) }); }} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm flex items-center gap-1">
                                📄 레포트 보기
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 🛠️ 신규 서비스 접수 모달 */}
      {showNewServiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">🛠️ 신규 서비스 접수 (Service Request)</h3>
              <button onClick={() => setShowNewServiceModal(false)} className="text-slate-400 hover:text-slate-700 text-2xl font-bold">✖</button>
            </div>

            <form onSubmit={handleSubmitNewService} className="space-y-6 text-sm">
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-3">
                <label className="block font-black text-blue-900">1. 장비 시리얼 번호 (Serial No.) 입력</label>
                <input 
                  type="text" 
                  required
                  placeholder="예: HFT700UA1B0870 또는 MV2000ZA1D0073" 
                  value={newServiceSn} 
                  onChange={(e) => handleAutoFetchServiceInfo(e.target.value)} 
                  className="w-full border-2 border-blue-200 rounded-xl px-5 py-3 font-mono font-bold uppercase focus:border-blue-600 outline-none text-base"
                />
                
                {newServiceSn.trim() && (
                  <div className="grid grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-blue-200 mt-2">
                    <div><span className="text-slate-500">조회 모델:</span> <strong className="text-slate-800">{autoFetchedInfo.product_model}</strong></div>
                    <div><span className="text-slate-500">자동매칭 대리점:</span> <strong className="text-blue-700">{autoFetchedInfo.hospital_name}</strong></div>
                    <div className="col-span-2 pt-1 border-t flex items-center justify-between">
                      <span className="text-slate-500">자동 워런티 판별:</span>
                      <span className={`px-2.5 py-0.5 rounded font-black text-xs ${autoFetchedInfo.isWarrantyIn ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {autoFetchedInfo.isWarrantyIn ? '✓ Warranty In (무상보증 이내)' : '✕ Warranty Out (보증기간 경과/유상)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* MSM 표준 분류 항목 선택 */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">대표증상원인 (고장원인중분류)</label>
                  <select 
                    value={serviceForm.cause_code} 
                    onChange={e => setServiceForm({...serviceForm, cause_code: e.target.value})} 
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 bg-white font-bold focus:border-blue-500 outline-none"
                  >
                    {CAUSE_CLASSIFICATIONS.map(c => (
                      <option key={c.code} value={c.code}>[{c.code}] {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">대표처리구분 (ASCODE)</label>
                  <select 
                    value={serviceForm.action_code} 
                    onChange={e => setServiceForm({...serviceForm, action_code: e.target.value})} 
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 bg-white font-bold focus:border-blue-500 outline-none"
                  >
                    {ACTION_CLASSIFICATIONS.map(a => (
                      <option key={a.code} value={a.code}>[{a.code}] {a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Name of Hospital / 고객사명</label>
                  <input type="text" value={serviceForm.hospital_name} onChange={e => setServiceForm({...serviceForm, hospital_name: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person / 담당자</label>
                  <input type="text" placeholder="예: Terry Wang" value={serviceForm.contact_person} onChange={e => setServiceForm({...serviceForm, contact_person: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone / 연락처</label>
                  <input type="text" placeholder="예: 010-0000-0000" value={serviceForm.contact_phone} onChange={e => setServiceForm({...serviceForm, contact_phone: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail / 이메일</label>
                  <input type="email" placeholder="예: Terry.wang@symbiomed.com" value={serviceForm.email} onChange={e => setServiceForm({...serviceForm, email: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5" />
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Symptom / 주요 고장 증상</label>
                  <input type="text" required placeholder="예: Humidifier Failure / Power Error" value={serviceForm.symptom} onChange={e => setServiceForm({...serviceForm, symptom: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Problem Description / 문제 상세 내역</label>
                  <textarea 
                    rows={6} 
                    placeholder="고장 현상(Symptom)과 특이사항을 상세히 기재해 주세요.&#10;- 언제부터 발생했나요?&#10;- 특정 에러 코드(Error Code)가 있나요?&#10;- 기타 특이사항:" 
                    value={serviceForm.problem_description} 
                    onChange={e => setServiceForm({...serviceForm, problem_description: e.target.value})} 
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 resize-y leading-relaxed focus:border-blue-500 outline-none" 
                  />
                  <p className="text-[11px] text-slate-400 mt-1">* 엔터(Enter)로 줄바꿈이 가능하며, 우측 하단을 드래그하여 입력창 크기를 조절할 수 있습니다.</p>
                </div>

                {/* 📷 사진/동영상 첨부 영역 */}
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <label className="block font-bold text-slate-700 mb-1.5">
                    📷 증상 사진 및 동영상 첨부 (다중 선택 가능)
                  </label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*" 
                    onChange={(e) => setAttachedFiles(Array.from(e.target.files || []))}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border-2 border-dashed border-slate-200 p-2 rounded-xl"
                  />
                  {attachedFiles.length > 0 && (
                    <div className="mt-2 text-xs text-blue-600 font-bold bg-blue-50 p-2 rounded-lg flex flex-wrap gap-2">
                      <span>선택된 파일 {attachedFiles.length}개:</span>
                      {attachedFiles.map((f, i) => (
                        <span key={i} className="bg-white px-2 py-0.5 rounded border border-blue-200 text-slate-700">{f.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowNewServiceModal(false)} className="px-6 py-3 bg-slate-100 font-bold rounded-xl text-slate-700">취소</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-xl shadow-lg">접수 등록</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📄 MEKICS 공식 Service Report 모달 */}
      {reportModalCase && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto print:max-w-none print:shadow-none print:border-none print:rounded-none print:p-0">
            
            <div className="flex justify-between items-center mb-6 border-b pb-4 print:hidden">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-slate-800">📄 MEKICS Official Service Report</h3>
                <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded font-mono font-bold">MSF-820-002-ENG (Rev.00)</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsEditingReport(!isEditingReport)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg text-xs transition">
                  {isEditingReport ? '수리 편집 취소' : '✏️ 수리/완료 내역 입력'}
                </button>
                <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-lg text-xs transition shadow-md">
                  🖨️ 레포트 인쇄 / PDF 출력
                </button>
                <button onClick={() => { setSelectedReportCase(null); setIsEditingReport(false); }} className="text-slate-400 hover:text-slate-700 text-2xl font-bold ml-2">✖</button>
              </div>
            </div>

            {isEditingReport && (
              <form onSubmit={handleSaveReportProcessing} className="bg-amber-50 p-6 rounded-2xl border border-amber-200 mb-6 space-y-4 text-sm print:hidden">
                <h4 className="font-black text-amber-900 text-base mb-2">🛠️ 서비스 수리 처리 및 검수 내역 입력</h4>
                
                {/* MSM 분류 코드 편집 드롭다운 */}
                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-amber-200">
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">대표증상원인 (고장원인중분류)</label>
                    <select 
                      value={reportEditForm.cause_code} 
                      onChange={e=>setReportEditForm({...reportEditForm, cause_code: e.target.value})} 
                      className="w-full border rounded-lg p-2 font-bold bg-amber-50/50"
                    >
                      {CAUSE_CLASSIFICATIONS.map(c => (
                        <option key={c.code} value={c.code}>[{c.code}] {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">대표처리구분 (ASCODE)</label>
                    <select 
                      value={reportEditForm.action_code} 
                      onChange={e=>setReportEditForm({...reportEditForm, action_code: e.target.value})} 
                      className="w-full border rounded-lg p-2 font-bold bg-amber-50/50"
                    >
                      {ACTION_CLASSIFICATIONS.map(a => (
                        <option key={a.code} value={a.code}>[{a.code}] {a.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Reviewer / 검토자</label>
                    <input type="text" value={reportEditForm.reviewer} onChange={e=>setReportEditForm({...reportEditForm, reviewer: e.target.value})} className="w-full border rounded-lg p-2 font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Inspector / 최종검수자</label>
                    <input type="text" value={reportEditForm.inspector} onChange={e=>setReportEditForm({...reportEditForm, inspector: e.target.value})} className="w-full border rounded-lg p-2 font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Repair Period / 수리 기간</label>
                    <input type="text" placeholder="예: 2026.07.16 ~ 2026.08.10" value={reportEditForm.repair_period} onChange={e=>setReportEditForm({...reportEditForm, repair_period: e.target.value})} className="w-full border rounded-lg p-2 font-mono" />
                  </div>
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Repair Cost / 수리비 (KRW)</label>
                    <input type="number" value={reportEditForm.repair_cost} onChange={e=>setReportEditForm({...reportEditForm, repair_cost: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-amber-900 mb-1">Cause Analysis / 고장 원인 분석</label>
                  <textarea 
                    rows={3} 
                    placeholder="고장 원인을 상세히 기재하세요." 
                    value={reportEditForm.cause_analysis} 
                    onChange={e=>setReportEditForm({...reportEditForm, cause_analysis: e.target.value})} 
                    className="w-full border rounded-lg p-2 resize-y outline-none focus:ring-2 focus:ring-amber-200" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-900 mb-1">Repair Information / 상세 조치 및 수리 내용 (Service Report 메인)</label>
                  <textarea 
                    rows={8} 
                    placeholder="- 조치 내용 (Action Taken):&#10;- 교체 부품 (Replaced Parts):&#10;- 소프트웨어 버전 (SW Version):&#10;- 최종 점검 내역 (Final Inspection):" 
                    value={reportEditForm.repair_info} 
                    onChange={e=>setReportEditForm({...reportEditForm, repair_info: e.target.value})} 
                    className="w-full border rounded-lg p-3 resize-y outline-none focus:ring-2 focus:ring-amber-200 leading-relaxed font-mono text-sm" 
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="submit" className="bg-amber-600 text-white font-bold px-6 py-2 rounded-lg text-xs shadow">수리 완료 및 레포트 저장</button>
                </div>
              </form>
            )}

            {/* MEKICS Service Report 공식 인쇄 서식 */}
            <div className="p-8 border-2 border-slate-900 rounded-none bg-white text-slate-900 font-sans print:p-0 print:border-none">
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6">
                <div>
                  <img src="/MEKICS-Service-Portal/logo.png" alt="MEK Logo" className="h-8 w-auto mb-1 object-contain" />
                  <p className="text-[10px] font-bold tracking-wider uppercase text-slate-600">Intensive Care System</p>
                </div>
                <h2 className="text-2xl font-black tracking-wider text-slate-900">Service Report</h2>
              </div>

              <div className="mb-6">
                <h3 className="bg-slate-200 text-slate-900 font-bold text-xs uppercase px-3 py-1.5 border border-slate-900 border-b-0">
                  Service request information
                </h3>
                <table className="w-full text-xs border-collapse border border-slate-900">
                  <tbody>
                    <tr className="border-b border-slate-900">
                      <td className="w-28 bg-slate-100 font-bold p-2 border-r border-slate-900">Serial No.</td>
                      <td className="p-2 font-mono font-bold border-r border-slate-900">{reportModalCase.serial_number}</td>
                      <td className="w-28 bg-slate-100 font-bold p-2 border-r border-slate-900">Date</td>
                      <td className="p-2 font-mono">{reportModalCase.created_at?.slice(0, 10) || '2026.08.10'}</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Name of Hospital</td>
                      <td className="p-2 font-bold border-r border-slate-900">{reportModalCase.hospital_name || 'Symbiomed'}</td>
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Contact phone</td>
                      <td className="p-2 font-mono">{reportModalCase.contact_phone || '-'}</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Contact person</td>
                      <td className="p-2 border-r border-slate-900">{reportModalCase.contact_person || 'Terry Wang'}</td>
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">E-mail</td>
                      <td className="p-2 font-mono">{reportModalCase.email || 'Terry.wang@sos-symbiomed.com'}</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Product / Symptom</td>
                      <td colSpan={3} className="p-2">
                        <strong>Product:</strong> {reportModalCase.product_model || 'HFT700'} / <strong>Symptom:</strong> {reportModalCase.symptom || reportModalCase.issue_description}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Problem description</td>
                      <td colSpan={3} className="p-2 h-16 align-top">
                        {reportModalCase.problem_description || 'Heated wire sensor fail, chamber sensor fail, VAC 240 error'}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Remark</td>
                      <td colSpan={3} className="p-2">{reportModalCase.remark || 'AC Power Cord'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="bg-slate-200 text-slate-900 font-bold text-xs uppercase px-3 py-1.5 border border-slate-900 border-b-0">
                  Service processing information
                </h3>
                <table className="w-full text-xs border-collapse border border-slate-900">
                  <tbody>
                    <tr className="border-b border-slate-900">
                      <td className="w-28 bg-slate-100 font-bold p-2 border-r border-slate-900">Reviewer</td>
                      <td className="p-2 font-bold border-r border-slate-900">{reportModalCase.reviewer || 'Scott Hong'}</td>
                      <td className="w-28 bg-slate-100 font-bold p-2 border-r border-slate-900">Reviewer date</td>
                      <td className="p-2 font-mono">{reportModalCase.created_at?.slice(0, 10) || '2026.08.10'}</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Classification</td>
                      <td colSpan={3} className="p-2">
                        <div className="flex gap-6 items-center">
                          <label className="flex items-center gap-1">
                            <input type="checkbox" checked={reportModalCase.classification !== 'warranty in' && reportModalCase.classification !== 'ETC'} readOnly />
                            <span>warranty out</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" checked={reportModalCase.classification === 'warranty in'} readOnly />
                            <span>warranty in</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" checked={reportModalCase.classification === 'ETC'} readOnly />
                            <span>ETC</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">MSM Code</td>
                      <td colSpan={3} className="p-2 font-mono font-bold text-blue-900">
                        대표증상원인: {CAUSE_CLASSIFICATIONS.find(x => x.code === reportModalCase.cause_code)?.label || reportModalCase.cause_code || '미분류'} [{reportModalCase.cause_code || 'X'}] | 
                        대표처리구분: {ACTION_CLASSIFICATIONS.find(x => x.code === reportModalCase.action_code)?.label || reportModalCase.action_code || '미결정'} [{reportModalCase.action_code || 'PC00'}]
                      </td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Cause analysis</td>
                      <td colSpan={3} className="p-2 font-medium">
                        {reportModalCase.cause_analysis || 'Power Board, Heater Plate Ass\'y, Heated Con. Board Failure.'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Repair information</td>
                      <td colSpan={3} className="p-2 h-44 align-top whitespace-pre-line leading-relaxed">
                        {reportModalCase.repair_info || `1. Defective components replaced: Power Board, Heater Plate Ass'y, Heated Con Board
2. Software upgraded to latest versions: Main Software 1.05.00R21 / Pneumatic Software 1.05.00R23
3. Performed full calibration (Ins. Flow, O2 21%/100%), Humidifier & Alarm function test
4. Final operational confirmation completed. Normal operation verified.`}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Repair period</td>
                      <td className="p-2 font-mono border-r border-slate-900">{reportModalCase.repair_period || '2026.07.16 ~ 2026.08.10'}</td>
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Processing date</td>
                      <td className="p-2 font-mono">{reportModalCase.processing_date || '2026.08.10'}</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Repair cost</td>
                      <td className="p-2 font-mono font-bold border-r border-slate-900">₩{Number(reportModalCase.repair_cost || 0).toLocaleString()}</td>
                      <td className="bg-slate-100 font-bold p-2 border-r border-slate-900">Inspector</td>
                      <td className="p-2 font-bold">{reportModalCase.inspector || 'Scott Hong'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-6 pt-2 border-t border-slate-300">
                <span>MSF-820-002-ENG (Rev.00)</span>
                <span>1/1</span>
                <span className="font-bold text-slate-800">MEKICS Co., Ltd.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 중복 리포트 모달 */}
      {uploadReport.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200">
            <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">📊 데이터 업로드 처리 결과</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center"><p className="text-slate-500 text-xs font-bold mb-1">총 스캔 데이터</p><p className="text-2xl font-black text-slate-800">{uploadReport.total}<span className="text-sm font-medium ml-1">건</span></p></div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center"><p className="text-emerald-700 text-xs font-bold mb-1">신규 반영 데이터</p><p className="text-2xl font-black text-emerald-600">{uploadReport.inserted}<span className="text-sm font-medium ml-1">건</span></p></div>
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-center"><p className="text-rose-700 text-xs font-bold mb-1">중복 감지 건수</p><p className="text-2xl font-black text-rose-600">{uploadReport.duplicates.length}<span className="text-sm font-medium ml-1">건</span></p></div>
            </div>
            {uploadReport.duplicates.length > 0 ? (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-700 mb-2">{uploadReport.type === '생산이력조회' ? '⚠️ 아래 항목은 기존 데이터를 업데이트(덮어쓰기) 했습니다.' : '⚠️ 아래 항목은 이중 합산 방지를 위해 스킵(제외) 되었습니다.'}</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-60 overflow-y-auto"><ul className="space-y-1 text-sm font-mono text-slate-600">{uploadReport.duplicates.map((dup, i) => <li key={i} className="border-b border-slate-100 pb-1 last:border-0 last:pb-0 flex items-center gap-2"><span className="text-rose-500 font-black">•</span> {dup}</li>)}</ul></div>
              </div>
            ) : (<div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl text-center font-bold mb-6">✨ 중복 없이 완벽하게 신규 등록되었습니다!</div>)}
            <div className="flex justify-end pt-4 border-t border-slate-100"><button onClick={() => { setUploadReport({ ...uploadReport, show: false }); loadAllData(); }} className="px-8 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition shadow-lg">확인 및 새로고침</button></div>
          </div>
        </div>
      )}
    </div>
  )
}