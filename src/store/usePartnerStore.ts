import { create } from 'zustand'
import type { Partner, PartnerInteraction } from '@/lib/types'
import {
  getPartners,
  createPartner as apiCreatePartner,
  updatePartner as apiUpdatePartner,
  deletePartner as apiDeletePartner,
  addInteraction as apiAddInteraction
} from '@/lib/supabase/partners'
import { subscribeToPartners } from '@/lib/supabase/partners'

interface PartnerStore {
  partners: Partner[]
  loading: boolean
  error: string | null
  fetchPartners: () => Promise<void>
  subscribeToPartners: () => () => void
  addPartner: (partner: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) => Promise<Partner>
  updatePartner: (id: string, updates: Partial<Partner>) => Promise<Partner>
  deletePartner: (id: string) => Promise<void>
  updatePipelineStatus: (id: string, status: Partner['pipeline_status']) => Promise<void>
  addInteraction: (interaction: Omit<PartnerInteraction, 'id' | 'created_at'>) => Promise<PartnerInteraction>
}

export const usePartnerStore = create<PartnerStore>((set, get) => ({
  partners: [],
  loading: true,
  error: null,

  fetchPartners: async () => {
    set({ loading: true, error: null })
    try {
      const data = await getPartners()
      set({ partners: data, loading: false })
    } catch (error: any) {
      set({ error: error.message || String(error), loading: false })
    }
  },

  subscribeToPartners: () => {
    get().fetchPartners()

    const unsub = subscribeToPartners((partners) => {
      set({ partners, loading: false })
    })

    return unsub
  },

  addPartner: async (partner) => {
    const newPartner = await apiCreatePartner(partner)
    // Subscription will update state, but return it for UI modals
    return newPartner
  },

  updatePartner: async (id, updates) => {
    const updatedPartner = await apiUpdatePartner(id, updates)
    return updatedPartner
  },

  deletePartner: async (id) => {
    await apiDeletePartner(id)
  },

  updatePipelineStatus: async (id, status) => {
    await apiUpdatePartner(id, { pipeline_status: status })
  },

  addInteraction: async (interaction) => {
    const newInteraction = await apiAddInteraction(interaction)
    return newInteraction
  }
}))
