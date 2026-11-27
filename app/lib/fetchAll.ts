// Supabase는 한 번 조회에 최대 1,000건만 돌려줍니다.
// 그래서 1,000건씩 나눠서 끝까지 가져옵니다. (예: 장비 1,268대가 1,000대로 보이던 문제 해결)
//
// 사용 예: const rows = await fetchAll((from, to) =>
//            supabase.from('equipments').select('*').order('serial_number').range(from, to))

const PAGE = 1000

export async function fetchAll<T = any>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all
}

// 배열을 n개씩 나누기 (대량 insert / in() 조회용)
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
