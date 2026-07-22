export const CATEGORY_COLORS = [
  { text: 'text-[#EF4444]', bg: 'bg-[#EF4444]/10', border: 'border-[#EF4444]', hoverBg: 'hover:bg-[#EF4444]/20', hoverBorder: 'hover:border-[#EF4444]', hoverText: 'hover:text-[#EF4444]', hex: '#EF4444' }, // Red
  { text: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10', border: 'border-[#8B5CF6]', hoverBg: 'hover:bg-[#8B5CF6]/20', hoverBorder: 'hover:border-[#8B5CF6]', hoverText: 'hover:text-[#8B5CF6]', hex: '#8B5CF6' }, // Purple
  { text: 'text-[#F97316]', bg: 'bg-[#F97316]/10', border: 'border-[#F97316]', hoverBg: 'hover:bg-[#F97316]/20', hoverBorder: 'hover:border-[#F97316]', hoverText: 'hover:text-[#F97316]', hex: '#F97316' }, // Orange
  { text: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10', border: 'border-[#6B7280]', hoverBg: 'hover:bg-[#6B7280]/20', hoverBorder: 'hover:border-[#6B7280]', hoverText: 'hover:text-[#6B7280]', hex: '#6B7280' }, // Gray
  { text: 'text-[#1F2937]', bg: 'bg-[#1F2937]/10', border: 'border-[#1F2937]', hoverBg: 'hover:bg-[#1F2937]/20', hoverBorder: 'hover:border-[#1F2937]', hoverText: 'hover:text-[#1F2937]', hex: '#1F2937' }, // Dark
];

export function getCategoryColor(categoryName: string) {
  if (!categoryName) return CATEGORY_COLORS[1]; // Default to Purple
  
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
}
