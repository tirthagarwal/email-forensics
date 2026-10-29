-- ====================================================================
-- RESCUEAI: SUPABASE POSTGRESQL INITIAL SEED DATA
-- ====================================================================

-- 1. Insert Initial Organisations
INSERT INTO organisations (id, name, type, contact_email, contact_phone, address, city, verification_status)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Paws & Hope Animal Welfare Trust', 'ngo', 'care@pawshope.org', '+1 (800) 555-PAWS', '42 Meadow Lane, Central District', 'Metro City', 'Verified'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Metro City Veterinary Polyclinic', 'veterinary_clinic', 'vet.records@metroclinic.gov', '+1 (800) 555-VETS', '109 Civil Lines Hospital Road', 'Metro City', 'Verified'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Municipal Animal Control & Rabies Cell', 'municipality', 'animalcontrol@metro.gov', '+1 (800) 555-MUNI', 'Civic Centre, Block 4', 'Metro City', 'Verified')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Dogs
INSERT INTO dogs (id, dog_id, name, photo_url, breed, estimated_age, sex, color_markings, sterilization_status, health_status, vaccination_status, date_registered, usual_area, last_latitude, last_longitude, last_address, assigned_ngo_id, microchip_id, qr_tag_id, status, notes)
VALUES
    ('d0000001-0000-0000-0000-000000000001', 'RAI-DOG-0001', 'Bruno', 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80', 'Indie / Street Mix', '3 years', 'Male', 'Golden brown coat with white chest patch, left ear notched', 'Sterilized', 'Healthy', 'Vaccinated', '2025-01-10', 'Central Park West & Sector 14 Market', 28.5355, 77.3910, 'Near Central Park Gate 3, Sector 14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '985141002341901', 'TAG-RAI-0001', 'active', 'Very friendly community dog cared for by local tea stall vendors.'),
    ('d0000001-0000-0000-0000-000000000002', 'RAI-DOG-0002', 'Maya', 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=600&auto=format&fit=crop&q=80', 'Desi Hound Mix', '2.5 years', 'Female', 'Fawn with black muzzle, white front left sock', 'Sterilized', 'Healthy', 'Vaccinated', '2025-02-14', 'Green Valley Lake Promenade', 28.5422, 77.3854, 'Promenade Bench #12, Green Valley', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '985141002341902', 'TAG-RAI-0002', 'active', 'Regularly fed by morning walkers. Sterilized under ABC programme.'),
    ('d0000001-0000-0000-0000-000000000003', 'RAI-DOG-0003', 'Sheru', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80', 'Shepherd-Indie Cross', '4 years', 'Male', 'Sable black & tan with bushy tail and floppy right ear', 'Sterilized', 'Healthy', 'Due Soon', '2024-11-05', 'North Railway Station Cargo Yard', 28.5288, 77.3995, 'Railway Staff Quarters Entry Road', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '985141002341903', 'TAG-RAI-0003', 'active', 'Annual Rabies booster due in 14 days.'),
    ('d0000001-0000-0000-0000-000000000004', 'RAI-DOG-0004', 'Bella', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop&q=80', 'Labrador-Street Mix', '1.5 years', 'Female', 'Cream / light yellow with pinkish nose', 'Sterilized', 'Under Observation', 'Unvaccinated', '2026-10-12', 'Sector 21 Community Center Grounds', 28.5398, 77.4082, 'Backyard of Community Hall 2', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'TAG-RAI-0004', 'active', 'Recently rescued and sterilized. Scheduled for primary Rabies dose.'),
    ('d0000001-0000-0000-0000-000000000005', 'RAI-DOG-0005', 'Rocky', 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600&auto=format&fit=crop&q=80', 'Terrier Mix', '5 years', 'Male', 'Wire-haired grey and tan, scar over right brow', 'Sterilized', 'Needs Treatment', 'Overdue', '2024-08-20', 'Old Town Grain Market, Alley 4', 28.5215, 77.3789, 'Grain Market Shop #48 Veranda', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'TAG-RAI-0005', 'active', 'Observed limping on right foreleg. Rabies booster overdue by 45 days.'),
    ('d0000001-0000-0000-0000-000000000009', 'RAI-DOG-0009', 'Max', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format&fit=crop&q=80', 'Mixed Shepherd', '4.5 years', 'Male', 'Brindle with dark muzzle, muscular build', 'Sterilized', 'Quarantined', 'Overdue', '2024-06-10', 'Wholesale Timber Yard & Bypass', 28.5103, 77.3892, 'Municipal Quarantine Enclosure Ward 3', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', NULL, 'TAG-RAI-0009', 'active', 'CRITICAL ESCALATION: Under 10-day veterinary quarantine observation.')
ON CONFLICT (dog_id) DO NOTHING;

-- 3. Insert Initial QR Devices
INSERT INTO qr_devices (tag_id, dog_id, qr_status, issue_date, scan_count, device_condition, assigned_organisation_id, notes)
VALUES
    ('TAG-RAI-0001', 'd0000001-0000-0000-0000-000000000001', 'Active', '2025-01-10', 142, 'Good', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Anodized aluminum collar tag.'),
    ('TAG-RAI-0002', 'd0000001-0000-0000-0000-000000000002', 'Active', '2025-02-14', 88, 'Good', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Reflective strap collar with QR.'),
    ('TAG-RAI-0003', 'd0000001-0000-0000-0000-000000000003', 'Active', '2024-11-05', 64, 'Worn', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Normal edge wear.'),
    ('TAG-RAI-0005', 'd0000001-0000-0000-0000-000000000005', 'Active', '2024-08-20', 31, 'Worn', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Grain market tag.')
ON CONFLICT (tag_id) DO NOTHING;

-- 4. Insert Initial Vaccinations
INSERT INTO vaccination_records (dog_id, vaccine_name, disease_targeted, date_administered, next_due_date, dose_info, veterinarian_name, veterinary_org, batch_number, status)
VALUES
    ('d0000001-0000-0000-0000-000000000001', 'Nobivac Rabies (Inactivated)', 'Rabies Virus', '2025-11-12', '2026-11-12', '1.0 ml Subcutaneous', 'Dr. Arun Patel, DVM', 'Metro City Veterinary Polyclinic', 'NR-8842-A', 'Valid'),
    ('d0000001-0000-0000-0000-000000000001', 'Canigen DHPPi/L (7-in-1)', 'Core 7-in-1 Canine Spectrum', '2025-11-12', '2026-11-12', '1.0 ml Subcutaneous', 'Dr. Arun Patel, DVM', 'Metro City Veterinary Polyclinic', 'CD-9104-L', 'Valid'),
    ('d0000001-0000-0000-0000-000000000002', 'Defensor 3 Rabies Vaccine', 'Rabies Virus', '2026-02-15', '2027-02-15', '1.0 ml Subcutaneous', 'Dr. Priya Sharma, DVM', 'Metro City Veterinary Polyclinic', 'DEF-7721', 'Valid'),
    ('d0000001-0000-0000-0000-000000000005', 'Defensor 3 Rabies Vaccine', 'Rabies Virus', '2024-09-10', '2025-09-10', '1.0 ml Subcutaneous', 'Dr. Priya Sharma, DVM', 'Metro City Veterinary Polyclinic', 'DEF-1102', 'Overdue');

-- 5. Insert Initial Medical Records
INSERT INTO medical_records (dog_id, examination_date, category, symptoms, observed_injuries, suspected_condition, confirmed_diagnosis, treatment_provided, medication_details, veterinarian_name, treating_org, recovery_status, urgent_escalation)
VALUES
    ('d0000001-0000-0000-0000-000000000001', '2026-04-14', 'Injury', ARRAY['Superficial paw pad laceration'], '2cm cut from glass debris', 'Paw pad laceration', 'Acute superficial traumatic pododermatitis', 'Wound debridement, Betadine flush, dressing applied', 'Amoxicillin-Clavulanate 250mg BID x 5 days', 'Dr. Arun Patel, DVM', 'Metro City Veterinary Polyclinic', 'Full Recovery', FALSE),
    ('d0000001-0000-0000-0000-000000000005', '2026-10-26', 'Injury', ARRAY['Right front limb lameness', 'Carpal swelling'], 'Blunt force trauma to right carpal joint', 'Carpal joint sprain', NULL, 'Robert Jones support bandage applied', 'Meloxicam 0.1mg/kg SID x 7 days', 'Dr. Priya Sharma, DVM', 'Metro City Veterinary Polyclinic', 'Ongoing Treatment', FALSE),
    ('d0000001-0000-0000-0000-000000000009', '2026-10-28', 'Suspected rabies exposure', ARRAY['Aggression', 'Excessive salivation', 'Photophobia'], 'Bite wound on right flank', 'Potential Rabies Virus Exposure', NULL, 'Immediate isolation in quarantine enclosure', 'Post-exposure quarantine protocol', 'Dr. Arun Patel, DVM', 'Municipal Animal Control & Rabies Cell', 'Guarded', TRUE);
