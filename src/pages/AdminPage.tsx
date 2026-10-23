import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary, UploadProgressInfo } from '../context/LibraryContext';
import { Book } from '../types/library';
import {
  Upload,
  Edit2,
  Trash2,
  BookOpen,
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Search,
  KeyRound,
  ShieldCheck,
  Shield,
  UserPlus,
  RefreshCw,
  Lock,
  Mail,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import { FullPageLoader } from '../components/ui/FullPageLoader';
import { safeFetch } from '../lib/api';


export const AdminPage: React.FC = () => {
  const { navigate } = useRouter();
  const {
    user,
    isAdmin,
    adminVerified,
    verifyAdminAccess,
    updateAdminAccessPassword,
    authorizeAdminEmail,
    listAuthorizedAdmins,
    adminEmailConfigured,
    loading: authLoading,
  } = useAuth();
  const { books, categories, uploadBook, editBook, removeBook, loadingBooks, refetchBooks } = useLibrary();

  // Active tab in Admin Portal
  const [activeTab, setActiveTab] = useState<'catalogue' | 'security'>('catalogue');

  const [adminSessionAuthenticated, setAdminSessionAuthenticated] = useState(false);
  const [adminSessionLoading, setAdminSessionLoading] = useState(true);

  // Administrator access is decided by the server-side HttpOnly session cookie.
  useEffect(() => {
    let cancelled = false;
    safeFetch<{ authenticated?: boolean }>('/api/admin/session').then((result) => {
      if (cancelled) return;
      setAdminSessionAuthenticated(Boolean(result.success && result.data?.authenticated));
      setAdminSessionLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Modal & form states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deleteConfirmBook, setDeleteConfirmBook] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Admin access password prompt state (if arrived without session verification)
  const [accessPasswordInput, setAccessPasswordInput] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Search state for admin table
  const [adminSearch, setAdminSearch] = useState('');

  // Upload Form fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  // Edit Form replacement files
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);

  const [tagsInput, setTagsInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  // Progress & notifications
  const [isUploading, setIsUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<UploadProgressInfo | null>(null);
  const [uploadSuccessBookId, setUploadSuccessBookId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Unload warning during active upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  // Cover preview generation
  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  // Security Panel States
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [secAccessPass, setSecAccessPass] = useState('');
  const [authorizingAdmin, setAuthorizingAdmin] = useState(false);
  const [authList, setAuthList] = useState<string[]>([]);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);


  // Filter books by search query
  const filteredBooks = useMemo(() => {
    if (!adminSearch.trim()) return books;
    const q = adminSearch.toLowerCase();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    );
  }, [books, adminSearch]);

  // While auth status is loading, don't flash content
  if (authLoading || adminSessionLoading) {
    return <FullPageLoader />;
  }

  // If administrator access password is not verified for current session, show prompt
  if (!adminSessionAuthenticated) {
    const handleVerifySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!accessPasswordInput.trim()) return;
      setVerifyingPassword(true);
      setVerifyError(null);

      const res = await safeFetch('/api/admin/passcode-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: accessPasswordInput }),
      });
      setVerifyingPassword(false);
      if (res.success) {
        setAdminSessionAuthenticated(true);
        setAccessPasswordInput('');
        refetchBooks();
      } else {
        setVerifyError(res.error || 'Administrator verification failed. Please check your credentials and try again.');
      }
    };

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#FAF8F2]">
        <div className="max-w-md w-full bg-white border border-[#D4AF65]/30 rounded-xs p-8 sm:p-10 space-y-6 shadow-xs text-left relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

          <div className="text-center space-y-2 pt-1">
            <div className="w-12 h-12 rounded-full bg-[#123D2A] text-[#D4AF65] flex items-center justify-center mx-auto shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-heading font-semibold tracking-[0.2em] text-[#123D2A] uppercase">
              RCCG YAYA Oyo Province 6
            </p>
            <h2 className="font-heading font-extrabold text-xl text-[#123D2A] tracking-tight">
              Administrator Verification
            </h2>
            <p className="text-xs text-[#737B76]">
              Please enter your separate Administrator Access Password to manage library books.
            </p>
          </div>

          {verifyError && (
            <div className="p-3.5 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-[#8C2925]">Notice</p>
                <p className="leading-relaxed text-[#252B2A]/90">{verifyError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <Input
              label="Administrator Access Password"
              type="password"
              required
              value={accessPasswordInput}
              onChange={(e) => setAccessPasswordInput(e.target.value)}
              placeholder="Server administrator access key"
              leftIcon={<Lock className="w-4 h-4 text-[#737B76]" />}
              hint="Verified only by the private server-side administrator passcode."
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={verifyingPassword}
              icon={<ShieldCheck className="w-4 h-4 text-[#D4AF65]" />}
            >
              Verify &amp; Unlock Dashboard
            </Button>
          </form>

          <div className="pt-2 border-t border-[#EEF5F0] text-center">
            <button
              onClick={() => navigate('/library')}
              className="text-xs text-[#737B76] hover:text-[#123D2A] underline cursor-pointer"
            >
              Return to Reader Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Book Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const finalCategory = (customCategory.trim() || category.trim()).trim();

    if (!title.trim() || !author.trim() || !finalCategory || !pdfFile || !coverFile) {
      setErrorMessage('Please provide Title, Author, Category, the PDF document, and a cover image.');
      return;
    }

    if (pdfFile.size > 50 * 1024 * 1024) {
      setErrorMessage('This file is too large. Please compress the PDF and try again.');
      return;
    }

    if (coverFile && coverFile.size > 5 * 1024 * 1024) {
      setErrorMessage('This file is too large. Please compress the cover image and try again.');
      return;
    }

    setIsUploading(true);
    setUploadInfo({
      percent: 0,
      statusText: 'Preparing secure upload...',
      pdfProgress: 0,
      coverProgress: 0,
      speedText: '0 KB/s',
      etaText: 'Calculating...',
      isStalled: false,
    });

    const tags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const result = await uploadBook({
      title: title.trim(),
      author: author.trim(),
      category: finalCategory,
      description: description.trim(),
      pdfFile,
      coverFile,
      featured: isFeatured,
      published: isPublished,
      tags,
      onProgress: setUploadInfo,
    });
    setIsUploading(false);

    if (result.success) {
      setUploadModalOpen(false);
      setSuccessMessage('Book added.');
      setTitle('');
      setAuthor('');
      setCategory('');
      setCustomCategory('');
      setDescription('');
      setPdfFile(null);
      setCoverFile(null);
      setTagsInput('');
      setIsFeatured(false);
      setIsPublished(true);
    } else {
      setErrorMessage(result.error || 'Failed to add book. Please try again.');
    }
  };

  // Handle Book Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditing(true);
    setUploadProgress(0);
    setUploadStatusText('Updating volume records...');

    const result = await editBook(
      editingBook.id,
      {
        title: editingBook.title,
        author: editingBook.author,
        category: editingBook.category,
        description: editingBook.description,
      },
      {
        newPdfFile: editPdfFile,
        newCoverFile: editCoverFile,
        onProgress: (info) => {
          setUploadProgress(info.percent);
          setUploadStatusText(info.statusText);
        },
      }
    );

    setIsEditing(false);

    if (result.success) {
      setSuccessMessage(`Volume "${editingBook.title}" was successfully updated.`);
      setEditingBook(null);
      setEditPdfFile(null);
      setEditCoverFile(null);
    } else {
      setErrorMessage(result.error || 'Failed to update book details.');
    }
  };

  // Handle Book Deletion
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmBook) return;
    setIsDeleting(true);

    const result = await removeBook(deleteConfirmBook);
    setIsDeleting(false);
    setDeleteConfirmBook(null);

    if (result.success) {
      setSuccessMessage(`"${deleteConfirmBook.title}" and its storage files were permanently removed.`);
    } else {
      setErrorMessage(result.error || 'Failed to delete volume.');
    }
  };

  // Handle Change Access Password
  const handleChangeAccessPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (newPass !== confirmNewPass) {
      setPassMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPass.length < 8) {
      setPassMessage({ type: 'error', text: 'New access password must be at least 8 characters in length.' });
      return;
    }

    setUpdatingPass(true);
    const res = await updateAdminAccessPassword(currentPass, newPass);
    setUpdatingPass(false);

    if (res.success) {
      setPassMessage({ type: 'success', text: 'Administrator access password has been successfully updated.' });
      setCurrentPass('');
      setNewPass('');
      setConfirmNewPass('');
    } else {
      setPassMessage({ type: 'error', text: res.error || 'Failed to update access password.' });
    }
  };

  // Handle Authorize New Admin Email
  const handleAuthorizeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    if (!newAdminEmailInput.trim() || !secAccessPass.trim()) {
      setAuthMessage({ type: 'error', text: 'Please provide both the email address and your admin access password.' });
      return;
    }

    setAuthorizingAdmin(true);
    const res = await authorizeAdminEmail(newAdminEmailInput, secAccessPass);
    setAuthorizingAdmin(false);

    if (res.success) {
      setAuthMessage({ type: 'success', text: `Authorized: ${newAdminEmailInput} can now sign in as an administrator.` });
      setNewAdminEmailInput('');
      setSecAccessPass('');
      if (res.authorizedEmails) {
        setAuthList(res.authorizedEmails);
      }
    } else {
      setAuthMessage({ type: 'error', text: res.error || 'Failed to authorize administrator email.' });
    }
  };

  // Fetch Authorized Admins
  const handleLoadAuthorizedAdmins = async () => {
    const promptPass = prompt('Enter Administrator Access Password to view authorized roster:');
    if (!promptPass) return;

    const res = await listAuthorizedAdmins(promptPass);
    if (res.success && res.authorizedEmails) {
      setAuthList(res.authorizedEmails);
    } else {
      alert(res.error || 'Failed to fetch authorized administrators.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 text-left space-y-8">
      {/* ----------------------------------------------------------- */}
      {/* Editorial Header                                            */}
      {/* ----------------------------------------------------------- */}
      <div className="border-b border-[#EEF5F0] pb-6 space-y-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-heading font-semibold uppercase tracking-widest text-[#123D2A]">
              Administration
            </span>
            <span className="text-xs text-[#737B76]">·</span>
            <span className="text-[10px] font-heading font-semibold text-[#737B76] uppercase">Admin Control</span>
          </div>
          <div className="h-[1.5px] w-12 bg-[#D4AF65]" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pt-1">
          <div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-[#123D2A] tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#737B76] max-w-2xl leading-relaxed mt-1">
              Upload and manage books for RCCG YAYA Oyo Province 6.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => { await safeFetch('/api/admin/passcode-logout', { method: 'POST' }); setAdminSessionAuthenticated(false); navigate('/login'); }}
              className="text-xs font-semibold text-[#737B76] hover:text-[#A8322D] underline cursor-pointer"
            >
              Logout
            </button>
            {activeTab === 'catalogue' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setUploadModalOpen(true)}
                icon={<Upload className="w-4 h-4 text-[#D4AF65]" />}
              >
                Upload Book
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Books vs Admin Access */}
      <div className="flex items-center gap-6 border-b border-[#EEF5F0] text-xs font-heading font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('catalogue')}
          className={`py-3 transition-colors border-b-2 -mb-[1px] cursor-pointer flex items-center gap-2 ${
            activeTab === 'catalogue'
              ? 'border-[#123D2A] text-[#123D2A]'
              : 'border-transparent text-[#737B76] hover:text-[#252B2A]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#123D2A]" />
          <span>Books ({books.length})</span>
        </button>

      </div>

      {/* Global Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-[#F2F8F4] border border-[#BFDFCA] text-[#123D2A] text-xs rounded-xs flex items-start gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#1A543A] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-[#123D2A]">Notice</p>
            <p className="leading-relaxed">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-[#8C2925]">Notice</p>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CATALOGUE MANAGEMENT                                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'catalogue' && (
        <div className="space-y-6">
          {/* Search bar within repository */}
          {books.length > 0 && (
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-[#737B76] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Search volume title, author, or category..."
                className="w-full pl-10 pr-8 py-2 text-xs bg-white border border-[#EEF5F0] rounded-xs text-[#252B2A] focus:outline-none focus:border-[#123D2A]"
              />
              {adminSearch && (
                <button
                  onClick={() => setAdminSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737B76] hover:text-[#123D2A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Table / Empty State */}
          {loadingBooks ? (
            <div className="bg-white border border-[#EEF5F0] rounded-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <tbody>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </tbody>
              </table>
            </div>
          ) : books.length === 0 ? (
            <EmptyState
              type="admin"
              title="The repository is currently empty."
              description="No books have been uploaded yet. Upload your first PDF volume to publish it to the live youth and young adults library catalog."
              actionText="Upload First Book"
              onAction={() => setUploadModalOpen(true)}
            />
          ) : filteredBooks.length === 0 ? (
            <div className="p-8 bg-white border border-[#EEF5F0] text-center space-y-2 rounded-xs">
              <p className="text-xs text-[#737B76]">No uploaded books match &ldquo;{adminSearch}&rdquo;.</p>
              <button
                onClick={() => setAdminSearch('')}
                className="text-xs font-semibold text-[#123D2A] hover:underline"
              >
                Clear Search Query
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#EEF5F0] rounded-xs overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F2] border-b border-[#EEF5F0] text-[10px] font-bold uppercase tracking-wider text-[#737B76]">
                      <th className="py-3.5 px-4 font-semibold">Book</th>
                      <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">Category</th>
                      <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Pages</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF5F0]">
                    {filteredBooks.map((b) => (
                      <tr key={b.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-14 bg-[#123D2A] text-white rounded-xs overflow-hidden shrink-0 flex items-center justify-center border border-[#EEF5F0]">
                              {b.coverUrl ? (
                                <img
                                  src={b.coverUrl}
                                  alt={b.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-[8px] font-heading font-semibold text-[#123D2A]">PDF</span>
                              )}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="font-heading font-bold text-xs text-[#123D2A] truncate max-w-xs sm:max-w-md">
                                  {b.title}
                                </p>
                                {b.uploadStatus === 'finishing' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-heading font-semibold text-[#123D2A] bg-[#FAF8F2] border border-[#D4AF65]/40 rounded-xs animate-pulse">
                                    Finishing…
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#737B76] truncate">
                                by {b.author}
                              </p>
                              {b.uploadStatus === 'failed' && (
                                <div className="p-2 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-[11px] rounded-xs flex items-center justify-between gap-3 mt-1">
                                  <span>This book&apos;s file didn&apos;t finish uploading.</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingBook({ ...b });
                                        setEditPdfFile(null);
                                        setEditCoverFile(null);
                                      }}
                                      className="px-2 py-0.5 bg-[#123D2A] text-white font-semibold rounded-xs text-[10px] cursor-pointer"
                                    >
                                      Retry
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmBook(b)}
                                      className="px-2 py-0.5 bg-rose-600 text-white font-semibold rounded-xs text-[10px] cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <span className="text-[10px] font-heading font-semibold tracking-wider uppercase text-[#123D2A] bg-[#EEF5F0] px-2 py-0.5 rounded-xs border border-[#EEF5F0]">
                            {b.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell font-heading font-semibold text-xs text-[#737B76]">
                          {b.pages > 0 ? `${b.pages} pp` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {b.uploadStatus !== 'finishing' && b.uploadStatus !== 'failed' && (
                              <button
                                onClick={() => navigate(`/read/${b.id}`)}
                                className="p-1.5 text-[#737B76] hover:text-[#123D2A] rounded-xs transition-colors cursor-pointer"
                                title="Read Volume"
                                aria-label="Read Volume"
                              >
                                <BookOpen className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingBook({ ...b });
                                setEditPdfFile(null);
                                setEditCoverFile(null);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-[#737B76] hover:text-[#123D2A] hover:bg-[#EEF5F0] rounded-xs transition-colors cursor-pointer"
                              title="Edit Details"
                              aria-label="Edit Details"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span className="hidden sm:inline text-[10px] font-semibold">Edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteConfirmBook(b)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-[#737B76] hover:text-rose-600 hover:bg-rose-50 rounded-xs transition-colors cursor-pointer"
                              title="Delete Volume"
                              aria-label="Delete Volume"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline text-[10px] font-semibold">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: SECURITY & EXECUTIVE ACCESS                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {/* Card 1: Change Administrator Access Password */}
          <div className="bg-white border border-[#D4AF65]/30 rounded-xs p-6 sm:p-8 space-y-6 shadow-xs relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

            <div className="space-y-1">
              <span className="text-[10px] font-heading font-semibold uppercase tracking-widest text-[#123D2A]">
                Password Security
              </span>
              <h2 className="font-heading font-extrabold text-lg text-[#123D2A]">
                Update Admin Access Password
              </h2>
              <p className="text-xs text-[#737B76] leading-relaxed">
                Change the secondary access password required for administrative sign-in and book uploads.
              </p>
            </div>

            {passMessage && (
              <div
                className={`p-3 text-xs rounded-xs flex items-start gap-2 ${
                  passMessage.type === 'success'
                    ? 'bg-[#F2F8F4] border border-[#BFDFCA] text-[#123D2A]'
                    : 'bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522]'
                }`}
              >
                {passMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1A543A] mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#A8322D] mt-0.5" />
                )}
                <span>{passMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangeAccessPassword} className="space-y-4">
              <Input
                label="Current Access Password"
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Current secret key"
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="New Access Password"
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Minimum 8 characters"
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="Confirm New Password"
                type="password"
                required
                value={confirmNewPass}
                onChange={(e) => setConfirmNewPass(e.target.value)}
                placeholder="Re-enter new secret key"
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={updatingPass}
              >
                Update Access Password
              </Button>
            </form>
          </div>

          {/* Card 2: Authorize New Administrator Email */}
          <div className="bg-white border border-[#D4AF65]/30 rounded-xs p-6 sm:p-8 space-y-6 shadow-xs relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

            <div className="space-y-1">
              <span className="text-[10px] font-heading font-semibold uppercase tracking-widest text-[#123D2A]">
                Admin Authorization
              </span>
              <h2 className="font-heading font-extrabold text-lg text-[#123D2A]">
                Authorize Administrator
              </h2>
              <p className="text-xs text-[#737B76] leading-relaxed">
                Designate an additional provincial email address authorized to hold administrator privileges.
              </p>
            </div>

            {authMessage && (
              <div
                className={`p-3 text-xs rounded-xs flex items-start gap-2 ${
                  authMessage.type === 'success'
                    ? 'bg-[#F2F8F4] border border-[#BFDFCA] text-[#123D2A]'
                    : 'bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522]'
                }`}
              >
                {authMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1A543A] mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#A8322D] mt-0.5" />
                )}
                <span>{authMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleAuthorizeEmail} className="space-y-4">
              <Input
                label="Administrator Email Address to Authorize"
                type="email"
                required
                value={newAdminEmailInput}
                onChange={(e) => setNewAdminEmailInput(e.target.value)}
                placeholder="admin@rccgyayaoyo6.org"
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Your Admin Access Password (Confirmation)"
                type="password"
                required
                value={secAccessPass}
                onChange={(e) => setSecAccessPass(e.target.value)}
                placeholder="Enter current admin access key"
                leftIcon={<KeyRound className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={authorizingAdmin}
                icon={<UserPlus className="w-3.5 h-3.5 text-[#D4AF65]" />}
              >
                Authorize Administrator
              </Button>
            </form>

            <div className="pt-2 border-t border-[#EEF5F0]">
              <button
                type="button"
                onClick={handleLoadAuthorizedAdmins}
                className="text-xs font-semibold text-[#123D2A] hover:underline cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-[#123D2A]" />
                <span>View Authorized Administrator List</span>
              </button>

              {authList.length > 0 && (
                <div className="mt-3 p-3 bg-[#FAF8F2] border border-[#EEF5F0] rounded-xs space-y-1.5 text-xs">
                  <p className="font-bold text-[#123D2A]">Authorized Accounts:</p>
                  <ul className="list-disc pl-4 space-y-1 text-[#252B2A]/85 font-heading font-semibold text-[11px]">
                    {authList.map((em) => (
                      <li key={em}>{em}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>


        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: UPLOAD NEW BOOK                                        */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setUploadSuccessBookId(null);
          setUploadInfo(null);
        }}
        title="Add a Book"
        maxWidth="lg"
        isUploading={isUploading}
      >
        {uploadSuccessBookId ? (
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 bg-[#EEF5F0] text-[#123D2A] rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-[#123D2A]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-heading font-extrabold text-xl text-[#123D2A]">
                Book Added Successfully!
              </h3>
              <p className="text-xs text-[#737B76] max-w-sm mx-auto">
                Your book has been added to the library and is now available for readers.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button
                variant="primary"
                onClick={() => {
                  setUploadModalOpen(false);
                  navigate(`/reader/${uploadSuccessBookId}`);
                  setUploadSuccessBookId(null);
                }}
                icon={<BookOpen className="w-4 h-4 text-[#D4AF65]" />}
              >
                View in library
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  setUploadSuccessBookId(null);
                  setTitle('');
                  setAuthor('');
                  setCategory('');
                  setCustomCategory('');
                  setDescription('');
                  setPdfFile(null);
                  setCoverFile(null);
                  setTagsInput('');
                  setIsFeatured(false);
                  setIsPublished(true);
                }}
              >
                Add another book
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUploadSubmit} className="space-y-6 pb-20 sm:pb-4 text-left">
            {errorMessage && (
              <div className="p-3 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs flex items-center justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#A8322D] shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  className="px-2.5 py-1 bg-[#123D2A] text-white text-[11px] rounded-xs font-semibold cursor-pointer shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <Input
                label="Book title *"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Walking in Divine Purpose"
              />

              <Input
                label="Author *"
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Pastor E.A. Adeboye"
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#252B2A]">
                  Category *
                </label>
                {categories.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xs border border-[#EEF5F0] bg-white text-[#252B2A] focus:outline-none focus:border-[#123D2A]"
                    >
                      <option value="">Choose existing category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Or type a new category"
                      className="px-3 py-2 text-xs rounded-xs border border-[#EEF5F0] focus:outline-none focus:border-[#123D2A] bg-white text-[#252B2A]"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Faith, Leadership, Prayer"
                    className="w-full px-3 py-2 text-xs rounded-xs border border-[#EEF5F0] focus:outline-none focus:border-[#123D2A] bg-white text-[#252B2A]"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#252B2A]">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A few lines about the book..."
                  className="w-full px-3 py-2 text-xs rounded-xs border border-[#EEF5F0] bg-white focus:outline-none focus:border-[#123D2A] resize-none text-[#252B2A]"
                />
              </div>
            </div>

            {/* Files directly under basic fields */}
            <div className="space-y-4 pt-2 border-t border-[#EEF5F0]">
              {/* PDF File */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#252B2A]">
                  PDF file (PDF up to 50 MB) *
                </label>
                <div className="border border-dashed border-[#D4AF65]/60 hover:border-[#123D2A] p-4 text-center rounded-xs bg-[#FAF8F2]">
                  <input
                    type="file"
                    required
                    accept="application/pdf"
                    onChange={(e) => {
                      const selected = e.target.files?.[0] || null;
                      if (selected && selected.size > 50 * 1024 * 1024) {
                        const actualMb = (selected.size / (1024 * 1024)).toFixed(1);
                        setErrorMessage(`PDF file exceeds maximum limit of 50 MB (Selected file size: ${actualMb} MB). Please select a smaller PDF.`);
                        setPdfFile(null);
                        e.target.value = '';
                        return;
                      }
                      setErrorMessage(null);
                      setPdfFile(selected);
                    }}
                    className="hidden"
                    id="admin-pdf-input"
                  />
                  <label htmlFor="admin-pdf-input" className="cursor-pointer block space-y-1">
                    <FileText className="w-6 h-6 text-[#123D2A] mx-auto" />
                    <span className="text-xs font-bold text-[#123D2A] block">
                      {pdfFile ? `${pdfFile.name} (${Math.round(pdfFile.size / 1024 / 1024 * 10) / 10} MB)` : 'Select PDF document'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#252B2A]">
                    Cover image (Required, under 5 MB)
                </label>
                <div className="flex items-center gap-4">
                  {coverPreviewUrl && (
                    <img
                      src={coverPreviewUrl}
                      alt="Cover Preview"
                      className="w-16 h-20 object-cover rounded-xs border border-[#D4AF65]/40 shadow-xs shrink-0"
                    />
                  )}
                  <div className="flex-1 border border-dashed border-[#EEF5F0] hover:border-[#123D2A] p-3 text-center rounded-xs bg-[#FAF8F2]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const selected = e.target.files?.[0] || null;
                        if (selected && selected.size > 5 * 1024 * 1024) {
                          const actualMb = (selected.size / (1024 * 1024)).toFixed(1);
                          setErrorMessage(`Cover image exceeds maximum limit of 5 MB (Selected file size: ${actualMb} MB). Please select a smaller image.`);
                          setCoverFile(null);
                          e.target.value = '';
                          return;
                        }
                        setErrorMessage(null);
                        setCoverFile(selected);
                      }}
                      className="hidden"
                      id="admin-cover-input"
                    />
                    <label htmlFor="admin-cover-input" className="cursor-pointer block space-y-1">
                      <ImageIcon className="w-5 h-5 text-[#737B76] mx-auto" />
                      <span className="text-xs font-semibold text-[#252B2A] block">
                        {coverFile ? `${coverFile.name} (${Math.round(coverFile.size / 1024 * 10) / 10} KB)` : 'Select cover image (required)'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Keywords */}
              <Input
                label="Keywords (Optional)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="faith, leadership, prayer, youth"
              />
            </div>

            {/* Visibility switches */}
            <div className="space-y-3 pt-2 border-t border-[#EEF5F0]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#252B2A]">Feature this book</p>
                  <p className="text-[10px] text-[#737B76]">Display prominently in the library showcase.</p>
                </div>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 accent-[#123D2A] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#EEF5F0]">
                <div>
                  <p className="text-xs font-semibold text-[#252B2A]">Publish now</p>
                  <p className="text-[10px] text-[#737B76]">When off, save as a draft hidden from readers.</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#123D2A] cursor-pointer"
                />
              </div>
            </div>

            {/* Upload Progress Indicator & Stall Warning */}
            {isUploading && uploadInfo && (
              <div className="space-y-2 p-4 bg-white border border-[#D4AF65]/40 rounded-xs shadow-xs">
                <div className="flex items-center justify-between text-xs text-[#252B2A]">
                  <span className="font-semibold">{uploadInfo.statusText}</span>
                  <span className="font-heading font-bold text-[#123D2A]">{uploadInfo.percent}%</span>
                </div>
                <div className="w-full h-2 bg-[#EEF5F0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#123D2A] transition-all duration-300"
                    style={{ width: `${uploadInfo.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#737B76]">
                  <span>Speed: {uploadInfo.speedText}</span>
                  <span>{uploadInfo.etaText}</span>
                </div>

                {uploadInfo.isStalled && (
                  <div className="p-2.5 bg-[#FFF8F7] border border-[#E8C4BF] text-[#732522] text-xs rounded-xs flex items-center justify-between">
                    <span>Upload is slow. Please check your connection.</span>
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-[#123D2A] text-white text-[11px] rounded-xs font-semibold cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sticky Bottom Action Bar on Mobile & Desktop */}
            <div className="fixed sm:static bottom-0 left-0 right-0 bg-white p-4 sm:p-0 border-t sm:border-0 border-[#EEF5F0] flex items-center justify-end gap-3 z-10 shadow-md sm:shadow-none">
              <Button
                type="button"
                variant="quiet"
                onClick={() => setUploadModalOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isUploading}
                icon={<Upload className="w-4 h-4 text-[#D4AF65]" />}
              >
                Add Book
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT BOOK DETAILS                                      */}
      {/* ------------------------------------------------------------- */}
      {editingBook && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isEditing) setEditingBook(null);
          }}
          title="Edit Volume Details"
          subtitle={`Catalogue ID: ${editingBook.id}`}
          maxWidth="lg"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Input
              label="Book Title *"
              type="text"
              required
              value={editingBook.title}
              onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
            />

            <Input
              label="Author Name *"
              type="text"
              required
              value={editingBook.author}
              onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
            />

            <Input
              label="Ministry Category *"
              type="text"
              required
              value={editingBook.category}
              onChange={(e) => setEditingBook({ ...editingBook, category: e.target.value })}
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold text-[#252B2A]">
                Description
              </label>
              <textarea
                rows={3}
                value={editingBook.description}
                onChange={(e) => setEditingBook({ ...editingBook, description: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xs border border-[#EEF5F0] focus:outline-none focus:border-[#123D2A] resize-none"
              />
            </div>

            {/* Replace PDF */}
            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-[#252B2A]">
                Replace PDF Document (Optional)
              </label>
              <div className="border border-dashed border-[#EEF5F0] hover:border-[#123D2A] p-3 text-center rounded-xs bg-[#FAF8F2]">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setEditPdfFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="edit-pdf-input"
                />
                <label htmlFor="edit-pdf-input" className="cursor-pointer block space-y-1">
                  <FileText className="w-5 h-5 text-[#123D2A] mx-auto" />
                  <span className="text-xs font-semibold text-[#123D2A] block">
                    {editPdfFile ? editPdfFile.name : 'Select Replacement PDF'}
                  </span>
                  <span className="text-[10px] text-[#737B76] block">
                    Leave empty to preserve existing PDF file.
                  </span>
                </label>
              </div>
            </div>

            {/* Replace Cover */}
            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-[#252B2A]">
                Replace Cover Art (Optional)
              </label>
              <div className="border border-dashed border-[#EEF5F0] hover:border-[#123D2A] p-3 text-center rounded-xs bg-[#FAF8F2]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditCoverFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="edit-cover-input"
                />
                <label htmlFor="edit-cover-input" className="cursor-pointer block space-y-1">
                  <ImageIcon className="w-5 h-5 text-[#737B76] mx-auto" />
                  <span className="text-xs font-semibold text-[#252B2A] block">
                    {editCoverFile ? editCoverFile.name : 'Select Replacement Artwork'}
                  </span>
                  <span className="text-[10px] text-[#737B76] block">
                    Leave empty to keep current cover artwork.
                  </span>
                </label>
              </div>
            </div>

            {isEditing && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-[#737B76]">
                  <span>{uploadStatusText}</span>
                  <span className="font-heading font-bold text-[#123D2A]">{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#EEF5F0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#123D2A] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF5F0]">
              <Button
                type="button"
                variant="quiet"
                onClick={() => setEditingBook(null)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isEditing}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONFIRM DIALOG: DELETE BOOK PERMANENTLY                       */}
      {/* ------------------------------------------------------------- */}
      {deleteConfirmBook && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteConfirmBook(null)}
          onConfirm={handleDeleteConfirm}
          title="Confirm Volume Removal"
          message={`Are you sure you want to permanently delete "${deleteConfirmBook.title}" by ${deleteConfirmBook.author}? This will remove the catalog record and all uploaded PDF and cover artwork files from encrypted library storage.`}
          confirmLabel="Permanently Delete"
          cancelLabel="Cancel"
          isDestructive={true}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};
