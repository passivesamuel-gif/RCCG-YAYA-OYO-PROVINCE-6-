import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { safeFetch } from '../lib/api';
import { useAuth } from './AuthContext';
import { Book, ReadingProgress } from '../types/library';

export interface UploadProgressInfo {
  percent: number;
  statusText: string;
  pdfProgress: number;
  coverProgress: number;
  speedText: string;
  etaText: string;
  isStalled: boolean;
}

interface UploadBookParams {
  title: string;
  author: string;
  category: string;
  description: string;
  pdfFile: File;
  coverFile?: File | null;
  featured?: boolean;
  published?: boolean;
  tags?: string[];
  onProgress?: (info: UploadProgressInfo) => void;
}

export interface UploadErrorRecord {
  message: string;
  bookId: string;
  timestamp: number;
  details?: string;
}

interface LibraryContextType {
  books: Book[];
  loadingBooks: boolean;
  booksError: string | null;
  refetchBooks: () => void;
  categories: string[];
  readingProgress: Record<string, ReadingProgress>;
  loadingProgress: boolean;
  searchQuery: string;
  selectedCategory: string;
  sortBy: 'newest' | 'title';
  filteredBooks: Book[];
  lastUploadError: UploadErrorRecord | null;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: string) => void;
  setSortBy: (sort: 'newest' | 'title') => void;
  getBookById: (id: string) => Book | undefined;
  getProgressForBook: (bookId: string) => ReadingProgress | undefined;
  saveProgress: (bookId: string, page: number, totalPages: number) => Promise<void>;
  updateBookPageCount: (bookId: string, pageCount: number) => Promise<void>;
  uploadBook: (params: UploadBookParams) => Promise<{ success: boolean; bookId?: string; error?: string }>;
  editBook: (
    bookId: string,
    updates: Partial<Book>,
    files?: {
      newPdfFile?: File | null;
      newCoverFile?: File | null;
      onProgress?: (info: UploadProgressInfo) => void;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  removeBook: (book: Book) => Promise<{ success: boolean; error?: string }>;
  retryBackgroundUpload: (bookId: string, pdfFile?: File, coverFile?: File | null) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

// Helper to compress/resize cover image in browser before upload
export async function compressCoverImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxW = 800;
        const maxH = 1200;
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// Friendly error mapping for uploads
export function mapUploadError(err: any): string {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('storage/unauthorized') || msg.includes('permission') || msg.includes('unauthorized')) {
    return 'Permission denied. Please ensure you are signed in with administrator credentials.';
  }
  if (msg.includes('storage/canceled') || msg.includes('canceled')) {
    return 'Upload was canceled.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('offline')) {
    return 'Network connection dropped. Please check your internet connection and retry.';
  }
  if (msg.includes('file-too-large') || msg.includes('exceeds')) {
    return 'File is too large. Maximum size for PDF is 50 MB and cover image is 5 MB.';
  }
  return err?.message || 'An unexpected error occurred during upload. Please try again.';
}

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState<boolean>(true);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [refetchCounter, setRefetchCounter] = useState<number>(0);
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [loadingProgress, setLoadingProgress] = useState<boolean>(true);
  const [lastUploadError, setLastUploadError] = useState<UploadErrorRecord | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'title'>('newest');

  // Debounce ref for progress updates
  const progressDebounceTimer = useRef<Record<string, any>>({});

  const refetchBooks = () => {
    setRefetchCounter((prev) => prev + 1);
  };

  // 1. Fetch books from Firestore with 15-second safety timeout
  useEffect(() => {
    if (!user) {
      let cancelled = false;
      setLoadingBooks(true);
      safeFetch<{ books?: any[] }>('/api/admin/books').then((result) => {
        if (cancelled) return;
        if (!result.success || !Array.isArray(result.data?.books)) {
          setBooks([]);
          setLoadingBooks(false);
          setBooksError(null);
          return;
        }
        const loaded = result.data.books.map((data: any) => ({
          id: String(data.id || ''),
          title: data.title || 'Untitled Volume',
          author: data.author || 'Unknown Author',
          category: data.category || 'General',
          description: data.description || '',
          coverUrl: data.coverUrl || '',
          coverStoragePath: data.coverStoragePath || '',
          pdfUrl: data.pdfUrl || '',
          pdfStoragePath: data.pdfStoragePath || '',
          pages: data.pages || 0,
          published: data.published ?? false,
          featured: data.featured ?? false,
          tags: data.tags || [],
          uploadStatus: data.uploadStatus || 'completed',
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt,
        }));
        loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setBooks(loaded);
        setLoadingBooks(false);
        setBooksError(null);
      });
      return () => { cancelled = true; };
    }

    setLoadingBooks(true);
    setBooksError(null);

    // 15-second safety timeout so loading placeholders never run forever
    const timer = setTimeout(() => {
      setLoadingBooks((prevLoading) => {
        if (prevLoading) {
          console.warn('[Library Timeout] 15s elapsed before snapshot callback resolved.');
          setBooksError('Unable to connect to the library right now. Please check your connection and try again.');
          return false;
        }
        return false;
      });
    }, 15000);

    let unsubscribe: () => void = () => {};

    try {
      const booksCol = collection(db, 'books');

      unsubscribe = onSnapshot(
        booksCol,
        (snapshot) => {
          clearTimeout(timer);
          const loaded: Book[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isPublished = data.published ?? false;
            const uploadStatus = data.uploadStatus || 'completed';

            loaded.push({
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
              published: isPublished,
              featured: data.featured ?? false,
              tags: data.tags || [],
              uploadStatus: uploadStatus,
              createdAt: data.createdAt || Date.now(),
              updatedAt: data.updatedAt,
            });
          });

          // Resolve private cover objects through the protected signed-URL endpoint.
          void Promise.all(loaded.map(async (book) => {
            if (!book.coverStoragePath || !book.published) return book;
            const coverResult = await safeFetch<{ signedUrl?: string }>(`/api/files/signed-url?path=${encodeURIComponent(book.coverStoragePath)}`);
            return coverResult.success && coverResult.data?.signedUrl
              ? { ...book, coverUrl: coverResult.data.signedUrl }
              : book;
          })).then((resolvedBooks) => {
            resolvedBooks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setBooks(resolvedBooks);
            setLoadingBooks(false);
            setBooksError(null);
          });
        },
        (err) => {
          clearTimeout(timer);
          console.error('[Library Firestore Listener Error]:', err?.code, err?.message, err);
          setLoadingBooks(false);
          setBooksError('Unable to connect to the library right now. Please verify your connection or try again.');
        }
      );
    } catch (err: any) {
      clearTimeout(timer);
      console.error('[Library Catch Error]:', err?.code, err?.message, err);
      setLoadingBooks(false);
      setBooksError('Unable to connect to the library right now.');
    }

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [user, refetchCounter]);

  // 2. Fetch user's real reading progress
  useEffect(() => {
    if (!user) {
      setReadingProgress({});
      setLoadingProgress(false);
      return;
    }

    setLoadingProgress(true);
    const progressCol = collection(db, 'users', user.uid, 'progress');

    const unsubscribe = onSnapshot(
      progressCol,
      (snapshot) => {
        const progMap: Record<string, ReadingProgress> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          progMap[docSnap.id] = {
            bookId: docSnap.id,
            currentPage: data.currentPage || 1,
            totalPages: data.totalPages || 1,
            percentage: data.percentage || 0,
            updatedAt: data.updatedAt || Date.now(),
          };
        });
        setReadingProgress(progMap);
        setLoadingProgress(false);
      },
      (err) => {
        console.warn('Firestore progress subscription notice:', err.message);
        setLoadingProgress(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.category && b.category.trim()) {
        set.add(b.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    // Readers ONLY see published books that have completed upload and are not failed/finishing
    let result = books.filter(
      (b) =>
        b.published &&
        b.coverUrl &&
        (b.pdfUrl || b.pdfStoragePath) &&
        b.uploadStatus !== 'finishing' &&
        b.uploadStatus !== 'failed'
    );

    if (selectedCategory !== 'All') {
      result = result.filter(
        (b) => b.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          (b.tags && b.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return result;
  }, [books, searchQuery, selectedCategory, sortBy]);

  const getBookById = (id: string): Book | undefined => {
    return books.find((b) => b.id === id);
  };

  const getProgressForBook = (bookId: string): ReadingProgress | undefined => {
    return readingProgress[bookId];
  };

  const saveProgress = async (bookId: string, page: number, totalPages: number) => {
    if (!user) return;
    const boundedPage = Math.max(1, Math.min(page, totalPages || 1));
    const percentage = totalPages > 0 ? Math.round((boundedPage / totalPages) * 100) : 0;

    setReadingProgress((prev) => ({
      ...prev,
      [bookId]: {
        bookId,
        currentPage: boundedPage,
        totalPages: totalPages || 1,
        percentage,
        updatedAt: Date.now(),
      },
    }));

    if (progressDebounceTimer.current[bookId]) {
      clearTimeout(progressDebounceTimer.current[bookId]);
    }

    progressDebounceTimer.current[bookId] = setTimeout(async () => {
      try {
        const progRef = doc(db, 'users', user.uid, 'progress', bookId);
        await setDoc(
          progRef,
          {
            bookId,
            currentPage: boundedPage,
            totalPages: totalPages || 1,
            percentage,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Error persisting reading progress:', err);
      }
    }, 600);
  };

  const updateBookPageCount = async (bookId: string, pageCount: number) => {
    if (pageCount <= 0) return;
    try {
      const bookRef = doc(db, 'books', bookId);
      await updateDoc(bookRef, { pages: pageCount, updatedAt: Date.now() });
    } catch (e) {
      console.warn('Notice updating book page count:', e);
    }
  };

  // Generate short-lived signed URL via server route
  const getSignedUrl = async (storagePath: string): Promise<string> => {
    if (!storagePath) return '';
    try {
      const res = await safeFetch<{ signedUrl?: string }>(
        `/api/files/signed-url?path=${encodeURIComponent(storagePath)}`
      );
      return res.success ? res.data?.signedUrl || '' : '';
    } catch (e) {
      console.warn('Error fetching signed URL:', e);
      return '';
    }
  };

  // Server-side upload worker endpoint wrapper with client Firebase fallback
  const uploadFileViaServer = async (
    file: File,
    fileType: 'pdf' | 'cover',
    bookId: string
  ): Promise<{ success: boolean; path?: string; signedUrl?: string; confirmedSize?: number; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      formData.append('bookId', bookId);

      const res = await safeFetch<{ path?: string; signedUrl?: string; confirmedSize?: number }>('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.success && res.data?.path) {
        return {
          success: true,
          path: res.data.path,
          signedUrl: res.data.signedUrl,
          confirmedSize: res.data.confirmedSize || file.size,
        };
      }
      return { success: false, error: res.error || 'The file could not be saved. Please try again.' };
    } catch (err: any) {
      console.error('[Upload Error]:', err);
      return {
        success: false,
        error: err?.message || 'Server connection error during file upload.',
      };
    }
  };

  // Upload worker: only returns success after both files and metadata are confirmed.
  const processBackgroundUpload = async (
    bookId: string,
    pdfFile: File,
    coverFile: File | null | undefined,
    metadata: Pick<UploadBookParams, 'title' | 'author' | 'category' | 'description' | 'featured' | 'published' | 'tags'>,
    onProgress?: (info: UploadProgressInfo) => void,
  ): Promise<{ success: boolean; error?: string }> => {
    let pdfStoragePath = '';
    let pdfUrl = '';
    let coverStoragePath = '';
    let coverUrl = '';

    try {
      if (!coverFile) throw new Error('A cover image is required before a book can be published.');
      onProgress?.({ percent: 5, statusText: 'Validating selected files...', pdfProgress: 0, coverProgress: 0, speedText: 'Preparing', etaText: 'Please wait', isStalled: false });
      // 1. Upload PDF file via server endpoint
      onProgress?.({ percent: 10, statusText: 'Uploading PDF document...', pdfProgress: 10, coverProgress: 0, speedText: 'Uploading', etaText: 'PDF in progress', isStalled: false });
      const pdfRes = await uploadFileViaServer(pdfFile, 'pdf', bookId);
      if (!pdfRes.success || !pdfRes.path || !pdfRes.confirmedSize || pdfRes.confirmedSize <= 0) {
        throw new Error(pdfRes.error || "This book's file didn't finish uploading.");
      }
      pdfStoragePath = pdfRes.path;
      pdfUrl = pdfRes.signedUrl || '';

      // 2. Upload and confirm the required cover image.
      onProgress?.({ percent: 55, statusText: 'Uploading cover image...', pdfProgress: 100, coverProgress: 10, speedText: 'Uploading', etaText: 'Cover in progress', isStalled: false });
      const compressedCover = await compressCoverImage(coverFile);
      const coverRes = await uploadFileViaServer(compressedCover, 'cover', bookId);
      if (!coverRes.success || !coverRes.path || !coverRes.confirmedSize || coverRes.confirmedSize <= 0) {
        throw new Error(coverRes.error || 'The cover image could not be confirmed.');
      }
      coverStoragePath = coverRes.path;
      coverUrl = coverRes.signedUrl || '';

      onProgress?.({ percent: 85, statusText: 'Saving verified book details...', pdfProgress: 100, coverProgress: 100, speedText: 'Complete', etaText: 'Saving metadata', isStalled: false });
      const createResult = await safeFetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bookId,
          ...metadata,
          pdfUrl,
          coverUrl,
          pdfStoragePath,
          coverStoragePath,
          pdfSize: pdfRes.confirmedSize,
          pages: 0,
          published: Boolean(metadata.published),
          createdAt: Date.now(),
          featured: Boolean(metadata.featured),
          tags: metadata.tags || [],
        }),
      });
      if (!createResult.success) throw new Error(createResult.error || 'The book details could not be saved.');
      setLastUploadError(null);
      onProgress?.({ percent: 100, statusText: 'Book published successfully.', pdfProgress: 100, coverProgress: 100, speedText: 'Complete', etaText: 'Done', isStalled: false });
      refetchBooks();
      return { success: true };
    } catch (err: any) {
      const errText = err?.message || "This book's file didn't finish uploading.";
      console.error(`Background upload error for ${bookId}:`, errText);

      setLastUploadError({
        message: errText,
        bookId,
        timestamp: Date.now(),
        details: String(err || errText),
      });
      onProgress?.({ percent: 0, statusText: errText, pdfProgress: 0, coverProgress: 0, speedText: 'Stopped', etaText: 'Fix the error and retry', isStalled: true });
      return { success: false, error: errText };
    }
  };

  // Instant Add Book: validates sizes first, saves initial "finishing" state, runs background upload
  const uploadBook = async (
    params: UploadBookParams
  ): Promise<{ success: boolean; bookId?: string; error?: string }> => {
    const {
      title,
      author,
      category,
      description,
      pdfFile,
      coverFile,
      featured = false,
      published = true,
      tags = [],
      onProgress,
    } = params;

    // 1. Strict File Size Validations BEFORE starting upload
    const maxPdfBytes = 50 * 1024 * 1024; // 50 MB
    const maxCoverBytes = 5 * 1024 * 1024; // 5 MB

    if (pdfFile.size > maxPdfBytes) {
      const actualMb = (pdfFile.size / (1024 * 1024)).toFixed(1);
      return {
        success: false,
        error: `PDF file exceeds maximum size limit of 50 MB (Selected file: ${actualMb} MB).`,
      };
    }

    if (!coverFile) {
      return { success: false, error: 'Please select a cover image. A PDF and cover are both required.' };
    }

    if (coverFile.size > maxCoverBytes) {
      const actualMb = (coverFile.size / (1024 * 1024)).toFixed(1);
      return {
        success: false,
        error: `Cover image exceeds maximum size limit of 5 MB (Selected file: ${actualMb} MB).`,
      };
    }

    try {
      const bookId = `book-${Date.now()}`;
      return await processBackgroundUpload(bookId, pdfFile, coverFile, {
        title: title.trim(),
        author: author.trim(),
        category: category.trim(),
        description: description.trim(),
        featured,
        published,
        tags,
      }, params.onProgress).then((result) => ({ ...result, bookId: result.success ? bookId : undefined }));
    } catch (err: any) {
      console.error('Failed to add book:', err);
      return { success: false, error: 'Failed to add book. Please try again.' };
    }
  };

  const retryBackgroundUpload = async (bookId: string, pdfFile?: File, coverFile?: File | null) => {
    if (pdfFile) {
      const currentBook = books.find((book) => book.id === bookId);
      if (!currentBook) return;
      processBackgroundUpload(bookId, pdfFile, coverFile, {
        title: currentBook.title,
        author: currentBook.author,
        category: currentBook.category,
        description: currentBook.description,
        featured: currentBook.featured,
        tags: currentBook.tags,
      });
    }
  };

  const editBook = async (
    bookId: string,
    updates: Partial<Book>,
    files?: {
      newPdfFile?: File | null;
      newCoverFile?: File | null;
      onProgress?: (info: UploadProgressInfo) => void;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    let newPdfStoragePath = '';
    let newCoverStoragePath = '';
    const cleanupReplacementFiles = async () => {
      await Promise.all([newPdfStoragePath, newCoverStoragePath].filter(Boolean).map((path) => safeFetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })));
    };
    try {
      const docUpdates: any = { ...updates, updatedAt: Date.now() };

      if (files?.newPdfFile) {
        if (files.newPdfFile.size > 50 * 1024 * 1024) {
          return { success: false, error: 'PDF file exceeds maximum limit of 50 MB.' };
        }
        const pdfRes = await uploadFileViaServer(files.newPdfFile, 'pdf', bookId);
        if (!pdfRes.success || !pdfRes.path) {
          return { success: false, error: pdfRes.error || 'Failed to upload new PDF file.' };
        }
        newPdfStoragePath = pdfRes.path;
        docUpdates.pdfStoragePath = pdfRes.path;
        docUpdates.pdfUrl = pdfRes.signedUrl || (await getSignedUrl(pdfRes.path));
      }

      if (files?.newCoverFile) {
        if (files.newCoverFile.size > 5 * 1024 * 1024) {
          return { success: false, error: 'Cover image exceeds maximum limit of 5 MB.' };
        }
        const compressedCover = await compressCoverImage(files.newCoverFile);
        const coverRes = await uploadFileViaServer(compressedCover, 'cover', bookId);
        if (coverRes.success && coverRes.path) {
          newCoverStoragePath = coverRes.path;
          docUpdates.coverStoragePath = coverRes.path;
          docUpdates.coverUrl = coverRes.signedUrl || (await getSignedUrl(coverRes.path));
        } else {
          await cleanupReplacementFiles();
          return { success: false, error: coverRes.error || 'Failed to upload new cover image.' };
        }
      }

      const result = await safeFetch(`/api/books/${encodeURIComponent(bookId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docUpdates),
      });
      if (result.success) {
        refetchBooks();
        return { success: true };
      }
      await cleanupReplacementFiles();
      return { success: false, error: result.error || 'Failed to update book. Please try again.' };
    } catch (err: any) {
      await cleanupReplacementFiles();
      console.error('Failed to update book:', err);
      return { success: false, error: 'Failed to update book. Please try again.' };
    }
  };

  const removeBook = async (book: Book): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await safeFetch(`/api/books/${encodeURIComponent(book.id)}`, { method: 'DELETE' });
      if (result.success) {
        refetchBooks();
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to remove book. Please try again.' };
    } catch (err: any) {
      console.error('Failed to remove book:', err);
      return { success: false, error: 'Failed to remove book. Please try again.' };
    }
  };

  return (
    <LibraryContext.Provider
      value={{
        books,
        loadingBooks,
        booksError,
        refetchBooks,
        categories,
        readingProgress,
        loadingProgress,
        searchQuery,
        selectedCategory,
        sortBy,
        filteredBooks,
        lastUploadError,
        setSearchQuery,
        setSelectedCategory,
        setSortBy,
        getBookById,
        getProgressForBook,
        saveProgress,
        updateBookPageCount,
        uploadBook,
        editBook,
        removeBook,
        retryBackgroundUpload,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
