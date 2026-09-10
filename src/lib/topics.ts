// A broad reference list of dermatology-residency topics, used only to power
// the quick-capture typeahead (src/pages/Today.tsx) so residents converge on
// similar names for the same condition instead of each phrasing it slightly
// differently. This never restricts what can be captured — a resident can
// always keep typing their own text if nothing here matches.
const RAW_TOPICS = [
  // Foundations / clinical dermatology
  "Normal skin", "Skin anatomy", "Skin physiology", "Epidermis and keratinization",
  "Dermis and extracellular matrix", "Basement membrane zone", "Melanocyte biology",
  "Hair biology", "Nail biology", "Sebaceous glands", "Eccrine/apocrine glands",
  "Cutaneous vasculature", "Cutaneous nerves", "Skin microbiome", "Immunology",
  "Innate immunity", "Adaptive immunity", "Inflammation", "Allergy/hypersensitivity",
  "Autoimmunity", "Genetics", "Genomics", "Molecular biology", "Embryology",
  "Photobiology", "Wound healing", "Cutaneous microbiology", "Tumor biology",
  "Carcinogenesis", "Aging/photoaging", "Skin barrier", "Percutaneous absorption",
  "Epidemiology",

  // Morphology and clinical diagnosis
  "Macule", "Patch", "Papule", "Plaque", "Nodule", "Tumor", "Vesicle", "Bulla",
  "Pustule", "Wheal", "Cyst", "Scale", "Crust", "Erosion", "Ulcer", "Fissure",
  "Excoriation", "Atrophy", "Scar", "Lichenification", "Distribution and configuration",
  "Annular disorders", "Reticulate disorders", "Linear/Blaschkoid disorders",
  "Dermatomal patterns", "Acral eruptions", "Flexural/intertriginous eruptions",
  "Extensor eruptions", "Photodistributed eruptions", "Generalized eruptions",
  "Erythroderma", "Pruritus", "Dysesthesia", "Approach to rash", "Differential diagnosis",
  "Full skin examination", "Lymph-node examination", "Dermoscopy", "Trichoscopy",
  "Nail dermoscopy", "Wood lamp examination", "Diascopy",

  // Eczema / dermatitis
  "Eczema", "Dermatitis", "Atopic dermatitis (AD)", "Allergic contact dermatitis (ACD)", "Irritant contact dermatitis (ICD)",
  "Photoallergic contact dermatitis", "Phototoxic dermatitis", "Seborrheic dermatitis (SD)",
  "Nummular dermatitis", "Dyshidrotic eczema/pompholyx", "Asteatotic eczema",
  "Stasis dermatitis", "Lichen simplex chronicus", "Autosensitization/id reaction",
  "Hand dermatitis", "Foot dermatitis", "Eyelid dermatitis", "Lip dermatitis/cheilitis",
  "Diaper dermatitis", "Juvenile plantar dermatosis", "Occupational dermatitis",
  "Airborne contact dermatitis", "Protein contact dermatitis",

  // Cutaneous allergy
  "Patch testing", "Prick testing", "Contact allergens", "Systemic contact dermatitis",
  "Contact urticaria", "Latex allergy", "Photo-patch testing", "Occupational allergology",

  // Psoriasis and related disease
  "Psoriasis", "Chronic plaque psoriasis", "Guttate psoriasis", "Inverse psoriasis", "Scalp psoriasis",
  "Palmoplantar psoriasis", "Nail psoriasis", "Pustular psoriasis",
  "Generalized pustular psoriasis", "Palmoplantar pustulosis", "Erythrodermic psoriasis",
  "Psoriatic arthritis (PsA)", "Sebopsoriasis",

  // Papulosquamous diseases
  "Pityriasis rosea", "Pityriasis rubra pilaris (PRP)", "Pityriasis lichenoides chronica",
  "PLEVA", "Parapsoriasis", "Digitate dermatosis", "Small-plaque parapsoriasis",
  "Large-plaque parapsoriasis", "Secondary syphilis", "Gianotti-Crosti syndrome",

  // Lichenoid disorders
  "Lichen planus", "Hypertrophic lichen planus", "Actinic lichen planus",
  "Pigmentary lichen planus", "Lichen planopilaris", "Frontal fibrosing alopecia (FFA)",
  "Oral lichen planus", "Genital lichen planus", "Lichen nitidus", "Lichen striatus",
  "Lichenoid drug eruption", "Graft-versus-host disease (GVHD)", "Lichen sclerosus", "Lichen aureus",

  // Acne and follicular disorders
  "Acne", "Acne vulgaris", "Comedonal acne", "Nodulocystic acne", "Acne conglobata",
  "Acne fulminans", "Drug-induced acne", "Steroid acne", "Acne mechanica",
  "Neonatal acne", "Infantile acne", "Acne excoriée", "Hidradenitis suppurativa (HS)",
  "Dissecting cellulitis of the scalp", "Acne keloidalis nuchae", "Folliculitis",
  "Gram-negative folliculitis", "Malassezia folliculitis", "Pseudofolliculitis barbae",
  "Perifolliculitis capitis abscedens", "Keratosis pilaris", "Follicular occlusion disorders",

  // Rosacea and facial dermatoses
  "Rosacea", "Papulopustular rosacea", "Erythematotelangiectatic rosacea",
  "Phymatous rosacea", "Ocular rosacea", "Granulomatous rosacea",
  "Periorificial dermatitis", "Demodicosis", "Facial Afro-Caribbean childhood eruption",
  "Steroid-induced rosacea", "Acneiform eruptions",

  // Urticaria, angioedema and mast-cell disorders
  "Acute urticaria", "Chronic spontaneous urticaria (CSU)", "Dermatographism", "Cold urticaria",
  "Heat urticaria", "Cholinergic urticaria", "Solar urticaria", "Pressure urticaria",
  "Aquagenic urticaria", "Vibratory urticaria", "Angioedema", "Hereditary angioedema (HAE)",
  "Urticarial vasculitis", "Cutaneous mastocytosis", "Urticaria pigmentosa",
  "Diffuse cutaneous mastocytosis", "Mastocytoma", "Systemic mastocytosis",

  // Autoimmune connective-tissue / rheumatologic dermatology
  "Lupus", "Acute cutaneous lupus erythematosus (ACLE)", "Subacute cutaneous lupus (SCLE)", "Discoid lupus (DLE)",
  "Chilblain lupus", "Tumid lupus", "Lupus panniculitis", "Dermatomyositis (DM)",
  "Clinically amyopathic dermatomyositis", "Juvenile dermatomyositis", "Systemic sclerosis (SSc)",
  "Morphea", "Generalized morphea", "Linear morphea", "Eosinophilic fasciitis",
  "Mixed connective-tissue disease (MCTD)", "Sjögren syndrome", "Rheumatoid-associated skin disease",
  "Antiphospholipid syndrome", "Calcinosis cutis", "Raynaud phenomenon",

  // Autoimmune blistering diseases
  "Pemphigus vulgaris (PV)", "Pemphigus foliaceus (PF)", "Paraneoplastic pemphigus", "IgA pemphigus",
  "Drug-induced pemphigus", "Bullous pemphigoid (BP)", "Mucous membrane pemphigoid (MMP)",
  "Pemphigoid gestationis", "Linear IgA bullous dermatosis (LABD)",
  "Epidermolysis bullosa acquisita (EBA)", "Bullous systemic lupus erythematosus",
  "Dermatitis herpetiformis (DH)", "Anti-p200 pemphigoid", "Lichen planus pemphigoides",
  "Porphyria-associated blistering mimics",

  // Inherited blistering diseases
  "Epidermolysis bullosa simplex (EBS)", "Junctional epidermolysis bullosa (JEB)",
  "Dystrophic epidermolysis bullosa (DEB)", "Kindler epidermolysis bullosa",
  "Hailey-Hailey disease", "Darier disease", "Grover disease",

  // Vasculitis, vasculopathy and purpura
  "Cutaneous small-vessel vasculitis (CSVV)", "Leukocytoclastic vasculitis", "IgA vasculitis",
  "ANCA-associated vasculitis", "Granulomatosis with polyangiitis (GPA)",
  "Microscopic polyangiitis (MPA)", "Eosinophilic granulomatosis with polyangiitis (EGPA)",
  "Polyarteritis nodosa (PAN)", "Cutaneous polyarteritis nodosa", "Behçet disease",
  "Cryoglobulinemia", "Livedoid vasculopathy", "Livedo reticularis", "Livedo racemosa",
  "Retiform purpura", "Calciphylaxis", "Cholesterol emboli",
  "Pigmented purpuric dermatoses", "Schamberg disease", "Majocchi purpura",
  "Purpura annularis telangiectodes", "Disseminated intravascular coagulation skin findings",

  // Neutrophilic dermatoses
  "Sweet syndrome", "Pyoderma gangrenosum (PG)", "Neutrophilic eccrine hidradenitis",
  "Bowel-associated dermatosis-arthritis syndrome", "Rheumatoid neutrophilic dermatosis",
  "Subcorneal pustular dermatosis", "Amicrobial pustulosis",

  // Eosinophilic disorders
  "Wells syndrome", "Eosinophilic pustular folliculitis", "Hypereosinophilic syndrome",
  "Papular eruption of HIV", "Arthropod-reaction patterns",

  // Autoinflammatory disorders
  "Familial Mediterranean fever (FMF)", "CAPS", "Muckle-Wells syndrome",
  "Familial cold autoinflammatory syndrome", "NOMID/CINCA", "PAPA syndrome",
  "PASH/PAPASH", "DIRA", "Deficiency of IL-36 receptor antagonist", "Schnitzler syndrome",
  "Adult-onset Still disease",

  // Granulomatous and macrophage disorders
  "Sarcoidosis", "Granuloma annulare (GA)", "Necrobiosis lipoidica (NL)", "Rheumatoid nodules",
  "Interstitial granulomatous dermatitis", "Palisaded neutrophilic granulomatous dermatitis",
  "Foreign-body granuloma", "Silicone granuloma", "Tattoo granuloma",
  "Annular elastolytic giant-cell granuloma",

  // Histiocytoses
  "Langerhans cell histiocytosis (LCH)", "Juvenile xanthogranuloma", "Erdheim-Chester disease",
  "Rosai-Dorfman disease", "Generalized eruptive histiocytoma",
  "Benign cephalic histiocytosis", "Xanthoma disseminatum",

  // Bacterial infections
  "Impetigo", "Ecthyma", "Furuncle", "Carbuncle", "Cellulitis", "Erysipelas", "Abscess",
  "Necrotizing fasciitis", "Staphylococcal scalded skin syndrome (SSSS)", "Toxic shock syndrome (TSS)",
  "Scarlet fever", "Erythrasma", "Trichomycosis axillaris", "Pitted keratolysis",
  "Corynebacterial infections", "Anthrax", "Tularemia", "Cat-scratch disease",
  "Erysipeloid", "Cutaneous diphtheria", "Pseudomonas folliculitis",
  "Ecthyma gangrenosum", "Vibrio infection", "Aeromonas infection", "Lyme disease",
  "Cutaneous manifestations of meningococcemia",

  // Mycobacterial disease
  "Tuberculosis of the skin", "Lupus vulgaris", "Scrofuloderma",
  "Tuberculosis verrucosa cutis", "Tuberculids", "Leprosy/Hansen disease",
  "Tuberculoid leprosy", "Lepromatous leprosy", "Borderline leprosy", "Leprosy reactions",
  "Atypical/nontuberculous mycobacterial infection", "Mycobacterium marinum",
  "Rapid-growing mycobacteria",

  // Viral infections
  "Herpes simplex (HSV)", "Genital herpes", "Eczema herpeticum", "Herpetic whitlow",
  "Varicella", "Herpes zoster", "Disseminated zoster", "Verruca vulgaris",
  "Plantar warts", "Flat warts", "Genital HPV", "Molluscum contagiosum", "Orf",
  "Milker's nodules", "Mpox", "Hand-foot-mouth disease", "Herpangina", "Measles",
  "Rubella", "Parvovirus B19", "Roseola", "EBV-associated eruptions", "CMV skin disease",
  "HIV-associated skin disease", "Viral exanthems", "Dengue-associated eruption",
  "Chikungunya-associated eruption", "Zika-associated eruption",

  // Superficial fungal and yeast disease
  "Tinea corporis", "Tinea cruris", "Tinea pedis", "Tinea manuum", "Tinea faciei",
  "Tinea capitis", "Tinea barbae", "Tinea incognito", "Majocchi granuloma",
  "Onychomycosis", "Candida infection", "Intertrigo", "Pityriasis/tinea versicolor",
  "Piedra", "Tinea nigra",

  // Deep fungal infections / tropical mycoses
  "Sporotrichosis", "Chromoblastomycosis", "Mycetoma", "Blastomycosis", "Histoplasmosis",
  "Coccidioidomycosis", "Cryptococcosis", "Paracoccidioidomycosis", "Mucormycosis",
  "Fusariosis", "Phaeohyphomycosis", "Lobomycosis",

  // Parasitic disease / infestations / arthropods
  "Scabies", "Crusted scabies", "Pediculosis capitis", "Pediculosis corporis",
  "Pediculosis pubis", "Cutaneous larva migrans (CLM)", "Larva currens",
  "Cutaneous leishmaniasis", "Post-kala-azar dermal leishmaniasis", "Onchocerciasis",
  "Loiasis", "Cercarial dermatitis", "Tungiasis", "Myiasis", "Bedbug bites",
  "Flea bites", "Mosquito reactions", "Tick bites", "Spider bites",
  "Scorpion-associated skin findings", "Marine envenomation", "Papular urticaria",

  // Sexually transmitted infections / venereology
  "Primary syphilis", "Tertiary syphilis", "Congenital syphilis", "Gonorrhea",
  "Chlamydia", "Lymphogranuloma venereum (LGV)", "Chancroid", "Granuloma inguinale",
  "HIV-associated dermatoses", "Hepatitis-associated cutaneous manifestations",
  "Trichomoniasis", "Scabies/pubic lice in sexual-health settings", "Partner notification",
  "STI prevention", "Sexual-health counseling", "STI laboratory diagnosis",
  "STIs in pregnancy/neonates",

  // Drug eruptions / adverse cutaneous drug reactions
  "Morbilliform drug eruption", "Urticarial drug eruption", "Fixed drug eruption",
  "Generalized bullous fixed drug eruption", "DRESS/DIHS", "Stevens-Johnson syndrome (SJS)",
  "Toxic epidermal necrolysis (TEN)", "AGEP", "SDRIFE", "Drug-induced lupus",
  "Drug-induced pemphigus/pemphigoid", "Drug-induced photosensitivity",
  "Drug-induced pigmentation", "Acneiform drug eruption", "Pseudolymphoma",
  "Serum sickness-like reaction", "Anticoagulant-associated necrosis",
  "Biologic-associated eruptions", "Immune-checkpoint-inhibitor cutaneous toxicities",
  "EGFR inhibitor eruptions", "BRAF/MEK inhibitor skin toxicities",
  "CAR-T/transplant-related cutaneous toxicities",

  // Erythemas and reactive eruptions
  "Erythema multiforme (EM)", "Erythema nodosum (EN)", "Erythema annulare centrifugum",
  "Erythema gyratum repens", "Necrolytic migratory erythema",
  "Reactive infectious mucocutaneous eruption", "Kawasaki disease skin findings",

  // Pigmentary disorders
  "Vitiligo", "Segmental vitiligo", "Postinflammatory hyperpigmentation",
  "Postinflammatory hypopigmentation", "Melasma", "Lentigines", "Ephelides/freckles",
  "Café-au-lait macules", "Nevus depigmentosus", "Ash-leaf macules", "Piebaldism",
  "Albinism", "Waardenburg syndrome", "Hypomelanosis of Ito",
  "Progressive macular hypomelanosis", "Idiopathic guttate hypomelanosis",
  "Lichen planus pigmentosus", "Erythema dyschromicum perstans",
  "Pigmentary demarcation lines", "Hemosiderin pigmentation", "Exogenous ochronosis",
  "Ashy dermatosis", "Chemical leukoderma", "Confetti-like hypopigmentation",
  "Acquired dermal melanocytosis",

  // Hair and scalp disorders
  "Alopecia", "Androgenetic alopecia (AGA)", "Female-pattern hair loss", "Alopecia areata (AA)",
  "Alopecia totalis", "Alopecia universalis", "Telogen effluvium", "Anagen effluvium",
  "Traction alopecia", "Trichotillomania", "Central centrifugal cicatricial alopecia (CCCA)",
  "Discoid lupus alopecia", "Folliculitis decalvans", "Syphilitic alopecia",
  "Loose anagen syndrome", "Short anagen syndrome", "Trichorrhexis nodosa",
  "Trichorrhexis invaginata", "Pili torti", "Monilethrix", "Trichothiodystrophy",
  "Woolly hair", "Hypertrichosis", "Hirsutism", "Hair-shaft disorders",
  "Cicatricial alopecia", "Nonscarring alopecia",

  // Nail disease
  "Nail lichen planus", "Trachyonychia", "Onycholysis", "Onychoschizia",
  "Onychorrhexis", "Beau lines", "Onychomadesis", "Clubbing", "Koilonychia",
  "Pincer nails", "Ingrown nails", "Chronic paronychia", "Acute paronychia",
  "Green nail syndrome", "Longitudinal melanonychia", "Subungual melanoma",
  "Glomus tumor", "Digital mucous cyst", "Onychopapilloma", "Nail-unit SCC",
  "Nail tumors", "Yellow nail syndrome", "Twenty-nail dystrophy",

  // Eccrine, apocrine and sweat disorders
  "Hyperhidrosis", "Hypohidrosis", "Anhidrosis", "Miliaria", "Bromhidrosis",
  "Chromhidrosis", "Fox-Fordyce disease", "Eccrine nevus", "Aquagenic wrinkling",
  "Granular parakeratosis",

  // Oral and mucosal dermatology
  "Aphthous ulcers", "Oral lupus", "Oral pemphigus", "Geographic tongue",
  "Fissured tongue", "Oral candidiasis", "Leukoplakia", "Oral hairy leukoplakia",
  "Cheilitis", "Angular cheilitis", "Actinic cheilitis", "Oral pigmentation",
  "Oral melanoma", "Oral SCC", "Burning-mouth disorders",

  // Genital/anogenital dermatology
  "Genital psoriasis", "Genital eczema", "Zoon balanitis", "Vulvovaginal dermatoses",
  "Vulvodynia", "Balanitis", "Vulvar intraepithelial neoplasia (VIN)",
  "Penile intraepithelial neoplasia (PeIN)", "Extramammary Paget disease (EMPD)",
  "Genital Crohn disease", "Genital infections/STIs", "Anogenital malignancy",

  // Pediatric dermatology
  "Birthmarks", "Infantile hemangioma", "Congenital melanocytic nevus",
  "Nevus sebaceous", "Epidermal nevus", "Port-wine birthmark", "Salmon patch",
  "Dermal melanocytosis", "Cutis marmorata", "Aplasia cutis congenita", "Mastocytosis",
  "Papular-purpuric gloves-and-socks syndrome", "Kawasaki disease",
  "Acute hemorrhagic edema of infancy", "Childhood blistering diseases",
  "Pediatric psoriasis", "Pediatric acne", "Pediatric alopecia", "Pediatric infections",
  "Pediatric vascular anomalies", "Pediatric genetic skin disease",

  // Genodermatoses / developmental disease
  "Neurofibromatosis", "Tuberous sclerosis complex", "Incontinentia pigmenti",
  "Epidermal nevus syndromes", "Sturge-Weber syndrome", "PTEN/Cowden syndrome",
  "Peutz-Jeghers syndrome", "Gorlin syndrome", "Gardner syndrome",
  "Birt-Hogg-Dubé syndrome", "Xeroderma pigmentosum", "Dyskeratosis congenita",
  "Pachyonychia congenita", "Ichthyosis vulgaris", "X-linked ichthyosis",
  "Lamellar ichthyosis", "Congenital ichthyosiform erythroderma",
  "Harlequin ichthyosis", "Epidermolytic ichthyosis", "Netherton syndrome",
  "CHILD syndrome", "Refsum disease", "Sjögren-Larsson syndrome",
  "Ectodermal dysplasia", "Epidermolysis bullosa", "Kindler syndrome",
  "Peeling-skin syndromes", "Keratodermas", "Porokeratosis",
  "Hereditary connective-tissue disorders", "Ehlers-Danlos syndrome", "Cutis laxa",
  "Pseudoxanthoma elasticum",

  // Keratinization disorders
  "Ichthyoses", "Palmoplantar keratoderma", "Disseminated superficial actinic porokeratosis",
  "Acrokeratosis verruciformis", "Epidermolytic hyperkeratosis",

  // Vascular anomalies
  "Congenital hemangioma", "Capillary malformation", "Venous malformation",
  "Lymphatic malformation", "Arteriovenous malformation", "Pyogenic granuloma",
  "Angiokeratoma", "Spider angioma", "Telangiectasia",
  "Hereditary hemorrhagic telangiectasia", "Kaposiform hemangioendothelioma",
  "Kasabach-Merritt phenomenon",

  // Dermal connective-tissue / elastic-tissue disorders
  "Keloids", "Hypertrophic scars", "Atrophic scars", "Striae", "Anetoderma",
  "Elastosis perforans serpiginosa", "Scleromyxedema", "Scleredema",
  "Nephrogenic systemic fibrosis", "Generalized essential telangiectasia",

  // Subcutaneous tissue / panniculitis
  "Subcutaneous panniculitis-like T-cell lymphoma", "Pancreatic panniculitis",
  "Alpha-1-antitrypsin-deficiency panniculitis", "Cold panniculitis",
  "Traumatic panniculitis", "Lipodermatosclerosis", "Factitial panniculitis",
  "Lipodystrophy",

  // Metabolic and deposition disorders
  "Xanthomas", "Gouty tophi", "Amyloidosis", "Primary localized cutaneous amyloidosis",
  "Lichen amyloidosis", "Macular amyloidosis", "Porphyrias", "Porphyria cutanea tarda",
  "Erythropoietic protoporphyria", "Mucinoses", "Pretibial myxedema",
  "Hemochromatosis skin findings", "Wilson disease skin findings",
  "Diabetes-associated dermatoses",

  // Nutritional deficiency dermatology
  "Acrodermatitis enteropathica/zinc deficiency", "Pellagra", "Scurvy",
  "Vitamin A deficiency", "Vitamin C deficiency", "Riboflavin deficiency",
  "Niacin deficiency", "Biotin deficiency", "Protein-energy malnutrition",
  "Essential-fatty-acid deficiency",

  // Cutaneous signs of systemic disease
  "Diabetes", "Thyroid disease", "Renal disease", "Hepatic disease",
  "Inflammatory bowel disease", "Rheumatologic disease", "Hematologic disease",
  "Endocrine disease", "Gastrointestinal disease", "Pulmonary disease",
  "Neurologic disease", "Immunodeficiency", "HIV", "Organ transplantation",
  "Internal malignancy",

  // Paraneoplastic dermatology
  "Acanthosis nigricans", "Leser-Trélat sign", "Bazex syndrome",
  "Acquired hypertrichosis lanuginosa", "Migratory thrombophlebitis",
  "Florid cutaneous papillomatosis",

  // Psychocutaneous disease
  "Delusional infestation", "Dermatitis artefacta", "Excoriation disorder",
  "Body dysmorphic disorder", "Psychogenic pruritus", "Neurotic excoriations",
  "Habit disorders", "Psychosocial effects of visible skin disease",

  // Pruritus
  "Localized pruritus", "Generalized pruritus", "Neuropathic itch",
  "Brachioradial pruritus", "Notalgia paresthetica", "Pruritus of systemic disease",
  "Aquagenic pruritus", "Pruritus in pregnancy", "Senile pruritus",

  // Physical/environmental dermatoses
  "Sunburn", "Chronic photodamage", "Heat injury", "Burns", "Cold injury",
  "Frostbite", "Perniosis/chilblains", "Erythema ab igne", "Pressure injury",
  "Friction dermatosis", "Radiation dermatitis", "Radiation recall",
  "Chemical burns", "Mechanical dermatoses", "Aquatic dermatoses",

  // Photodermatology
  "Polymorphous light eruption (PMLE)", "Chronic actinic dermatitis (CAD)", "Actinic prurigo",
  "Hydroa vacciniforme", "Phototoxicity", "Photoallergy", "Photoaggravated lupus",
  "Photoaggravated dermatomyositis", "Phototesting", "Photopatch testing",
  "UVA/UVB biology",

  // Occupational dermatology
  "Occupational urticaria", "Occupational acne", "Mechanical/friction disease",
  "Chemical exposures", "UV-related occupational disease", "Occupational skin cancer",
  "Prevention/protective equipment", "Workplace allergen assessment",

  // Pregnancy-associated dermatoses
  "Polymorphic eruption of pregnancy/PUPPP", "Atopic eruption of pregnancy",
  "Intrahepatic cholestasis of pregnancy", "Pustular psoriasis of pregnancy",
  "Physiologic skin changes of pregnancy", "Pregnancy-associated hair/nail changes",
  "Medication safety in pregnancy/lactation",

  // Geriatric dermatology
  "Xerosis", "Skin tears", "Pressure injuries", "Purpura", "Photodamage",
  "Skin cancers", "Medication-related disease", "Chronic ulcers",
  "Age-related hair/nail disorders",

  // Immunocompromised/transplant dermatology
  "Opportunistic infections", "Aggressive SCC", "Kaposi sarcoma", "EBV-associated disease",
  "Drug toxicities", "Post-transplant lymphoproliferative disease", "Neutropenic dermatoses",

  // Benign epidermal tumors
  "Seborrheic keratosis", "Stucco keratosis", "Dermatosis papulosa nigra", "Warts",
  "Clear-cell acanthoma", "Warty dyskeratoma", "Poroma", "Hydroacanthoma simplex",

  // Benign melanocytic lesions
  "Acquired melanocytic nevus", "Blue nevus", "Spitz nevus", "Reed nevus", "Halo nevus",
  "Nevus spilus", "Acral nevus", "Dysplastic/atypical nevus", "Nevus of Ota", "Nevus of Ito",

  // Benign adnexal tumors
  "Trichoepithelioma", "Trichilemmoma", "Pilomatricoma", "Cylindroma", "Spiradenoma",
  "Hidrocystoma", "Syringoma", "Sebaceous adenoma", "Sebaceoma", "Hidradenoma",
  "Chondroid syringoma",

  // Cysts and common benign lesions
  "Epidermoid cyst", "Pilar cyst", "Milia", "Steatocystoma", "Lipoma", "Dermatofibroma",
  "Acrochordon", "Neurofibroma", "Leiomyoma", "Granular-cell tumor",

  // Premalignant disease
  "Actinic keratosis (AK)", "Bowen disease/SCC in situ", "Erythroplasia of Queyrat",
  "Vulvar/penile intraepithelial neoplasia", "Keratoacanthoma", "Lentigo maligna",
  "Dysplastic nevi in melanoma-risk context",

  // Keratinocyte carcinoma
  "Basal cell carcinoma (BCC)", "Nodular BCC", "Superficial BCC", "Morpheaform/infiltrative BCC",
  "Pigmented BCC", "Squamous cell carcinoma (SCC)", "SCC in situ", "Keratoacanthoma-type SCC",
  "High-risk SCC", "Transplant-associated SCC",

  // Melanoma
  "Melanoma", "Superficial spreading melanoma", "Nodular melanoma", "Lentigo maligna melanoma",
  "Acral lentiginous melanoma", "Subungual/nail-unit melanoma", "Mucosal melanoma",
  "Desmoplastic melanoma", "Amelanotic melanoma", "Pediatric melanoma",
  "Melanoma staging", "Sentinel-node concepts", "Dermoscopy of melanoma",
  "Melanoma in diverse skin tones",

  // Other cutaneous malignancies
  "Merkel cell carcinoma (MCC)", "Dermatofibrosarcoma protuberans", "Atypical fibroxanthoma",
  "Pleomorphic dermal sarcoma", "Angiosarcoma", "Microcystic adnexal carcinoma",
  "Sebaceous carcinoma", "Adnexal carcinoma",

  // Cutaneous lymphoma / hematologic disease
  "Mycosis fungoides (MF)", "Sézary syndrome", "CD30+ lymphoproliferative disorders",
  "Lymphomatoid papulosis", "Primary cutaneous anaplastic large-cell lymphoma",
  "Primary cutaneous B-cell lymphoma", "Extranodal NK/T-cell lymphoma",
  "Adult T-cell leukemia/lymphoma", "Leukemia cutis", "Plasmacytoma",
  "Cutaneous involvement by systemic lymphoma",

  // Dermatologic emergencies / inpatient dermatology
  "SJS/TEN", "Pemphigus crisis", "Severe bullous pemphigoid", "Meningococcemia",
  "Purpura fulminans", "Disseminated HSV", "Severe drug eruption",
  "Acute graft-versus-host disease", "Severe vasculitis",

  // Wounds, ulcers and dressings
  "Venous ulcers", "Arterial ulcers", "Diabetic ulcers", "Pressure ulcers",
  "Neuropathic ulcers", "Vasculitic ulcers", "Malignant wounds", "Atypical ulcers",
  "Dressings", "Compression therapy", "Debridement", "Infection assessment",

  // Dermatopathology
  "Normal histology", "Reaction patterns", "Spongiotic dermatitis",
  "Psoriasiform dermatitis", "Interface/lichenoid dermatitis", "Vesiculobullous patterns",
  "Acantholytic disorders", "Granulomatous inflammation", "Panniculitis",
  "Alopecia pathology", "Infectious pathology", "Pigmentary pathology",
  "Melanocytic neoplasia", "Keratinocytic neoplasia", "Adnexal tumors",
  "Soft-tissue tumors", "Lymphoma", "Special stains", "Immunohistochemistry",
  "Direct immunofluorescence", "Indirect immunofluorescence", "Molecular diagnostics",
  "Clinicopathologic correlation",

  // Diagnostic procedures
  "Shave biopsy", "Punch biopsy", "Incisional biopsy", "Excisional biopsy",
  "Nail biopsy", "Scalp biopsy", "Mucosal biopsy", "KOH preparation",
  "Mineral-oil preparation", "Tzanck smear", "Bacterial culture", "Fungal culture",
  "Viral testing", "Wood lamp", "DIF biopsy",

  // Dermatologic surgery
  "Surgical anatomy", "Sterile technique", "Local anesthesia", "Hemostasis",
  "Electrosurgery", "Curettage", "Cryosurgery", "Shave removal", "Excision",
  "Wedge excision", "Simple closure", "Layered closure", "Complex closure",
  "Flaps", "Grafts", "Second-intention healing", "Nail surgery", "Scar revision",
  "Surgical complications", "Wound care", "Perioperative management",

  // Mohs surgery / dermatologic oncology
  "Mohs indications", "Mohs technique", "Mohs mapping", "Frozen-section interpretation",
  "High-risk tumors", "Reconstruction", "Complication management",

  // Lasers and energy-based devices
  "Laser physics", "Selective photothermolysis", "Vascular lasers", "Pigment lasers",
  "Hair-removal lasers", "Ablative lasers", "Nonablative lasers", "Fractional lasers",
  "IPL", "Radiofrequency", "Energy devices", "Laser safety", "Laser complications",
  "Laser treatment in darker skin tones",

  // Cosmetic dermatology
  "Botulinum toxin", "Soft-tissue fillers", "Chemical peels", "Dermabrasion",
  "Microneedling", "Liposuction", "Sclerotherapy", "Scar treatment",
  "Hair transplantation", "Cosmetic lasers", "Skin resurfacing",
  "Treatment of dyspigmentation", "Cosmetic complications",

  // Phototherapy / physical therapies
  "Narrow-band UVB", "Broadband UVB", "UVA", "PUVA", "Excimer",
  "Photodynamic therapy", "Cryotherapy", "Iontophoresis", "Radiotherapy in dermatology",

  // Dermatologic pharmacology / therapeutics
  "Topical corticosteroids", "Topical calcineurin inhibitors", "Topical retinoids",
  "Keratolytics", "Emollients/barrier agents", "Antimicrobials", "Antifungals",
  "Antivirals", "Antiparasitics", "Systemic corticosteroids", "Methotrexate",
  "Cyclosporine", "Azathioprine", "Mycophenolate", "Dapsone", "Hydroxychloroquine",
  "Colchicine", "Retinoids", "Isotretinoin", "Acitretin", "Biologics", "TNF inhibitors",
  "IL-12/23 inhibitors", "IL-17 inhibitors", "IL-23 inhibitors", "IL-4/13 inhibitors",
  "JAK inhibitors", "PDE4 inhibitors", "BTK/other emerging targeted therapies", "IVIG",
  "Rituximab", "Omalizumab", "Dupilumab", "Systemic antifungals",
  "Immunotherapy/oncologic agents", "Medication monitoring", "Drug interactions",
  "Pregnancy/lactation pharmacology",

  // Skin of color / diverse skin presentations
  "Normal variation across skin pigmentation", "Erythema recognition", "Pallor",
  "Cyanosis", "Scaling", "Dyspigmentation", "Acne and acne sequelae", "Fungal disease",
  "Hair/scalp disorders", "CCCA", "Acral melanoma", "Delayed skin-cancer recognition",
  "Cosmetic/laser considerations", "Cultural hair and skin practices",
  "Skin-lightening practices", "Diagnostic equity",

  // Other populations and contexts
  "Neonatal dermatology", "Adolescent dermatology", "Transgender dermatology",
  "Immunocompromised patients", "Organ-transplant patients", "Oncology patients",
  "Ethnically and culturally diverse populations", "Indigenous dermatology",
  "Migrant/refugee dermatology", "Global/tropical dermatology",

  // Teledermatology and digital dermatology
  "Store-and-forward teledermatology", "Live teledermatology", "Clinical photography",
  "Image quality", "Smartphone imaging", "Dermoscopy imaging", "AI-assisted diagnosis",
  "Machine learning", "Digital pathology", "Remote monitoring", "Privacy and consent",
  "Bias in dermatologic AI", "Performance across skin tones",

  // Research / evidence-based dermatology
  "Study design", "Randomized trials", "Cohort studies", "Case-control studies",
  "Diagnostic-accuracy studies", "Systematic reviews/meta-analysis", "Biostatistics",
  "Critical appraisal", "Clinical guidelines", "Outcomes research",
  "Quality-of-life measures", "Disease severity scores", "PASI", "EASI/SCORAD",
  "SCORAD", "DLQI", "Hurley staging", "SALT", "UAS7", "Investigator Global Assessment",
  "Research ethics", "Clinical trials", "Registries", "Pharmacovigilance",

  // Professional / systems subjects
  "Inpatient consultation", "Community dermatology", "Primary-care interface",
  "Referral/triage", "Multidisciplinary care", "Patient education", "Prevention",
  "Sun protection", "Skin-cancer screening", "Communication", "Shared decision-making",
  "Quality improvement", "Patient safety", "Ethics", "Consent",
  "Medical photography consent", "Cultural responsiveness", "Health disparities/equity",
  "Coding/billing where relevant", "Practice management", "Health economics",
  "Teaching", "Leadership",
];

const seen = new Set<string>();
export const DERM_TOPICS: string[] = RAW_TOPICS.filter((t) => {
  const key = t.trim().toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
