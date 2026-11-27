// OMEGA Plus "제품생산이력정보" 엑셀 파서
//
// 엑셀 구조 (2026-11 기준)
//   1행: 제목 (제품생산이력정보)
//   2행: 항목명  - 품목코드, 품목명, 규격, SN, 포장일자, 입고유형, 사양, 모델명,
//                 [구성품명 x N (BLOWER, MAIN B/D ...)], 출고거래처코드, 출고거래처명, 출고일,
//                 반품거래처코드, 반품거래처명, 반품일, 재고유무
//   3행: 구성품 하위 항목 - LOT, HW, SW, DC HW, DC SW, 비고 (구성품마다 6칸)
//   4행~: 장비 1대 = 1행
//
// 열 위치(인덱스)를 고정하지 않고 2·3행 머리글을 읽어서 찾습니다.
// → 모델마다 구성품 종류·개수가 달라도(MV2000, MTV1000 등) 같은 파서로 처리됩니다.
//
// 이 파일은 외부 라이브러리를 쓰지 않습니다. 엑셀 → 2차원 배열 변환은 호출하는 쪽(XLSX)에서 합니다.

export type ProductionEquipment = {
  serial_number: string
  item_code: string | null
  item_name: string | null
  spec: string | null
  option_spec: string | null
  model_name: string | null
  manufacture_date: string | null   // 포장일자 (YYYY-MM-DD)
  receipt_type: string | null       // 생산 / 재작업
  dealer_code: string | null        // 출고거래처코드
  dealer_name: string | null        // 출고거래처명
  shipment_date: string | null
  return_dealer_code: string | null
  return_date: string | null
  in_stock: boolean | null
  udi: string | null
  status: 'In Stock' | 'Shipped' | 'Returned'
}

export type ProductionComponent = {
  serial_number: string
  component: string
  lot: string | null
  hw_version: string | null
  sw_version: string | null
  dc_hw_version: string | null
  dc_sw_version: string | null
  remark: string | null
}

export type ProductionParseResult = {
  equipments: ProductionEquipment[]
  components: ProductionComponent[]
  dealers: { code: string; name: string }[]
  warnings: string[]
}

const FIXED_FIELDS: Record<string, keyof ProductionEquipment | 'dealer_name_ret' | 'return_dealer_name'> = {
  '품목코드': 'item_code',
  '품목명': 'item_name',
  '규격': 'spec',
  'SN': 'serial_number',
  '포장일자': 'manufacture_date',
  '입고유형': 'receipt_type',
  '사양': 'option_spec',
  '모델명': 'model_name',
  '출고거래처코드': 'dealer_code',
  '출고거래처명': 'dealer_name',
  '출고일': 'shipment_date',
  '반품거래처코드': 'return_dealer_code',
  '반품거래처명': 'return_dealer_name',
  '반품일': 'return_date',
  '재고유무': 'in_stock',
}

const SUB_FIELDS: Record<string, keyof ProductionComponent> = {
  'LOT': 'lot',
  'HW': 'hw_version',
  'SW': 'sw_version',
  'DC HW': 'dc_hw_version',
  'DC SW': 'dc_sw_version',
  '비고': 'remark',
}

// 공백 정리: "MAIN  B/D" → "MAIN B/D", 특수 따옴표 통일
const norm = (v: unknown): string =>
  String(v ?? '').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()

// 빈 값 / NONE → null
const val = (v: unknown): string | null => {
  const s = norm(v)
  if (!s || s.toUpperCase() === 'NONE' || s === '-') return null
  return s
}

// 2026.10.20 / 2026-10-20 / 20261020 / 엑셀 날짜숫자 / Date → YYYY-MM-DD
export const toIsoDate = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10)
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return d.toISOString().slice(0, 10)
  }
  const s = norm(v)
  let m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

// GS1 UDI: (01) + GTIN 14자리로 시작
const looksLikeUdi = (s: string | null) => !!s && /^01\d{14}/.test(s)

