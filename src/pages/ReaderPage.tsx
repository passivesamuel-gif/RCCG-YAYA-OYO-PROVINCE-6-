import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Book } from '../types/library';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { FullPageLoader } from '../components/ui/FullPageLoader';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  AlertCircle,
  Search,
  X,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { safeFetch } from '../lib/api';

// Bundle the matching worker with the app instead of relying on an external CDN.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface SearchMatch {
  pageNumber: number;
  preview: string;
}

export const ReaderPage: React.FC = () => {
  const { params, navigate } = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { getBookById, getProgressForBook, saveProgress } = useLibrary();

  const bookId = params.bookId || params.id || '';
  const contextBook = bookId ? getBookById(bookId) : undefined;
  const [directBook, setDirectBook] = useState<Book | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  // Direct fetch fallback for direct URLs
  useEffect(() => {
    if (!contextBook && bookId && !directBook) {
      getDoc(doc(db, 'books', bookId))
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDirectBook({
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
            });
          }
        })
        .catch(() => {});
    }
  }, [contextBook, bookId, directBook]);

  const book = contextBook || directBook || undefined;

  useEffect(() => {
    let cancelled = false;
    setPdfUrl('');
    if (!book) return;
    if (book.pdfUrl) {
      setPdfUrl(book.pdfUrl);
      return;
    }
    if (book.pdfStoragePath) {
      safeFetch<{ signedUrl?: string }>(`/api/files/signed-url?path=${encodeURIComponent(book.pdfStoragePath)}`)
        .then((result) => {
          if (!cancelled && result.success && result.data?.signedUrl) setPdfUrl(result.data.signedUrl);
        });
    }
    return () => { cancelled = true; };
  }, [book?.id, book?.pdfUrl, book?.pdfStoragePath]);

  // Auth gate check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=/read/${bookId}`);
    }
  }, [user, authLoading, bookId, navigate]);

  const existingProgress = bookId ? getProgressForBook(bookId) : undefined;

  // Reader state
  const [currentPage, setCurrentPage] = useState<number>(existingProgress ? existingProgress.currentPage : 1);
  const [totalPages, setTotalPages] = useState<number>(book?.pages || 1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(true);
  const [renderingPage, setRenderingPage] = useState<boolean>(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState<string>(String(currentPage));

  // In-document text search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [currentResultIdx, setCurrentResultIdx] = useState<number>(0);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document
  const loadPdfDocument = () => {
    if (!book || !pdfUrl) {
      setLoadingPdf(false);
      return;
    }

    setLoadingPdf(true);
    setPdfError(null);

    const loadTask = pdfjsLib.getDocument({
      url: pdfUrl,
      withCredentials: false,
    });

    loadTask.promise
      .then((doc) => {
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);

        const initialPage = existingProgress?.currentPage && existingProgress.currentPage <= doc.numPages
          ? existingProgress.currentPage
          : 1;
        setCurrentPage(initialPage);
        setPageInput(String(initialPage));
        setLoadingPdf(false);
      })
      .catch((err) => {
        console.error('PDF loading error:', err);
        setPdfError(
          "This book couldn't be opened right now. Please try again."
        );
        setLoadingPdf(false);
      });
  };

  useEffect(() => {
    loadPdfDocument();
  }, [pdfUrl, book?.id]);

  // Render Current Page onto Canvas
  useEffect(() => {
    if (!pdfDocRef.current || loadingPdf || pdfError) return;

    let isCancelled = false;
    setRenderingPage(true);

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDocRef.current!.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Container width calculation for responsive canvas
        const containerWidth = Math.min(window.innerWidth - 32, 880);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const baseScale = containerWidth / unscaledViewport.width;
        const finalScale = baseScale * (zoomLevel / 100);

        const viewport = page.getViewport({ scale: finalScale });
        const pixelRatio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };

        const renderTask = (page as any).render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        setRenderingPage(false);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render notice:', err);
        }
        setRenderingPage(false);
      }
    };

    renderPage();

    // Auto-save reading progress
    if (bookId) {
      saveProgress(bookId, currentPage, totalPages);
    }
    setPageInput(String(currentPage));

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [currentPage, zoomLevel, loadingPdf, totalPages, bookId]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(pageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setCurrentPage(target);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Text search
  const handlePerformSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query || !pdfDocRef.current) return;

    setIsSearching(true);
    setSearchResults([]);
    setSearchMessage('Searching volume...');

    const matches: SearchMatch[] = [];
    const doc = pdfDocRef.current;

    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .toLowerCase();

        if (pageText.includes(query)) {
          const matchIdx = pageText.indexOf(query);
          const start = Math.max(0, matchIdx - 30);
          const end = Math.min(pageText.length, matchIdx + query.length + 30);
          const preview = `...${pageText.substring(start, end).trim()}...`;

          matches.push({
            pageNumber: i,
            preview,
          });
        }
      }

      setSearchResults(matches);
      setIsSearching(false);

      if (matches.length > 0) {
        setCurrentResultIdx(0);
        setCurrentPage(matches[0].pageNumber);
        setSearchMessage(`Found ${matches.length} page(s) matching "${query}"`);
      } else {
        setSearchMessage(`No matches found for "${query}"`);
      }
    } catch (err) {
      console.error('Search error:', err);
      setIsSearching(false);
      setSearchMessage('An error occurred during search.');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return <FullPageLoader />;
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center p-4">
        <div className="bg-white border border-[#EEF5F0] rounded-xs p-8 max-w-md w-full text-center space-y-4 shadow-xs">
          <BookOpen className="w-8 h-8 text-[#123D2A] mx-auto" />
          <h2 className="font-heading font-extrabold text-xl text-[#123D2A]">
            Publication Not Available
          </h2>
          <p className="text-xs text-[#737B76]">
            The requested book could not be loaded from the library. Please check your connection or try again.
          </p>
          <Button variant="primary" onClick={() => navigate('/library')}>
            Return to Library Catalogue
          </Button>
        </div>
      </div>
    );
  }

  const readingPercentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#252B2A] flex flex-col select-none">
      {/* ------------------------------------------------------------- */}
      {/* TOP BAR: Slim Editorial Dark Forest Chrome                    */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-[#123D2A] text-white border-b border-[#0B2519] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: Back to Book Details */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/book/${book.id}`)}
              className="p-2 -ml-2 text-[#FAF8F2]/80 hover:text-white rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px] min-w-[44px]"
              aria-label="Back to volume details"
            >
              <ArrowLeft className="w-4 h-4 text-[#D4AF65]" />
              <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">
                Volume Details
              </span>
            </button>

            <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />

            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {book.title}
              </h1>
            </div>
          </div>

          {/* Right: Controls (Zoom, Search, Fullscreen) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Page Indicator */}
            <span className="text-[11px] font-heading font-semibold text-[#D4AF65] px-2 py-1 bg-white/10 rounded-xs hidden sm:inline">
              Page {currentPage} of {totalPages}
            </span>

            {/* Zoom Controls */}
            <div className="flex items-center border border-white/20 rounded-xs bg-white/5">
              <button
                onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
                className="p-2 text-[#FAF8F2]/80 hover:text-white cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-heading font-semibold px-1.5 text-white/80 hidden md:inline">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
                className="p-2 text-[#FAF8F2]/80 hover:text-white cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* In-Document Search Toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`p-2 rounded-xs transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center ${
                searchOpen ? 'bg-[#D4AF65] text-[#123D2A]' : 'text-[#FAF8F2]/80 hover:text-white'
              }`}
              aria-label="Search within document"
              title="Search document text"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-[#FAF8F2]/80 hover:text-white rounded-xs transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center hidden sm:flex"
              aria-label={isFullscreen ? 'Exit full screen' : 'Full screen reading'}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Thin Gold Reading Progress Track */}
        <div className="w-full h-1 bg-[#0B2519]">
          <div
            className="h-full bg-[#D4AF65] transition-all duration-300"
            style={{ width: `${readingPercentage}%` }}
          />
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* SEARCH OVERLAY PANEL                                          */}
      {/* ------------------------------------------------------------- */}
      {searchOpen && (
        <div className="bg-white border-b border-[#D4AF65]/40 shadow-md p-4 text-left">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-heading font-semibold text-[#123D2A] uppercase tracking-widest">
                Search in Book
              </span>
              <button
                onClick={() => setSearchOpen(false)}
                className="text-[#737B76] hover:text-[#123D2A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePerformSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words or phrases in this book..."
                className="flex-1 px-3 py-2 text-xs border border-[#EEF5F0] rounded-xs focus:outline-none focus:border-[#123D2A]"
                autoFocus
              />
              <Button variant="primary" size="sm" type="submit" isLoading={isSearching}>
                Search
              </Button>
            </form>

            {searchMessage && (
              <p className="text-[11px] text-[#737B76] italic">{searchMessage}</p>
            )}

            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 pt-2 border-t border-[#EEF5F0]">
                {searchResults.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentResultIdx(idx);
                      setCurrentPage(m.pageNumber);
                    }}
                    className={`w-full text-left p-2 rounded-xs text-xs transition-colors flex items-center justify-between ${
                      currentPage === m.pageNumber ? 'bg-[#EEF5F0] text-[#123D2A] font-bold' : 'hover:bg-[#FAF8F2]'
                    }`}
                  >
                    <span className="truncate max-w-md">{m.preview}</span>
                    <span className="font-heading font-semibold text-[10px] text-[#123D2A] shrink-0 ml-2">Page {m.pageNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN READING AREA: Distraction-Free Warm Ivory / White Sheet  */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 overflow-auto flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8">
        {loadingPdf ? (
          <div className="w-full max-w-3xl aspect-[3/4] bg-white border border-[#EEF5F0] rounded-xs shadow-xs p-8 flex flex-col items-center justify-center space-y-4 animate-pulse">
            <div className="w-10 h-10 rounded-full border-2 border-[#123D2A] border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-[#123D2A] uppercase tracking-wider">
              Preparing Volume Pages...
            </p>
          </div>
        ) : pdfError ? (
          <div className="max-w-md bg-white border border-rose-200 p-8 rounded-xs text-center space-y-4 shadow-xs">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="font-heading font-bold text-base text-[#123D2A]">
              Unable to Display Document
            </h3>
            <p className="text-xs text-[#737B76] leading-relaxed">
              {pdfError}
            </p>
            <Button variant="primary" onClick={loadPdfDocument} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Retry Loading PDF
            </Button>
          </div>
        ) : (
          <div className="relative bg-white shadow-md border border-[#D4AF65]/20 rounded-xs overflow-hidden transition-all duration-200">
            {renderingPage && (
              <div className="absolute top-2 right-2 p-1.5 bg-[#123D2A]/80 text-[#D4AF65] rounded-xs text-[10px] flex items-center gap-1.5 z-10">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Rendering</span>
              </div>
            )}
            <canvas ref={canvasRef} className="block mx-auto" />
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM CONTROLS: 44px Touch Targets, Page Jump & Progress      */}
      {/* ------------------------------------------------------------- */}
      <footer className="sticky bottom-0 z-40 bg-white border-t border-[#EEF5F0] px-4 py-2.5 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          {/* Previous Page Button (44px min touch target) */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-[#FAF8F2] hover:bg-[#EEF5F0] text-[#123D2A] disabled:opacity-40 rounded-xs text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px] cursor-pointer"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Jump Input Form */}
          <form onSubmit={handlePageJump} className="flex items-center gap-2 text-xs">
            <span className="text-[#737B76]">Page</span>
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-12 py-1 text-center font-heading font-bold text-xs border border-[#EEF5F0] rounded-xs focus:outline-none focus:border-[#123D2A] bg-[#FAF8F2]"
              aria-label="Current page number"
            />
            <span className="text-[#737B76]">of {totalPages}</span>
            <button
              type="submit"
              className="text-[11px] font-semibold text-[#123D2A] hover:underline cursor-pointer hidden sm:inline"
            >
              Go
            </button>
          </form>

          {/* Next Page Button (44px min touch target) */}
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 bg-[#123D2A] hover:bg-[#1A543A] text-white disabled:opacity-40 rounded-xs text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px] cursor-pointer shadow-xs"
            aria-label="Next Page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4 text-[#D4AF65]" />
          </button>
        </div>
      </footer>
    </div>
  );
};
