import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-[#EEF5F0] rounded-xs ${className}`}
      aria-hidden="true"
    />
  );
};

export const BookCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-[#EEF5F0] rounded-xs overflow-hidden text-left p-0">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="p-3.5 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <div className="pt-2 border-t border-[#EEF5F0] flex justify-between">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  );
};

export const TableRowSkeleton: React.FC = () => {
  return (
    <tr className="border-b border-[#EEF5F0] animate-pulse">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-14 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      </td>
      <td className="py-3 px-4 hidden sm:table-cell">
        <Skeleton className="h-3 w-20" />
      </td>
      <td className="py-3 px-4 hidden md:table-cell">
        <Skeleton className="h-3 w-12" />
      </td>
      <td className="py-3 px-4 text-right">
        <Skeleton className="h-8 w-16 ml-auto" />
      </td>
    </tr>
  );
};
