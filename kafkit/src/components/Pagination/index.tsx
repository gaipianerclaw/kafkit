import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const { t } = useTranslation();
  
  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总是显示第一页
      pages.push(1);
      
      // 计算中间页码范围
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // 调整范围以确保显示3个中间页码
      if (currentPage <= 2) {
        endPage = 4;
      } else if (currentPage >= totalPages - 1) {
        startPage = totalPages - 3;
      }
      
      // 添加省略号
      if (startPage > 2) {
        pages.push('...');
      }
      
      // 添加中间页码
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // 添加省略号
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      // 总是显示最后一页
      pages.push(totalPages);
    }
    
    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalPages <= 1 && totalItems <= pageSizeOptions[0]) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
      {/* 左侧：统计信息 */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {t('pagination.showing', { start: startItem, end: endItem, total: totalItems })}
        </span>
        
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('pagination.perPage')}</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 px-2 text-sm border border-border rounded bg-background hover:border-muted-foreground/50 transition-colors"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">{t('pagination.items')}</span>
          </div>
        )}
      </div>

      {/* 右侧：分页导航 */}
      <div className="flex items-center gap-1">
        {/* 上一页 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
          title={t('pagination.previous')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* 页码 */}
        {getPageNumbers().map((page, index) => (
          <div key={index}>
            {page === '...' ? (
              <span className="px-2 text-muted-foreground">...</span>
            ) : (
              <Button
                variant={currentPage === page ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className="h-8 w-8 p-0 text-sm"
              >
                {page}
              </Button>
            )}
          </div>
        ))}

        {/* 下一页 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
          title={t('pagination.next')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
