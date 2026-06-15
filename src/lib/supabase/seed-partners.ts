// src/lib/supabase/seed-partners.ts
// Run this ONCE to import existing survey data into Supabase
// Execute via: npx ts-node src/lib/supabase/seed-partners.ts
// or just paste the insert into Supabase SQL editor

import { supabase } from '../supabase'

const partners = [
  { survey_id: 'AB-001', name: 'PRO AUTOMOTIVE MASTER- PAM', phone: '9605550596', area: 'Vazhuthacaud', partner_type: 'Car Wash', tier: 'Basic', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'Call', contacted_by: ['Asher', 'Sourabh'], notes: 'Need to send link' },
  { survey_id: 'AB-002', name: 'AUTOGLAZE', phone: '7034400000', area: 'Vazhuthacaud', partner_type: 'Detailing Studio', tier: 'Standard', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'Call', contacted_by: ['Asher', 'Sourabh'], notes: 'Need to contact owner' },
  { survey_id: 'AB-003', name: 'Aban Car Wash', phone: '8589014343', area: 'Jagathy', partner_type: 'Car Wash', tier: 'Standard', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'Visit', contacted_by: ['Asher', 'Sourabh'], notes: 'Owner available only on 23 May' },
  { survey_id: 'AB-004', name: 'MySyara', phone: '8943344334', area: 'Kowdiar', partner_type: 'Multi-Service', tier: 'Premium', pipeline_status: 'Interested', interest_level: 'Medium', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Asher', 'Sourabh'], notes: 'Interested but time slot issue. Suggested wow factor ideas.' },
  { survey_id: 'AB-005', name: 'One Stop Car Solutions', phone: '9947671999', area: 'Kowdiar', partner_type: 'Multi-Service', tier: 'Standard', pipeline_status: 'Follow-Up', interest_level: 'Low', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Asher', 'Sourabh', 'Subin'], notes: 'Not strong on idea, suggested including garage services' },
  { survey_id: 'AB-006', name: 'Perfect Car Wash and Detailing Service', phone: '9562439556', area: 'Ulloor', partner_type: 'Car Wash', tier: 'Standard', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Asher', 'Sourabh', 'Subin'], notes: 'Need to send details on WA' },
  { survey_id: 'AB-007', name: 'RCD CAR DETAILING COMPANY', phone: '9961231122', area: 'Ulloor', partner_type: 'Detailing Studio', tier: 'Premium', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Asher', 'Sourabh', 'Subin'], notes: 'Has booking app but not using it' },
  { survey_id: 'AB-008', name: 'D TOWN CAR DETAILING COMPANY & CAR WASH', phone: '9539532725', alternate_phone: '8590251641', area: 'Ulloor', partner_type: 'Detailing Studio', tier: 'Premium', pipeline_status: 'Interested', interest_level: 'High', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Asher', 'Sourabh', 'Subin'], notes: 'Manager interested. Will connect us with other centers.' },
  { survey_id: 'AB-009', name: 'GLO Factory Detailing and Car Wash Studio', phone: '9048848424', area: 'Kumarapuram', partner_type: 'Detailing Studio', tier: 'Standard', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'Call', contacted_by: ['Asher', 'Sourabh', 'Subin'], notes: 'Seems interested, need to contact owner' },
  { survey_id: 'AB-010', name: 'Auto Tub', phone: '7025988892', area: 'Kazhakuttam', partner_type: 'Auto Spa', tier: 'Premium', pipeline_status: 'Interested', interest_level: 'High', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Asher', 'Sourabh', 'Subin'], notes: 'Need to send details on WA' },
  { survey_id: 'AB-011', name: 'Auto Impressa', phone: '9995222503', area: 'Anyoor', partner_type: 'Car Wash', tier: 'Standard', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'Call', contacted_by: ['Asher', 'Subin'], notes: 'Need to contact owner' },
  { survey_id: 'AB-012', name: 'Super Deal Auto Care', phone: '8089797993', area: 'Kazhakuttam', partner_type: 'Multi-Service', tier: 'Multi-Service', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'Call', contacted_by: ['Asher', 'Subin'], notes: 'Need to contact owner' },
  { survey_id: 'AB-013', name: 'Garage 22 Multi Brand Tyres', phone: '9669732222', alternate_phone: '8547335154', area: 'Kazhakuttam', partner_type: 'Tyre Shop', tier: 'Multi-Service', pipeline_status: 'Interested', interest_level: 'Medium', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Asher', 'Subin'], notes: 'Need to send details on WA' },
  { survey_id: 'AB-014', name: 'Phoenix Autospa and Ceramic Coatings', phone: '8281437567', alternate_phone: '8330870568', area: 'Kazhakuttam', partner_type: 'Auto Spa', tier: 'Multi-Service', pipeline_status: 'Interested', interest_level: 'Low', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Asher', 'Subin'], notes: 'Need to send details on WA' },
  { survey_id: 'AB-015', name: 'Magnus Autopark', phone: '8943632097', alternate_phone: '9895084444', area: 'Kazhakuttam', partner_type: 'Multi-Service', tier: 'Standard', pipeline_status: 'Follow-Up', interest_level: 'Low', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Asher', 'Subin'] },
  { survey_id: 'AB-016', name: 'Concept Autohub', phone: '9048990009', area: 'Technopark', partner_type: 'Multi-Service', tier: 'Multi-Service', pipeline_status: 'Interested', interest_level: 'High', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Asher', 'Subin'] },
  { survey_id: 'AB-017', name: 'PiTLANE eXpressWASH', phone: '8893273747', alternate_phone: '9020724440', area: 'Technopark', partner_type: 'Car Wash', tier: 'Standard', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'Call', contacted_by: ['Subin', 'Sourabh'], notes: 'Need to call owner' },
  { survey_id: 'AB-018', name: 'Car Beautiq', phone: '9847490890', area: 'Kazhakuttam', partner_type: 'Car Wash', tier: 'Basic', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'Call', contacted_by: ['Subin', 'Sourabh'], notes: 'Need to call owner' },
  { survey_id: 'AB-019', name: 'Cartisan Trivandrum', phone: '9567032911', area: 'Kazhakuttam', partner_type: 'Detailing Studio', tier: 'Premium', pipeline_status: 'Follow-Up', interest_level: 'Low', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Subin', 'Sourabh'], notes: 'Not focused on car wash, needs follow-up' },
  { survey_id: 'AB-020', name: 'Autowize Detailerz AWC', phone: '6282386399', area: 'Chacka', partner_type: 'Detailing Studio', tier: 'Premium', pipeline_status: 'Follow-Up', interest_level: 'Unknown', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Subin', 'Sourabh'], notes: 'Busy with work, need to send link' },
  { survey_id: 'AB-021', name: 'SUPERLEGGERA RESTORATIONS', owner_name: 'Sandeep', phone: '9995013007', area: 'Chacka', partner_type: 'Multi-Service', tier: 'Multi-Service', pipeline_status: 'Interested', interest_level: 'Medium', follow_up_needed: true, follow_up_method: 'WhatsApp', contacted_by: ['Subin', 'Sourabh'], notes: 'Need to send link on WA' },
  { survey_id: 'AB-022', name: 'Car Crew Car Wash & Detailing Center', phone: '9745455500', area: 'Karamana', partner_type: 'Car Wash', tier: 'Standard', pipeline_status: 'Wishlist' },
  { survey_id: 'AB-023', name: 'Car Masterz', phone: '9895666076', area: 'Thampanoor', partner_type: 'Car Wash', tier: 'Standard', pipeline_status: 'Wishlist' },
  { survey_id: 'AB-024', name: 'ABC DETAILING AUTO SPA', phone: '7511177210', area: 'Poojapura', partner_type: 'Auto Spa', tier: 'Standard', pipeline_status: 'Wishlist' },
  { survey_id: 'AB-025', name: 'ORION Car Wash & Spa', phone: '9605040100', area: 'Kanjirampara', partner_type: 'Auto Spa', tier: 'Standard', pipeline_status: 'Wishlist' },
  { survey_id: 'AB-026', name: 'Anand Car Spa', phone: '9895463354', area: 'Pattoor', partner_type: 'Auto Spa', tier: 'Standard', pipeline_status: 'Wishlist' },
  { survey_id: 'AB-027', name: 'T.A.S Detailing Studio', phone: '9497454647', area: 'Maruthankuzhi', partner_type: 'Detailing Studio', tier: 'Standard', pipeline_status: 'Wishlist' },
  { survey_id: 'AB-028', name: 'Washington Detailing Center', phone: '7907707470', area: 'Pachalloor', partner_type: 'Detailing Studio', tier: 'Standard', pipeline_status: 'Wishlist' },
  { survey_id: 'AB-029', name: 'Caggo Steam Car Wash', phone: '8103600600', area: 'Thiruvallam', partner_type: 'Car Wash', tier: 'Basic', pipeline_status: 'Wishlist' },
  { survey_id: 'AB-030', name: 'INFINITY CAR DETAILING', phone: '9061371114', area: 'Technopark', partner_type: 'Detailing Studio', tier: 'Standard', pipeline_status: 'Wishlist' },
  // Contacted but not interested
  { survey_id: 'AB-036', name: 'CARFRESH', phone: '7736365224', area: 'Vazhuthacaud', partner_type: 'Car Wash', tier: 'Standard', pipeline_status: 'Rejected', interest_level: 'Low', contacted_by: ['Asher', 'Sourabh'] },
  { survey_id: 'AB-037', name: 'Florence Car Care (3 branches)', phone: '8593027788', area: 'Jagathy', partner_type: 'Car Wash', tier: 'Premium', pipeline_status: 'Follow-Up', interest_level: 'Low', contacted_by: ['Asher', 'Sourabh'], notes: 'Raised issue on slot booking and time management' },
  { survey_id: 'AB-038', name: 'Auto Castle', phone: '9895404053', area: 'Kowdiar', partner_type: 'Car Wash', tier: 'Basic', pipeline_status: 'Follow-Up', interest_level: 'Unknown', contacted_by: ['Asher', 'Sourabh'] },
  { survey_id: 'AB-039', name: 'Motoart Car Wash', phone: '8593000110', area: 'Kowdiar', partner_type: 'Car Wash', tier: 'Standard', pipeline_status: 'Follow-Up', interest_level: 'Unknown', contacted_by: ['Asher', 'Sourabh', 'Subin'] },
  { survey_id: 'AB-040', name: 'Lotus Auto Spa', phone: '7558904127', area: 'Kowdiar', partner_type: 'Auto Spa', tier: 'Standard', pipeline_status: 'Contacted', interest_level: 'Unknown', contacted_by: ['Asher', 'Sourabh', 'Subin'] },
  { survey_id: 'AB-041', name: 'Euroteq Car Care', owner_name: 'Sathyan', phone: '9048481739', area: 'Kowdiar', partner_type: 'Detailing Studio', tier: 'Standard', pipeline_status: 'Follow-Up', interest_level: 'Unknown', contacted_by: ['Asher', 'Sourabh', 'Subin'] },
  { survey_id: 'AB-042', name: 'Water Works Car Wash', phone: '8281687320', area: 'Kumarapuram', partner_type: 'Car Wash', tier: 'Basic', pipeline_status: 'Rejected', interest_level: 'Low', contacted_by: ['Asher', 'Sourabh', 'Subin'], notes: 'Contacted owner, not interested' },
  { survey_id: 'AB-043', name: 'NEW GEN AUTOMOTIVE', phone: '9846514444', area: 'Chacka', partner_type: 'Mechanic', tier: 'Basic', pipeline_status: 'Follow-Up', interest_level: 'Unknown', contacted_by: ['Subin', 'Sourabh'] },
  { survey_id: 'AB-044', name: 'Oceana Car and Bike Wash', phone: '8086088818', area: 'Kazhakuttam', partner_type: 'Car Wash', tier: 'Basic', pipeline_status: 'Rejected', interest_level: 'Low', contacted_by: ['Asher', 'Subin'] }
]

async function seed() {
  console.log('Seeding partners...');
  const { data, error } = await supabase.from('partners').upsert(partners, { onConflict: 'survey_id' }).select();
  if (error) {
    console.error('Error seeding partners:', error);
  } else {
    console.log(`Successfully seeded ${data?.length} partners!`);
  }
}

seed()
