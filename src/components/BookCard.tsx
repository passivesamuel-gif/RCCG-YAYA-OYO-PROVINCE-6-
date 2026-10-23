import React, { useState } from 'react';
import { Book } from '../types/library';
import { useRouter } from '../context/RouterContext';
import { useLibrary } from '../context/LibraryContext';
import { BookOpen } from 'lucide-react';

interface BookCardProps {
  book: Book;
  compact?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({ book, compact = false }) => {
  const { navigate } = useRouter();
  const { getProgressForBook } = useLibrary();

  const progress = getProgressForBook(book.id);
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <article
      onClick={() => navigate(`/book/${book.id}`)}
      className="group flex flex-col bg-white border border-[#EEF5F0] hover:border-[#D4AF65]/60 transition-all duration-200 cursor-pointer overflow-hidden text-left"
    >
      {/* Cover Frame */}
      <div className="relative aspect-[3/4] bg-[#FAF8F2] overflow-hidden flex items-center justify-center border-b border-[#EEF5F0]">
        {book.coverUrl && !coverFailed ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(event) => {
              console.warn('Book cover could not be loaded', { bookId: book.id, src: event.currentTarget.src });
              setCoverFailed(true);
            }}
          />
        ) : (
          /* Typographic Fallback Plate */
          <div className="w-full h-full p-5 flex flex-col justify-between bg-[#123D2A] text-white border-l-4 border-[#D4AF65]">
            <div className="space-y-1">
              <span className="text-[9px] font-heading uppercase tracking-widest text-[#D4AF65] font-semibold block">
                RCCG YAYA OYO 6
              </span>
              <div className="w-6 h-[1px] bg-[#D4AF65]/50 my-2" />
            </div>

            <div className="my-auto py-2">
              <h4 className="font-heading font-extrabold text-xs sm:text-sm leading-snug line-clamp-4 text-white">
                {book.title}
              </h4>
              <p className="text-[11px] text-[#FAF8F2]/75 mt-2 line-clamp-2">
                {book.author}
              </p>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-heading font-semibold text-[#D4AF65] uppercase tracking-wider">
              <span className="truncate max-w-[100px]">{book.category}</span>
              {book.pages > 0 && <span>{book.pages} pp</span>}
            </div>
          </div>
        )}

        {/* Real Progress Indicator Strip if reading */}
        {progress && progress.percentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#EEF5F0]">
            <div
              className="h-full bg-[#123D2A]"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Book Metadata & Typography */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          {/* Eyebrow: Category in Forest Green for AA contrast */}
          <span className="text-[10px] font-heading font-semibold tracking-wider text-[#123D2A] uppercase block truncate">
            {book.category}
          </span>

          {/* Book Title */}
          <h3 className="font-heading font-bold text-xs sm:text-sm text-[#252B2A] group-hover:text-[#123D2A] transition-colors line-clamp-3 leading-snug">
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-xs text-[#737B76] truncate">
            by {book.author}
          </p>
        </div>

        {/* Footer info: Real Progress or Page Count */}
        <div className="pt-2 border-t border-[#EEF5F0] flex items-center justify-between text-[11px] text-[#737B76]">
          {progress ? (
            <span className="font-semibold text-[#123D2A]">
              Page {progress.currentPage}{progress.totalPages > 0 ? ` of ${progress.totalPages}` : ''} ({progress.percentage}%)
            </span>
          ) : book.pages > 0 ? (
            <span>{book.pages} pages</span>
          ) : (
            <span>Digital Book</span>
          )}

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#123D2A] group-hover:text-[#1A543A] transition-colors">
            <BookOpen className="w-3 h-3" />
            <span>Open</span>
          </span>
        </div>
      </div>
    </article>
  );
};
