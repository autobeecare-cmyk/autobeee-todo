import { supabase } from '../supabase'
import type { Partner, PartnerInteraction } from '../types'

// Partners CRUD
export const getPartners = async () => {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Partner[]
}

export const createPartner = async (partner: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase.from('partners').insert(partner).select().single()
  if (error) throw error
  return data as Partner
}

export const updatePartner = async (id: string, updates: Partial<Partner>) => {
  const { data, error } = await supabase.from('partners').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as Partner
}

export const deletePartner = async (id: string) => {
  const { error } = await supabase.from('partners').delete().eq('id', id)
  if (error) throw error
}

// Interactions
export const getInteractions = async (partnerId: string) => {
  const { data, error } = await supabase
    .from('partner_interactions')
    .select('*')
    .eq('partner_id', partnerId)
    .order('interaction_date', { ascending: false })
  if (error) throw error
  return (data || []) as PartnerInteraction[]
}

export const addInteraction = async (interaction: Omit<PartnerInteraction, 'id' | 'created_at'>) => {
  const { data, error } = await supabase.from('partner_interactions').insert(interaction).select().single()
  if (error) throw error
  return data as PartnerInteraction
}

export const subscribeToPartners = (callback: (partners: Partner[]) => void) => {
  const channelId = `partners-realtime-${Math.random().toString(36).substring(2, 9)}`
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, async () => {
      const partners = await getPartners()
      callback(partners)
    })
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
