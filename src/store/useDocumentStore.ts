import { create } from 'zustand'
import type { Document } from '@/lib/types'
import {
  getDocuments,
  deleteDocument as apiDeleteDocument,
  uploadDocument as apiUploadDocument,
  subscribeToDocuments,
  DocumentUploadMetadata
} from '@/lib/supabase/documents'

interface DocumentStore {
  documents: Document[]
  loading: boolean
  error: string | null
  fetchDocuments: () => Promise<void>
  subscribeToDocuments: () => () => void
  addDocument: (file: File, metadata: DocumentUploadMetadata) => Promise<Document>
  deleteDocument: (id: string, fileUrl?: string) => Promise<void>
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  loading: true,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null })
    try {
      const data = await getDocuments()
      set({ documents: data, loading: false })
    } catch (error: any) {
      set({ error: error.message || String(error), loading: false })
    }
  },

  subscribeToDocuments: () => {
    get().fetchDocuments()

    const unsub = subscribeToDocuments((documents) => {
      set({ documents, loading: false })
    })

    return unsub
  },

  addDocument: async (file, metadata) => {
    set({ loading: true, error: null })
    try {
      const newDoc = await apiUploadDocument(file, metadata)
      set({ loading: false })
      return newDoc
    } catch (error: any) {
      set({ error: error.message || String(error), loading: false })
      throw error
    }
  },

  deleteDocument: async (id, fileUrl) => {
    set({ loading: true, error: null })
    try {
      await apiDeleteDocument(id, fileUrl)
      set({ loading: false })
    } catch (error: any) {
      set({ error: error.message || String(error), loading: false })
      throw error
    }
  }
}))
