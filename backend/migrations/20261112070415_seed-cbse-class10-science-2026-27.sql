-- Migration 3: reference data — boards, subjects, CBSE Class 10 Science 2026-27.
--
-- Source: Class 10 Science (086) annual syllabus 2026-27 (Directorate of Education,
-- Delhi, edustud.nic.in, based on the CBSE curriculum, prescribed book: NCERT Science X).
-- Notes from that syllabus:
--   * 13 chapters are assessed in the year-end exam.
--   * "Periodic Classification of Elements" is assessed only formatively (no chapter
--     number in the current NCERT book).
--   * Evolution (in Heredity) and Electric Motor / Electromagnetic Induction /
--     Electric Generator (in Magnetic Effects) are formative-only topics; seed them as
--     topics when the textbook is ingested.
--   * "Sources of Energy" is no longer in the syllabus.
-- AP SSC chapters are NOT seeded: no official 2026-27 chapter list was verified.
-- title_te is left NULL on purpose: use the official Telugu-medium textbook titles,
-- reviewed by a native speaker, rather than machine translations.

INSERT INTO public.boards (code, name, state) VALUES
  ('CBSE',  'Central Board of Secondary Education',     NULL),
  ('APSSC', 'Board of Secondary Education, Andhra Pradesh', 'Andhra Pradesh');

INSERT INTO public.subjects (code, name_en, name_te) VALUES
  ('physics',   'Physics',   'భౌతిక శాస్త్రం'),
  ('chemistry', 'Chemistry', 'రసాయన శాస్త్రం'),
  ('biology',   'Biology',   'జీవ శాస్త్రం');

INSERT INTO public.chapters
  (board_code, subject_code, grade, academic_year, number, title_en, unit_name, assessment_scope, sort_order)
VALUES
  ('CBSE', 'chemistry', 10, '2026-27',  1, 'Chemical Reactions and Equations',       'Chemical Substances – Nature and Behaviour', 'summative',       10),
  ('CBSE', 'chemistry', 10, '2026-27',  2, 'Acids, Bases and Salts',                 'Chemical Substances – Nature and Behaviour', 'summative',       20),
  ('CBSE', 'chemistry', 10, '2026-27',  3, 'Metals and Non-metals',                  'Chemical Substances – Nature and Behaviour', 'summative',       30),
  ('CBSE', 'chemistry', 10, '2026-27',  4, 'Carbon and its Compounds',               'Chemical Substances – Nature and Behaviour', 'summative',       40),
  ('CBSE', 'chemistry', 10, '2026-27', NULL, 'Periodic Classification of Elements',  'Chemical Substances – Nature and Behaviour', 'formative_only',  45),
  ('CBSE', 'biology',   10, '2026-27',  5, 'Life Processes',                         'The World of the Living',                    'summative',       50),
  ('CBSE', 'biology',   10, '2026-27',  6, 'Control and Coordination',               'The World of the Living',                    'summative',       60),
  ('CBSE', 'biology',   10, '2026-27',  7, 'How do Organisms Reproduce?',            'The World of the Living',                    'summative',       70),
  ('CBSE', 'biology',   10, '2026-27',  8, 'Heredity',                               'The World of the Living',                    'summative',       80),
  ('CBSE', 'physics',   10, '2026-27',  9, 'Light – Reflection and Refraction',      'Natural Phenomena',                          'summative',       90),
  ('CBSE', 'physics',   10, '2026-27', 10, 'The Human Eye and the Colourful World',  'Natural Phenomena',                          'summative',      100),
  ('CBSE', 'physics',   10, '2026-27', 11, 'Electricity',                            'Effects of Current',                         'summative',      110),
  ('CBSE', 'physics',   10, '2026-27', 12, 'Magnetic Effects of Electric Current',   'Effects of Current',                         'summative',      120),
  ('CBSE', 'biology',   10, '2026-27', 13, 'Our Environment',                        'Natural Resources',                          'summative',      130);
