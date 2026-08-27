interface TableScrollProps {
  children: React.ReactNode;
  minWidth?: number;
}

/**
 * TableScroll — bungkus <table> agar bisa scroll horizontal di mobile
 * tanpa terpotong. Kolom angka tidak menyempit (whitespace-nowrap via th/td).
 */
export function TableScroll({ children, minWidth = 640 }: TableScrollProps) {
  return (
    <div className="table-scroll no-scrollbar">
      <div style={{ minWidth: `${minWidth}px` }}>{children}</div>
    </div>
  );
}