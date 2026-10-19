import React, { useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { BookOpen } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { FullPageLoader } from '../components/ui/FullPageLoader';

export const DashboardPage: React.FC = () => {
  const { user, userFirstName, loading: authLoading } = useAuth();
  const { books, readingProgress, loadingBooks } = useLibrary();
  const { navigate } = useRouter();

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/dashboard');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || (!user && !authLoading)) {
    return <FullPageLoader />;
  }

  // Join user's reading milestones with library catalogue metadata
  const activeReadingList = Object.entries(readingProgress)
    .map(([bookId, prog]) => {
      const book = books.find((b) => b.id === bookId);
      return {
        bookId,
        book,
        currentPage: prog.currentPage,
        totalPages: prog.totalPages,
        percentage: prog.percentage,
        updatedAt: prog.updatedAt,
      };
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const hasReadingActivity = activeReadingList.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 text-left space-y-8">
      {/* Editorial Header */}
      <div className="border-b border-[#EEF5F0] pb-6 space-y-2">
        <div className="space-y-1">
          <p className="text-[11px] font-heading font-semibold uppercase tracking-widest text-[#123D2A]">
            Reading History
          </p>
          <div className="h-[1.5px] w-12 bg-[#D4AF65]" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pt-1">
          <div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-[#123D2A] tracking-tight">
              My Reading Log
            </h1>
            <p className="text-xs sm:text-sm text-[#737B76] max-w-2xl leading-relaxed mt-1">
              Welcome back{userFirstName ? `, ${userFirstName}` : ''}. Pick up right where you paused.
            </p>
          </div>

          {hasReadingActivity && (
            <p className="text-xs text-[#737B76] font-heading font-semibold shrink-0">
              <span className="font-bold text-[#123D2A]">{activeReadingList.length}</span> Active {activeReadingList.length === 1 ? 'Book' : 'Books'}
            </p>
          )}
        </div>
      </div>

      {/* Reading List or Designed Empty State */}
      {!hasReadingActivity ? (
        <EmptyState
          type="reading"
          title="No books in progress."
          description="You have not started reading any books yet. Explore the collection to begin."
          actionText="Browse Library"
          onAction={() => navigate('/library')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeReadingList.map(({ book, currentPage, totalPages, percentage }) => {
            if (!book) return null;
            return (
              <div
                key={book.id}
                className="bg-white border border-[#EEF5F0] hover:border-[#D4AF65]/60 rounded-xs p-5 flex flex-col justify-between space-y-4 shadow-xs text-left transition-all group"
              >
                <div className="flex gap-4">
                  {/* Miniature Cover */}
                  <div className="w-16 h-22 bg-[#123D2A] text-white rounded-xs overflow-hidden shrink-0 flex items-center justify-center border border-[#EEF5F0]">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[10px] font-heading font-semibold text-[#D4AF65]">PDF</span>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-heading font-semibold text-[#123D2A] uppercase tracking-wider block truncate">
                      {book.category}
                    </span>
                    <h3 className="font-heading font-bold text-sm text-[#123D2A] group-hover:text-[#1A543A] transition-colors line-clamp-2 leading-snug">
                      {book.title}
                    </h3>
                    <p className="text-xs text-[#737B76] truncate">
                      by {book.author}
                    </p>
                  </div>
                </div>

                {/* Progress bar and metrics */}
                <div className="space-y-2 border-t border-[#EEF5F0] pt-3">
                  <div className="flex items-center justify-between text-xs text-[#737B76]">
                    <span>Page {currentPage} of {totalPages || book.pages || '—'}</span>
                    <span className="font-heading font-bold text-[#123D2A]">{percentage}%</span>
                  </div>
                  <div className="w-full h-1 bg-[#EEF5F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#123D2A] transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Resume button */}
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => navigate(`/read/${book.id}`)}
                  icon={<BookOpen className="w-3.5 h-3.5 text-[#D4AF65]" />}
                >
                  Continue Reading
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
