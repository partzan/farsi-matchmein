export const CATEGORY_COLORS = [
  { text: 'text-[#FF3D71]', bg: 'bg-[#FF3D71]/10', border: 'border-[#FF3D71]', hoverBg: 'hover:bg-[#FF3D71]/20', hoverBorder: 'hover:border-[#FF3D71]', hoverText: 'hover:text-[#FF3D71]', hex: '#FF3D71' },
  { text: 'text-[#200443]', bg: 'bg-[#200443]/10', border: 'border-[#200443]', hoverBg: 'hover:bg-[#200443]/20', hoverBorder: 'hover:border-[#200443]', hoverText: 'hover:text-[#200443]', hex: '#200443' },
  { text: 'text-[#FF6B2C]', bg: 'bg-[#FF6B2C]/10', border: 'border-[#FF6B2C]', hoverBg: 'hover:bg-[#FF6B2C]/20', hoverBorder: 'hover:border-[#FF6B2C]', hoverText: 'hover:text-[#FF6B2C]', hex: '#FF6B2C' },
  { text: 'text-[#C026D3]', bg: 'bg-[#C026D3]/10', border: 'border-[#C026D3]', hoverBg: 'hover:bg-[#C026D3]/20', hoverBorder: 'hover:border-[#C026D3]', hoverText: 'hover:text-[#C026D3]', hex: '#C026D3' },
  { text: 'text-[#00D4E8]', bg: 'bg-[#00D4E8]/10', border: 'border-[#00D4E8]', hoverBg: 'hover:bg-[#00D4E8]/20', hoverBorder: 'hover:border-[#00D4E8]', hoverText: 'hover:text-[#00D4E8]', hex: '#00D4E8' },
];

export function getCategoryColor(categoryName: string) {
  if (!categoryName) return CATEGORY_COLORS[1];

  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
}
