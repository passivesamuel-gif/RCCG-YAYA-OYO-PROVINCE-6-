export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  coverUrl?: string;
  coverStoragePath?: string;
  pdfUrl: string;
  pdfStoragePath?: string;
  pages: number;
  published: boolean;
  featured?: boolean;
  tags?: string[];
  seoKeywords?: string;
  uploadStatus?: 'finishing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt?: number;
}

export interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  role: 'member' | 'admin';
  createdAt: number;
}
