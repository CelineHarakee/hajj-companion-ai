-- Create knowledge base table for RAG (simple text search version)
CREATE TABLE public.hajj_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hajj_knowledge ENABLE ROW LEVEL SECURITY;

-- Public read access for knowledge base
CREATE POLICY "Knowledge base is viewable by everyone" 
ON public.hajj_knowledge 
FOR SELECT 
USING (true);

-- Create indexes for faster searches
CREATE INDEX idx_hajj_knowledge_category ON public.hajj_knowledge(category);
CREATE INDEX idx_hajj_knowledge_keywords ON public.hajj_knowledge USING GIN(keywords);

-- Insert sample Hajj/Umrah knowledge with keywords
INSERT INTO public.hajj_knowledge (title, content, category, keywords) VALUES
('Tawaf Ritual', 'Tawaf is the act of circumambulating the Kaaba seven times in a counter-clockwise direction. It begins at the Black Stone (Hajar al-Aswad) and ends at the same point. Pilgrims should be in a state of wudu (ablution) and men should uncover their right shoulder (Idtiba). During Tawaf, pilgrims recite prayers and supplications.', 'rituals', ARRAY['tawaf', 'kaaba', 'circumambulation', 'black stone', 'wudu', 'seven circuits', 'ritual']),
('Sa''i Between Safa and Marwa', 'Sa''i involves walking seven times between the hills of Safa and Marwa. This commemorates Hajar''s search for water for her son Ismail. The walk starts at Safa and ends at Marwa, with running (Raml) between the green markers for men. Each trip from one hill to the other counts as one lap.', 'rituals', ARRAY['sai', 'safa', 'marwa', 'seven laps', 'hajar', 'ismail', 'running', 'raml']),
('Day of Arafat', 'The Day of Arafat (9th Dhul Hijjah) is the most important day of Hajj. Pilgrims spend the day at the plain of Arafat in prayer and supplication from noon until sunset. Missing this day invalidates the Hajj. It is recommended to face the Qibla, make dua, and recite Talbiyah.', 'rituals', ARRAY['arafat', 'dhul hijjah', 'most important', 'prayer', 'supplication', 'dua', 'talbiyah']),
('Ihram Requirements', 'Ihram is the sacred state pilgrims enter before performing Hajj or Umrah. Men wear two white seamless cloths, while women wear modest clothing. Before entering Ihram, perform ghusl, apply perfume (before wearing Ihram clothes), pray two rakats, and make the intention (niyyah) for Hajj or Umrah.', 'preparation', ARRAY['ihram', 'sacred state', 'white cloth', 'ghusl', 'niyyah', 'intention', 'preparation']),
('Prohibited Acts in Ihram', 'While in Ihram, pilgrims must avoid: cutting hair or nails, using perfume, killing animals or insects, sexual relations, marriage proposals, wearing sewn clothes (men), covering the head (men), covering the face (women), and arguing or fighting.', 'rules', ARRAY['ihram', 'prohibited', 'forbidden', 'restrictions', 'rules', 'haram']),
('Umrah Steps', 'Umrah consists of four main steps: 1) Enter Ihram at the Miqat, 2) Perform Tawaf around the Kaaba (7 circuits), 3) Perform Sa''i between Safa and Marwa (7 laps), 4) Shave or trim hair (Halq or Taqsir). Men must shave or significantly trim their hair, women trim a fingertip''s length.', 'rituals', ARRAY['umrah', 'steps', 'miqat', 'tawaf', 'sai', 'halq', 'taqsir', 'shaving']),
('Packing for Hajj', 'Essential items include: Ihram clothing, comfortable walking shoes, unscented toiletries, medications, copies of important documents, modest clothing for after Hajj, prayer mat, Quran, sunscreen, and a small backpack. Avoid bringing valuables and pack light as you will be walking extensively.', 'preparation', ARRAY['packing', 'luggage', 'what to bring', 'essentials', 'items', 'travel']),
('Health Precautions', 'Get required vaccinations (meningitis is mandatory). Stay hydrated by drinking plenty of water. Protect yourself from the sun with umbrellas and sunscreen. Wear comfortable shoes to prevent blisters. Maintain good hygiene. Pace yourself and rest when needed. Carry medications for common ailments.', 'health', ARRAY['health', 'vaccination', 'hydration', 'medical', 'safety', 'precautions']),
('Mina and Muzdalifah', 'Pilgrims spend the night of 8th Dhul Hijjah in Mina, then proceed to Arafat. After sunset on 9th, they move to Muzdalifah to spend the night under the stars, collecting pebbles for the stoning ritual. The next morning (10th), they return to Mina for the stoning of Jamarat al-Aqabah.', 'rituals', ARRAY['mina', 'muzdalifah', 'pebbles', 'stoning', 'jamarat', 'dhul hijjah']),
('Stoning the Jamarat', 'The stoning ritual involves throwing pebbles at three pillars in Mina representing Satan. On the 10th, stone only the largest pillar (Jamarat al-Aqabah) with 7 pebbles. On the 11th, 12th, and optionally 13th, stone all three pillars with 7 pebbles each, starting from the smallest.', 'rituals', ARRAY['stoning', 'jamarat', 'pebbles', 'pillars', 'satan', 'ritual', 'mina']);