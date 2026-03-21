import type { Transaction, FilterType } from './types';

export const fmt = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export function getFilteredData(
  rawData: Transaction[],
  currentFilter: FilterType
): Transaction[] {
  let data = rawData;

  if (currentFilter === 'all') return data;
  if (currentFilter === 'actual') return data.filter(d => d.status === 'Actual');
  if (currentFilter === 'forecast') return data.filter(d => d.status === 'Forecast');
  return data.filter(d => d.month === currentFilter);
}

export function classifyCost(desc: string): 'fixed' | 'production' | 'onetime' {
  if (/เงินเดือน|ChatGPT|Gemini|Claude|บัญชี|ธรรมเนียม/.test(desc)) return 'fixed';
  if (/อุปกรณ์|ไมค์|จอมอนิเตอร์|ฟอนต์|Freepik|Vecteezy|ตั๋วงาน|ภาษี/.test(desc)) return 'onetime';
  if (/ค่าจ้าง|โบนัส|พากย์เสียง|เขียนบท|ตัดต่อ|ฟุตเทจ|กราฟิกข่าว|จัดหาข่าว|ดูแลลูกค้า|ดูแลคอมมูนิตี้/.test(desc)) return 'production';
  return 'fixed';
}

export function calculateHHI(data: Transaction[]): number {
  const sources: Record<string, number> = {};
  data.filter(d => d.type === 'Inflow').forEach(d => {
    let src = 'Other';
    if (d.desc.includes('Eightcap')) src = 'Eightcap';
    else if (d.desc.includes('InnovestX')) src = 'InnovestX';
    else if (d.desc.includes('OceanLife')) src = 'OceanLife';
    else if (d.desc.includes('เงินเทอร์โบ')) src = 'เงินเทอร์โบ';
    else if (d.desc.includes('Facebook')) src = 'Facebook Ads';
    else if (d.desc.includes('TikTok')) src = 'TikTok';
    sources[src] = (sources[src] || 0) + d.amount;
  });
  const total = Object.values(sources).reduce((s, v) => s + v, 0);
  if (total === 0) return 10000;
  return Object.values(sources).reduce((hhi, v) => hhi + Math.pow((v / total) * 100, 2), 0);
}

export function getCostType(d: Transaction): 'Direct' | 'Indirect' | null {
  if (d.category !== 'ต้นทุนสินค้า' || d.entity !== 'Video Production') return null;
  const directKeywords = [
    'พากย์เสียง',
    'เขียนบท',
    'ทำฟุตเทจ',
    'ตัดต่อ',
    'Production',
    'ค่าจ้าง',
    'โบนัส',
    'ค่าจ้างจัดทำของ',
  ];
  if (directKeywords.some(k => d.desc.includes(k))) return 'Direct';
  return 'Indirect';
}
