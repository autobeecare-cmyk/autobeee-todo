import { supabase } from '../supabase'
import type { Document } from '../types'

// Documents CRUD
export const getDocuments = async () => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Document[]
}

export const createDocument = async (doc: Omit<Document, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase.from('documents').insert(doc).select().single()
  if (error) throw error
  return data as Document
}

export const deleteDocument = async (id: string, fileUrl?: string) => {
  // Try to delete file from storage if fileUrl is provided
  if (fileUrl) {
    try {
      const parts = fileUrl.split('/storage/v1/object/public/documents/')
      if (parts.length === 2) {
        const fileName = parts[1]
        await supabase.storage.from('documents').remove([fileName])
      }
    } catch (e) {
      console.error('Failed to remove file from storage:', e)
    }
  }

  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}

export interface DocumentUploadMetadata {
  name: string
  description?: string
  category: Document['category']
  tags?: string[]
  related_partner_id?: string
  uploaded_by: string
}

// Upload file to Supabase storage + save metadata in DB
export const uploadDocument = async (file: File, metadata: DocumentUploadMetadata) => {
  // 1. Upload file to Supabase Storage
  const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`
  const { data: storageData, error: storageError } = await supabase.storage
    .from('documents')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (storageError) throw storageError

  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName)

  // Helper to determine file type from MIME
  const getFileType = (mimeType: string): Document['file_type'] => {
    if (mimeType === 'application/pdf') return 'pdf'
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'doc'
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'sheet'
    return 'other'
  }

  // 3. Save metadata to documents table
  const { data, error } = await supabase.from('documents').insert({
    name: metadata.name,
    description: metadata.description || null,
    file_url: publicUrl,
    file_type: getFileType(file.type),
    file_size_bytes: file.size,
    mime_type: file.type,
    category: metadata.category,
    tags: metadata.tags || [],
    related_partner_id: metadata.related_partner_id || null,
    uploaded_by: metadata.uploaded_by,
    is_shared: true
  }).select().single()

  if (error) throw error
  return data as Document
}

export const subscribeToDocuments = (callback: (documents: Document[]) => void) => {
  const channelId = `documents-realtime-${Math.random().toString(36).substring(2, 9)}`
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, async () => {
      const documents = await getDocuments()
      callback(documents)
    })
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
