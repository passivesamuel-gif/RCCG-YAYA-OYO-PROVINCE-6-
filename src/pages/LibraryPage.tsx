import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { BookCard } from '../components/BookCard';
import { EmptyState } from '../components/ui/EmptyState';
import { BookCardSkeleton } from '../components/ui/Skeleton';
import { FullPageLoader } from '../components/ui/FullPageLoader';
import { Search, X, LayoutGrid, List, BookOpen } from 'lucide-react';

export const LibraryPage: React.FC = () => {
  const { navigate } = useRouter();
  const { user, userFirstName, loading: authLoading } = useAuth();
  const {
    books,
    loadingBooks,
    booksError,
    refetchBooks,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    filteredBooks,
    readingProgress,
  } = useLibrary();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Auth gate check
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/library');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || (!user && !authLoading)) {
    return <FullPageLoader />;
  }

  const hasBooks = books.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 text-left space-y-8">
      {/* ----------------------------------------------------------- */}
      {/* Editorial Header with Personalized Greeting                 */}
      {/* ----------------------------------------------------------- */}
      <div className="border-b border-[#EEF5F0] pb-6 space-y-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-heading font-semibold uppercase tracking-widest text-[#123D2A]">
              RCCG YAYA Oyo Province 6 · Library
            </p>
          </div>
          <div className="h-[1.5px] w-12 bg-[#D4AF65]" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pt-1">
          <div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-[#123D2A] tracking-tight">
              {userFirstName ? `Welcome back, ${userFirstName}!` : 'Welcome back!'}
            </h1>
            <p className="text-xs sm:text-sm text-[#737B76] max-w-2xl leading-relaxed mt-1">
              Deepen biblical understanding, nurture godly leadership, and pursue spiritual maturity through our curated collection.
            </p>
          </div>

          {/* Real Count Only When Above Zero */}
          {hasBooks && (
            <div className="flex items-center gap-4 shrink-0">
              <p className="text-xs text-[#737B76] font-heading font-semibold">
                <span className="font-bold text-[#123D2A]">{books.length}</span>{' '}
                {books.length === 1 ? 'Book' : 'Books'} Available
              </p>

              {/* Grid / List View Toggle */}
              <div className="flex items-center border border-[#EEF5F0] rounded-xs p-0.5 bg-white">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#123D2A] text-white'
                      : 'text-[#737B76] hover:text-[#123D2A]'
                  }`}
                  aria-label="Bookshelf grid view"
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-[#123D2A] text-white'
                      : 'text-[#737B76] hover:text-[#123D2A]'
                  }`}
                  aria-label="Catalogue list view"
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Content Area                                                */}
      {/* ----------------------------------------------------------- */}
      {loadingBooks ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : booksError ? (
        <EmptyState
          type="error"
          title="Unable to connect to the library right now."
          description={booksError}
          actionText="Retry"
          onAction={refetchBooks}
        />
      ) : !hasBooks ? (
        /* Zero Books Empty State (No Search Bar, No Filter Chips) */
        <EmptyState
          type="library"
          title="Our library is being prepared."
          description="New books will appear here as they become available. Please check back soon."
        />
      ) : (
        /* Real Library Catalog: Controls + Books */
        <div className="space-y-6">
          {/* Dynamic Search & Filter Controls from Real Data */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-[#EEF5F0] rounded-xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#737B76] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author, or keyword..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xs border border-[#EEF5F0] bg-[#FAF8F2]/40 focus:bg-white focus:outline-none focus:border-[#123D2A] text-[#252B2A] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737B76] hover:text-[#123D2A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Category & Sorting */}
            <div className="flex flex-wrap items-center gap-3">
              {categories.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-[#737B76]">
                  <span className="font-semibold uppercase text-[10px] tracking-wider text-[#252B2A]">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="py-1.5 px-2.5 text-xs rounded-xs border border-[#EEF5F0] bg-white text-[#252B2A] focus:outline-none focus:border-[#123D2A] cursor-pointer"
                  >
                    <option value="All">All Categories ({books.length})</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-[#737B76]">
                <span className="font-semibold uppercase text-[10px] tracking-wider text-[#252B2A]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'title')}
                  className="py-1.5 px-2.5 text-xs rounded-xs border border-[#EEF5F0] bg-white text-[#252B2A] focus:outline-none focus:border-[#123D2A] cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Display */}
          {filteredBooks.length === 0 ? (
            <EmptyState
              type="search"
              title="No books found."
              description="No books match your search or filter criteria. Try clearing filters or exploring all categories."
              actionText="Clear filters"
              onAction={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
            />
          ) : viewMode === 'grid' ? (
            /* Bookshelf Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            /* Compact Catalogue List View */
            <div className="bg-white border border-[#EEF5F0] rounded-xs divide-y divide-[#EEF5F0]">
              {filteredBooks.map((book) => {
                const prog = readingProgress[book.id];
                return (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-[#FAF8F2] transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-16 bg-[#123D2A] text-white rounded-xs overflow-hidden shrink-0 flex items-center justify-center border border-[#D4AF65]/30">
                        {book.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] font-heading font-semibold text-[#123D2A]">PDF</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] font-heading font-semibold text-[#123D2A] uppercase tracking-wider block">
                          {book.category}
                        </span>
                        <h4 className="font-heading font-bold text-sm text-[#123D2A] truncate">
                          {book.title}
                        </h4>
                        <p className="text-xs text-[#737B76] truncate">
                          by {book.author}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-right">
                      {prog && prog.percentage > 0 ? (
                        <div className="hidden sm:block">
                          <p className="text-xs font-semibold text-[#123D2A]">
                            Page {prog.currentPage} ({prog.percentage}%)
                          </p>
                          <div className="w-20 h-1 bg-[#EEF5F0] rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-[#123D2A]"
                              style={{ width: `${prog.percentage}%` }}
                            />
                          </div>
                        </div>
                      ) : book.pages > 0 ? (
                        <span className="hidden sm:block text-xs text-[#737B76]">
                          {book.pages} pages
                        </span>
                      ) : null}

                      <span className="text-xs font-semibold text-[#123D2A] hover:text-[#D4AF65] flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