export function parseProductionHistory(matrix: unknown[][]): ProductionParseResult {
  const warnings: string[] = []

  // 1) 머리글 행 찾기: 'SN' 과 '품목코드' 가 모두 있는 행
  const headerIdx = matrix.findIndex(r => Array.isArray(r) && r.some(c => norm(c) === 'SN') && r.some(c => norm(c) === '품목코드'))
  if (headerIdx < 0) throw new Error("머리글(품목코드, SN)을 찾을 수 없습니다. OMEGA '제품생산이력정보' 엑셀이 맞는지 확인하세요.")
  const top = matrix[headerIdx] || []
  const sub = matrix[headerIdx + 1] || []
  const width = Math.max(top.length, sub.length)

  // 2) 열 지도 만들기
  type Col = { kind: 'fixed'; field: string } | { kind: 'comp'; component: string; field: keyof ProductionComponent }
  const cols: (Col | null)[] = []
  let currentComp: string | null = null
  for (let i = 0; i < width; i++) {
    const t = norm(top[i])
    const s = norm(sub[i])
    if (t && FIXED_FIELDS[t] && !s) { cols[i] = { kind: 'fixed', field: FIXED_FIELDS[t] }; currentComp = null; continue }
    if (t) currentComp = t                       // 새 구성품 블록 시작 (병합 셀의 첫 칸)
    if (currentComp && SUB_FIELDS[s]) { cols[i] = { kind: 'comp', component: currentComp, field: SUB_FIELDS[s] }; continue }
    cols[i] = null
  }
  const found = new Set(cols.filter(c => c?.kind === 'fixed').map(c => (c as any).field))
  for (const need of ['serial_number', 'dealer_code', 'shipment_date']) {
    if (!found.has(need)) warnings.push(`'${need}' 항목 열을 찾지 못했습니다.`)
  }
  if (!found.has('serial_number')) throw new Error('SN 열을 찾을 수 없습니다.')

  // 3) 데이터 행
  const equipments: ProductionEquipment[] = []
  const components: ProductionComponent[] = []
  const dealers = new Map<string, string>()
  const seen = new Set<string>()

  for (let r = headerIdx + 2; r < matrix.length; r++) {
    const row = matrix[r]
    if (!Array.isArray(row)) continue
    const fixed: Record<string, unknown> = {}
    const comps = new Map<string, Partial<ProductionComponent>>()
    cols.forEach((c, i) => {
      if (!c) return
      if (c.kind === 'fixed') fixed[c.field] = row[i]
      else {
        const o = comps.get(c.component) || {}
        ;(o as any)[c.field] = val(row[i])
        comps.set(c.component, o)
      }
    })

    const sn = val(fixed.serial_number)?.toUpperCase()
    if (!sn) continue
    if (seen.has(sn)) {
      // 같은 SN이 두 번 나오면 마지막 행 기준으로 반영 (앞 행의 장비·구성품 제거)
      warnings.push(`중복 SN: ${sn} (${r + 1}행) - 마지막 행 기준으로 반영`)
      for (let k = equipments.length - 1; k >= 0; k--) if (equipments[k].serial_number === sn) equipments.splice(k, 1)
      for (let k = components.length - 1; k >= 0; k--) if (components[k].serial_number === sn) components.splice(k, 1)
    }
    seen.add(sn)

    let udi: string | null = null
    for (const [name, c] of comps) {
      if (looksLikeUdi(c.remark ?? null)) { udi = c.remark!; c.remark = null }
      const hasData = c.lot || c.hw_version || c.sw_version || c.dc_hw_version || c.dc_sw_version || c.remark
      if (!hasData) continue
      components.push({
        serial_number: sn, component: name,
        lot: c.lot ?? null, hw_version: c.hw_version ?? null, sw_version: c.sw_version ?? null,
        dc_hw_version: c.dc_hw_version ?? null, dc_sw_version: c.dc_sw_version ?? null, remark: c.remark ?? null,
      })
    }

    const dealerCode = val(fixed.dealer_code)
    const dealerName = val(fixed.dealer_name)
    if (dealerCode) dealers.set(dealerCode, dealerName || dealerCode)
    const stockFlag = val(fixed.in_stock)?.toUpperCase()
    const shipment = toIsoDate(fixed.shipment_date)
    const returned = toIsoDate(fixed.return_date)

    const eq: ProductionEquipment = {
      serial_number: sn,
      item_code: val(fixed.item_code),
      item_name: val(fixed.item_name),
      spec: val(fixed.spec),
      option_spec: val(fixed.option_spec),
      model_name: val(fixed.model_name),
      manufacture_date: toIsoDate(fixed.manufacture_date),
      receipt_type: val(fixed.receipt_type),
      dealer_code: dealerCode,
      dealer_name: dealerName,
      shipment_date: shipment,
      return_dealer_code: val(fixed.return_dealer_code),
      return_date: returned,
      in_stock: stockFlag === 'Y' ? true : stockFlag === 'N' ? false : null,
      udi,
      status: returned ? 'Returned' : (stockFlag === 'Y' || !shipment) ? 'In Stock' : 'Shipped',
    }
    equipments.push(eq)
  }

  return {
    equipments,
    components,
    dealers: [...dealers].map(([code, name]) => ({ code, name })),
    warnings,
  }
}
