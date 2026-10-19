import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { Book } from '../types/library';
import { ArrowLeft, BookOpen, Bookmark, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { FullPageLoader } from '../components/ui/FullPageLoader';

export const BookDetailPage: React.FC = () => {
  const { params, navigate, path } = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { books, getProgressForBook, loadingBooks } = useLibrary();

  const targetId = params.id || params.bookId || '';
  const showDebug = typeof window !== 'undefined' && (window.location.search.includes('debug=1') || window.location.href.includes('debug=1'));

  const [fetchedBook, setFetchedBook] = useState<Book | null>(null);
  const [directLoading, setDirectLoading] = useState<boolean>(false);
  const [directFetchAttempted, setDirectFetchAttempted] = useState<boolean>(false);
  const [directFetchError, setDirectFetchError] = useState<string | null>(null);

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=/book/${targetId}`);
    }
  }, [user, authLoading, targetId, navigate]);

  // Attempt 1: Find in context list
  const listBook = books.find((b) => b.id === targetId || b.id === params.id || b.id === params.bookId);

  // Attempt 2: Direct document fetch if not found in list and list loading finished
  useEffect(() => {
    if (listBook) {
      setFetchedBook(null);
      setDirectLoading(false);
      return;
    }

    if (!loadingBooks && targetId && !directFetchAttempted && !directLoading) {
      setDirectLoading(true);
      setDirectFetchError(null);

      const docRef = doc(db, 'books', targetId);
      getDoc(docRef)
        .then((docSnap) => {
          setDirectFetchAttempted(true);
          setDirectLoading(false);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const b: Book = {
              id: docSnap.id,
              title: data.title || 'Untitled Volume',
              author: data.author || 'Unknown Author',
              category: data.category || 'General',
              description: data.description || '',
              coverUrl: data.coverUrl || '',
              coverStoragePath: data.coverStoragePath || '',
              pdfUrl: data.pdfUrl || '',
              pdfStoragePath: data.pdfStoragePath || '',
              pages: data.pages || 0,
              published: data.published ?? true,
              featured: data.featured ?? false,
              tags: data.tags || [],
              uploadStatus: data.uploadStatus || 'completed',
              createdAt: data.createdAt || Date.now(),
              updatedAt: data.updatedAt,
            };
            setFetchedBook(b);
          } else {
            setFetchedBook(null);
          }
        })
        .catch((err) => {
          setDirectFetchAttempted(true);
          setDirectLoading(false);
          setDirectFetchError(err?.message || 'Failed to fetch book from database');
        });
    }
  }, [listBook, loadingBooks, targetId, directFetchAttempted, directLoading]);

  const activeBook = listBook || fetchedBook;
  const isStillLoading = authLoading || loadingBooks || directLoading;

  if (isStillLoading && !activeBook) {
    return <FullPageLoader />;
  }

  // Reason for failure diagnostic
  let failReason = 'None (book found)';
  if (!activeBook) {
    if (loadingBooks || directLoading) {
      failReason = 'book list or direct lookup not loaded yet';
    } else if (!targetId) {
      failReason = 'route does not match or missing ID';
    } else if (directFetchError) {
      failReason = `database error: ${directFetchError}`;
    } else {
      failReason = 'no book has that ID in database';
    }
  }

  const renderDebugPanel = () => {
    if (!showDebug) return null;
    const hasPdf = Boolean(activeBook && (activeBook.pdfUrl || activeBook.pdfStoragePath));
    return (
      <div className="mt-8 p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded border border-amber-500/40 text-left space-y-2">
        <p className="font-bold text-amber-400 text-sm border-b border-slate-700 pb-1">
          STEP 4 DIAGNOSTIC & VERIFICATION PANEL (?debug=1)
        </p>
        <div>
          <span className="text-amber-300 font-semibold">a) Exact Address Sent To:</span> {typeof window !== 'undefined' ? window.location.pathname + window.location.search : path}
        </div>
        <div>
          <span className="text-amber-300 font-semibold">b) Route Expected:</span> /book/:bookId | <span className="text-emerald-300">Extracted ID:</span> "{targetId}"
        </div>
        <div>
          <span className="text-amber-300 font-semibold">c) Books in Library ({books.length}):</span>
          {books.length === 0 ? (
            <p className="pl-3 text-slate-400">None in store array</p>
          ) : (
            <ul className="pl-3 list-disc space-y-0.5 mt-1 max-h-32 overflow-y-auto">
              {books.map((b) => (
                <li key={b.id}>
                  ID: <span className="text-amber-200">{b.id}</span> | Title: "{b.title}" | Status: {b.uploadStatus}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <span className="text-amber-300 font-semibold">d) Lookup Method Used:</span> 1. Context Array find ({listBook ? 'MATCHED' : 'NO MATCH'}) -&gt; 2. Direct Firestore Doc Fetch ({fetchedBook ? 'MATCHED' : directFetchAttempted ? 'NOT FOUND' : 'NOT NEEDED'})
        </div>
        <div>
          <span className="text-amber-300 font-semibold">e) Book Found:</span> {activeBook ? <span className="text-emerald-400 font-bold">YES ("{activeBook.title}" - ID: {activeBook.id})</span> : <span className="text-rose-400 font-bold">NO</span>}
        </div>
        <div>
          <span className="text-amber-300 font-semibold">f) PDF File Availability:</span> {hasPdf ? <span className="text-emerald-400 font-bold">READY (URL/Path Present)</span> : <span className="text-amber-400 font-bold">MISSING OR NOT SAVED YET ("This book isn't ready to read yet.")</span>}
        </div>
        <div>
          <span className="text-amber-300 font-semibold">g) Lookup Status Reason:</span> <span className="text-cyan-300">{failReason}</span>
        </div>
      </div>
    );
  };

  if (!activeBook) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-5 text-left">
        <div className="w-16 h-16 rounded-full border border-[#D4AF65] flex items-center justify-center mx-auto text-[#123D2A] bg-white">
          <BookOpen className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="font-heading font-extrabold text-2xl text-[#123D2A]">
            Book Not Found
          </h2>
          <p className="text-sm text-[#737B76] leading-relaxed">
            This book could not be found in the RCCG YAYA Oyo Province 6 library.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/library')}>
            Return to Library
          </Button>
        </div>
        {renderDebugPanel()}
      </div>
    );
  }

  const progress = getProgressForBook(activeBook.id);
  const hasStarted = progress && progress.currentPage > 1;
  const hasPdf = Boolean(activeBook.pdfUrl || activeBook.pdfStoragePath);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 text-left space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/library')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#737B76] hover:text-[#123D2A] transition-colors cursor-pointer group min-h-[44px] px-2"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Library</span>
        </button>
      </div>

      <div className="bg-white border border-[#EEF5F0] rounded-xs p-6 sm:p-10 shadow-xs relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Real Cover or Typographic Bookplate */}
          <div className="md:col-span-5 flex justify-center">
            <div className="w-full max-w-xs aspect-[3/4] bg-[#FAF8F2] border border-[#EEF5F0] rounded-xs overflow-hidden shadow-xs flex items-center justify-center">
              {activeBook.coverUrl ? (
                <img
                  src={activeBook.coverUrl}
                  alt={activeBook.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                /* Typographic Fallback Plate */
                <div className="w-full h-full p-6 flex flex-col justify-between bg-[#123D2A] text-white border-l-4 border-[#D4AF65]">
                  <div className="space-y-1">
                    <span className="text-[10px] font-heading uppercase tracking-widest text-[#D4AF65] font-semibold block">
                      RCCG YAYA OYO 6
                    </span>
                    <div className="w-8 h-[1.5px] bg-[#D4AF65] my-2" />
                    <span className="text-[10px] text-[#FAF8F2]/60 uppercase tracking-wider block">
                      {activeBook.category}
                    </span>
                  </div>

                  <div className="my-auto py-4">
                    <h2 className="font-heading font-extrabold text-base sm:text-lg leading-snug line-clamp-5 text-white">
                      {activeBook.title}
                    </h2>
                    <p className="text-xs text-[#FAF8F2]/75 mt-3">
                      by {activeBook.author}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-[#D4AF65] font-heading font-semibold">
                    <span>Library Book</span>
                    {activeBook.pages > 0 && <span>{activeBook.pages} pp</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Metadata & Reading Call to Action */}
          <div className="md:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-[11px] font-heading font-semibold tracking-widest text-[#123D2A] uppercase block">
                {activeBook.category}
              </span>
              <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#123D2A] tracking-tight leading-tight">
                {activeBook.title}
              </h1>
              <p className="text-sm font-semibold text-[#252B2A]">
                by <span className="text-[#123D2A]">{activeBook.author}</span>
              </p>
              <div className="h-[1.5px] w-12 bg-[#D4AF65] mt-2" />
            </div>

            {/* Reading Progress Indicator if active */}
            {progress && (
              <div className="p-4 bg-[#FAF8F2] border border-[#EEF5F0] rounded-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#123D2A] flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-[#123D2A]" />
                    <span>Your Reading Progress</span>
                  </span>
                  <span className="font-heading font-semibold text-[#737B76]">
                    Page {progress.currentPage} of {progress.totalPages || activeBook.pages || '—'} ({progress.percentage}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#EEF5F0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#123D2A]"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2">
              {hasPdf ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate(`/read/${activeBook.id}`)}
                  icon={<BookOpen className="w-4 h-4 text-[#D4AF65]" />}
                  className="min-h-[44px]"
                >
                  {hasStarted
                    ? `Continue Reading (Page ${progress.currentPage})`
                    : 'Start Reading'}
                </Button>
              ) : (
                <div className="p-4 bg-[#FAF8F2] border border-amber-200 rounded-xs flex items-center gap-3 text-amber-800 text-xs font-semibold">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>This book isn't ready to read yet.</span>
                </div>
              )}
            </div>

            {/* Metadata Summary Details */}
            <div className="border-t border-[#EEF5F0] pt-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-[#737B76]">
                  Pages
                </p>
                <p className="font-semibold text-[#252B2A] mt-0.5">
                  {activeBook.pages > 0 ? `${activeBook.pages} Pages` : 'Digital PDF'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-[#737B76]">
                  Access
                </p>
                <p className="font-semibold text-[#252B2A] mt-0.5">
                  Open to All Readers
                </p>
              </div>
            </div>

            {/* Book Description */}
            {activeBook.description && (
              <div className="border-t border-[#EEF5F0] pt-4 space-y-2">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#123D2A]">
                  About This Book
                </h3>
                <p className="text-xs sm:text-sm text-[#252B2A]/85 leading-relaxed whitespace-pre-line">
                  {activeBook.description}
                </p>
              </div>
            )}

            {/* Book Tags if present */}
            {activeBook.tags && activeBook.tags.length > 0 && (
              <div className="border-t border-[#EEF5F0] pt-4 flex flex-wrap gap-1.5">
                {activeBook.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-[#FAF8F2] text-[#123D2A] text-[10px] font-semibold tracking-wider uppercase rounded-xs border border-[#EEF5F0]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {renderDebugPanel()}
    </div>
  );
};

