#!/usr/bin/env python3
"""Génère les données de démonstration du prototype « Nos talents » (RISCE).

Toutes les personnes sont FICTIVES (combinaisons aléatoires de prénoms et noms
courants). Les localisations sont volontairement ramenées au centroïde de la
ville de résidence : aucune adresse n'est stockée ni affichée.

Usage : python3 scripts/generer_donnees_demo.py  (sortie dans data/)
"""
import json, random, datetime, unicodedata, pathlib

random.seed(221)  # indicatif du Sénégal, pour une génération reproductible
OUT = pathlib.Path(__file__).resolve().parent.parent / "data"

# --------------------------------------------------------------------------
# Référentiel métiers : domaine > filière > métiers (codes alignables sur
# ISCO-08 / ROME dans la version cible, cf. docs/MODELE_DONNEES.md)
# --------------------------------------------------------------------------
DOMAINES = [
    ("NUM", "Numérique & data", "#2F6FB0", {
        "Développement logiciel": ["Développeur·se full-stack", "Architecte logiciel", "Ingénieur·e DevOps", "Lead développeur·se"],
        "Data & IA": ["Data scientist", "Data engineer", "Ingénieur·e IA / ML", "Analyste BI"],
        "Cybersécurité & réseaux": ["Expert·e cybersécurité", "Ingénieur·e réseaux", "RSSI"],
    }),
    ("GEO", "Géomatique, territoires & urbanisme", "#1F8A70", {
        "Géomatique & SIG": ["Ingénieur·e géomaticien·ne", "Administrateur·rice SIG", "Développeur·se WebSIG", "Géomètre-topographe"],
        "Aménagement & urbanisme": ["Urbaniste", "Chargé·e de mission aménagement", "Ingénieur·e territorial·e"],
    }),
    ("SAN", "Santé & sciences de la vie", "#C2410C", {
        "Médecine": ["Médecin généraliste", "Médecin spécialiste", "Chirurgien·ne", "Pharmacien·ne"],
        "Soins & santé publique": ["Infirmier·ère", "Épidémiologiste", "Cadre de santé"],
        "Biotechnologies": ["Chercheur·se en biologie", "Ingénieur·e biomédical·e"],
    }),
    ("FIN", "Finance, banque & assurance", "#B08A1E", {
        "Banque & marchés": ["Analyste financier·ère", "Chargé·e d'affaires", "Trader", "Risk manager"],
        "Audit & comptabilité": ["Auditeur·rice", "Expert·e-comptable", "Contrôleur·se de gestion", "Directeur·rice financier·ère"],
        "Fintech & microfinance": ["Product manager fintech", "Spécialiste microfinance"],
    }),
    ("ING", "Ingénierie & industrie", "#475569", {
        "Génie industriel": ["Ingénieur·e méthodes", "Responsable production", "Ingénieur·e qualité"],
        "Mécanique & aéronautique": ["Ingénieur·e mécanique", "Ingénieur·e aéronautique"],
    }),
    ("ENE", "Énergie, mines & environnement", "#0E7490", {
        "Énergies renouvelables": ["Ingénieur·e solaire", "Chef·fe de projet éolien", "Ingénieur·e réseaux électriques"],
        "Pétrole, gaz & mines": ["Ingénieur·e pétrolier·ère", "Géologue", "Ingénieur·e des mines"],
        "Climat & environnement": ["Expert·e climat", "Ingénieur·e environnement", "Hydrologue"],
    }),
    ("BTP", "BTP & infrastructures", "#9A3412", {
        "Génie civil": ["Ingénieur·e structure", "Conducteur·rice de travaux", "Ingénieur·e ouvrages d'art"],
        "Architecture": ["Architecte", "BIM manager"],
        "Transport & mobilité": ["Ingénieur·e transport", "Planificateur·rice mobilité"],
    }),
    ("AGR", "Agriculture & agro-industrie", "#4D7C0F", {
        "Agronomie": ["Ingénieur·e agronome", "Spécialiste irrigation", "Chercheur·se en agronomie"],
        "Agro-alimentaire": ["Ingénieur·e agro-alimentaire", "Responsable qualité alimentaire"],
    }),
    ("EDU", "Éducation, recherche & formation", "#7C3AED", {
        "Enseignement supérieur & recherche": ["Enseignant·e-chercheur·se", "Maître de conférences", "Post-doctorant·e"],
        "Formation": ["Formateur·rice", "Ingénieur·e pédagogique", "Professeur·e"],
    }),
    ("DRO", "Droit, gouvernance & politiques publiques", "#334155", {
        "Droit": ["Avocat·e", "Juriste d'affaires", "Juriste en droit international"],
        "Administration & coopération": ["Cadre de la fonction publique", "Chargé·e de coopération internationale", "Diplomate"],
    }),
    ("ENT", "Commerce, entrepreneuriat & conseil", "#DB2777", {
        "Entrepreneuriat": ["Fondateur·rice de start-up", "Chef·fe d'entreprise", "Investisseur·se / business angel"],
        "Conseil & management": ["Consultant·e en stratégie", "Chef·fe de projet", "Directeur·rice des opérations"],
        "Commerce & marketing": ["Responsable marketing", "Business developer", "Responsable commercial·e"],
    }),
    ("LOG", "Logistique, transport & supply chain", "#57534E", {
        "Supply chain": ["Responsable supply chain", "Acheteur·se international·e", "Responsable logistique"],
        "Aérien & maritime": ["Pilote de ligne", "Officier·ère de marine marchande"],
    }),
    ("COM", "Communication, médias & culture", "#BE123C", {
        "Médias": ["Journaliste", "Chargé·e de communication", "Producteur·rice audiovisuel·le"],
        "Arts & industries culturelles": ["Designer", "Architecte d'intérieur", "Directeur·rice artistique"],
    }),
    ("RH", "Ressources humaines & social", "#0F766E", {
        "Ressources humaines": ["DRH", "Chargé·e de recrutement", "Responsable formation"],
        "Économie sociale & solidaire": ["Chef·fe de projet ONG", "Travailleur·se social·e"],
    }),
]

# Villes de résidence : (nom, iso2, lat, lon, poids)
VILLES = [
    ("Paris", "FR", 48.8566, 2.3522, 60), ("Lyon", "FR", 45.764, 4.8357, 12), ("Marseille", "FR", 43.2965, 5.3698, 8),
    ("Lille", "FR", 50.6292, 3.0573, 6), ("Toulouse", "FR", 43.6047, 1.4442, 7), ("Bordeaux", "FR", 44.8378, -0.5792, 6),
    ("Dijon", "FR", 47.322, 5.0415, 5), ("Strasbourg", "FR", 48.5734, 7.7521, 4), ("Nantes", "FR", 47.2184, -1.5536, 5),
    ("Montpellier", "FR", 43.6108, 3.8767, 5), ("Rouen", "FR", 49.4432, 1.0999, 3), ("Grenoble", "FR", 45.1885, 5.7245, 3),
    ("Auxerre", "FR", 47.7982, 3.5673, 2), ("Le Havre", "FR", 49.4944, 0.1079, 2), ("Reims", "FR", 49.2583, 4.0317, 2),
    ("Bruxelles", "BE", 50.8503, 4.3517, 6), ("Liège", "BE", 50.6326, 5.5797, 2), ("Genève", "CH", 46.2044, 6.1432, 4),
    ("Lausanne", "CH", 46.5197, 6.6323, 2), ("Luxembourg", "LU", 49.6116, 6.1319, 2), ("Berlin", "DE", 52.52, 13.405, 3),
    ("Francfort", "DE", 50.1109, 8.6821, 2), ("Amsterdam", "NL", 52.3676, 4.9041, 2), ("Londres", "GB", 51.5074, -0.1278, 7),
    ("Manchester", "GB", 53.4808, -2.2426, 2), ("Madrid", "ES", 40.4168, -3.7038, 5), ("Barcelone", "ES", 41.3874, 2.1686, 4),
    ("Milan", "IT", 45.4642, 9.19, 5), ("Rome", "IT", 41.9028, 12.4964, 3), ("Turin", "IT", 45.0703, 7.6869, 2),
    ("Lisbonne", "PT", 38.7223, -9.1393, 2), ("Stockholm", "SE", 59.3293, 18.0686, 1),
    ("Montréal", "CA", 45.5017, -73.5673, 12), ("Québec", "CA", 46.8139, -71.208, 4), ("Ottawa", "CA", 45.4215, -75.6972, 3),
    ("Toronto", "CA", 43.6532, -79.3832, 4), ("New York", "US", 40.7128, -74.006, 8), ("Washington", "US", 38.9072, -77.0369, 5),
    ("Atlanta", "US", 33.749, -84.388, 3), ("Houston", "US", 29.7604, -95.3698, 3), ("Chicago", "US", 41.8781, -87.6298, 2),
    ("Boston", "US", 42.3601, -71.0589, 2), ("San Francisco", "US", 37.7749, -122.4194, 2), ("São Paulo", "BR", -23.5505, -46.6333, 1),
    ("Casablanca", "MA", 33.5731, -7.5898, 4), ("Rabat", "MA", 34.0209, -6.8416, 2), ("Tunis", "TN", 36.8065, 10.1815, 1),
    ("Abidjan", "CI", 5.36, -4.0083, 5), ("Accra", "GH", 5.6037, -0.187, 1), ("Bamako", "ML", 12.6392, -8.0029, 1),
    ("Nouakchott", "MR", 18.0735, -15.9582, 1), ("Libreville", "GA", 0.4162, 9.4673, 1), ("Kigali", "RW", -1.9441, 30.0619, 1),
    ("Nairobi", "KE", -1.2921, 36.8219, 1), ("Johannesburg", "ZA", -26.2041, 28.0473, 2), ("Dubaï", "AE", 25.2048, 55.2708, 4),
    ("Doha", "QA", 25.2854, 51.531, 2), ("Istanbul", "TR", 41.0082, 28.9784, 1), ("Shanghai", "CN", 31.2304, 121.4737, 1),
    ("Tokyo", "JP", 35.6762, 139.6503, 1), ("Singapour", "SG", 1.3521, 103.8198, 1), ("Sydney", "AU", -33.8688, 151.2093, 1),
]

# Villes supplémentaires pour la recherche géographique (sans talent fictif)
VILLES_RECHERCHE = [
    ("Dakar", "SN", 14.7167, -17.4677), ("Thiès", "SN", 14.791, -16.9359), ("Saint-Louis", "SN", 16.0326, -16.4818),
    ("Ziguinchor", "SN", 12.5681, -16.2719), ("Kaolack", "SN", 14.1652, -16.0726), ("Touba", "SN", 14.8667, -15.8833),
    ("Tambacounda", "SN", 13.7707, -13.6673), ("Nice", "FR", 43.7102, 7.262), ("Rennes", "FR", 48.1173, -1.6778),
    ("Orléans", "FR", 47.9029, 1.9093), ("Besançon", "FR", 47.2378, 6.0241), ("Clermont-Ferrand", "FR", 45.7772, 3.087),
    ("Saint-Étienne", "FR", 45.4397, 4.3872), ("Le Mans", "FR", 48.0061, 0.1996), ("Metz", "FR", 49.1193, 6.1757),
    ("Nancy", "FR", 48.6921, 6.1844), ("Angers", "FR", 47.4784, -0.5632), ("Poitiers", "FR", 46.5802, 0.3404),
    ("Anvers", "BE", 51.2194, 4.4025), ("Zurich", "CH", 47.3769, 8.5417), ("Munich", "DE", 48.1351, 11.582),
    ("Hambourg", "DE", 53.5511, 9.9937), ("Bruxelles-Capitale", "BE", 50.8503, 4.3517), ("Naples", "IT", 40.8518, 14.2681),
    ("Bologne", "IT", 44.4949, 11.3426), ("Séville", "ES", 37.3891, -5.9845), ("Valence", "ES", 39.4699, -0.3763),
    ("Porto", "PT", 41.1579, -8.6291), ("Édimbourg", "GB", 55.9533, -3.1883), ("Dublin", "IE", 53.3498, -6.2603),
    ("Vancouver", "CA", 49.2827, -123.1207), ("Calgary", "CA", 51.0447, -114.0719), ("Los Angeles", "US", 34.0522, -118.2437),
    ("Miami", "US", 25.7617, -80.1918), ("Philadelphie", "US", 39.9526, -75.1652), ("Seattle", "US", 47.6062, -122.3321),
    ("Lagos", "NG", 6.5244, 3.3792), ("Le Caire", "EG", 30.0444, 31.2357), ("Banjul", "GM", 13.4549, -16.579),
    ("Conakry", "GN", 9.6412, -13.5784), ("Praia", "CV", 14.933, -23.5133), ("Lomé", "TG", 6.1319, 1.2228),
    ("Cotonou", "BJ", 6.3703, 2.3912), ("Ouagadougou", "BF", 12.3714, -1.5197), ("Niamey", "NE", 13.5116, 2.1254),
    ("Yaoundé", "CM", 3.848, 11.5021), ("Douala", "CM", 4.0511, 9.7679), ("Kinshasa", "CD", -4.4419, 15.2663),
    ("Addis-Abeba", "ET", 9.03, 38.74), ("Riyad", "SA", 24.7136, 46.6753), ("Abou Dabi", "AE", 24.4539, 54.3773),
    ("Pékin", "CN", 39.9042, 116.4074), ("Séoul", "KR", 37.5665, 126.978), ("Mumbai", "IN", 19.076, 72.8777),
    ("Melbourne", "AU", -37.8136, 144.9631), ("Mexico", "MX", 19.4326, -99.1332), ("Buenos Aires", "AR", -34.6037, -58.3816),
    ("Moscou", "RU", 55.7558, 37.6173), ("Varsovie", "PL", 52.2297, 21.0122), ("Vienne", "AT", 48.2082, 16.3738),
    ("Copenhague", "DK", 55.6761, 12.5683), ("Oslo", "NO", 59.9139, 10.7522), ("Helsinki", "FI", 60.1699, 24.9384),
    ("Athènes", "GR", 37.9838, 23.7275), ("Prague", "CZ", 50.0755, 14.4378),
]

PRENOMS_F = ["Aminata", "Fatou", "Awa", "Khadija", "Ndeye", "Aïssatou", "Mariama", "Seynabou", "Coumba", "Astou",
             "Bineta", "Rokhaya", "Dieynaba", "Yacine", "Khady", "Mame Diarra", "Sokhna", "Arame", "Maïmouna", "Fatoumata",
             "Adja", "Ndèye Fatou", "Oumou", "Penda", "Nafissatou", "Racky", "Soda", "Marème", "Daba", "Ramatoulaye"]
PRENOMS_H = ["Moussa", "Mamadou", "Ibrahima", "Cheikh", "Ousmane", "Abdoulaye", "Babacar", "Modou", "Pape", "Lamine",
             "Serigne", "Malick", "Souleymane", "Adama", "Oumar", "Thierno", "Saliou", "Djibril", "Alioune", "Mouhamed",
             "El Hadji", "Aliou", "Idrissa", "Boubacar", "Assane", "Demba", "Samba", "Birame", "Khadim", "Amadou"]
NOMS = ["Diop", "Ndiaye", "Fall", "Sow", "Ba", "Diallo", "Sarr", "Faye", "Gueye", "Seck", "Mbaye", "Thiam", "Cissé",
        "Kane", "Dieng", "Ndour", "Sy", "Wade", "Niang", "Diouf", "Camara", "Touré", "Sène", "Mbengue", "Badji", "Sagna",
        "Diatta", "Tall", "Lo", "Kébé", "Samb", "Ngom", "Mendy", "Goudiaby", "Dramé", "Konaté", "Bâ", "Thiaw", "Coly"]

SECTEURS = ["Grand groupe", "PME / ETI", "Start-up", "Secteur public", "Collectivité territoriale",
            "Organisation internationale", "ONG / association", "Université / recherche", "Indépendant·e / cabinet", "Établissement de santé"]
NIVEAUX = ["Bac+2/3", "Bac+5 / Master", "Ingénieur·e", "Doctorat", "MBA / Executive"]
LANGUES = ["Français", "Wolof", "Anglais", "Espagnol", "Pulaar", "Sérère", "Diola", "Italien", "Allemand", "Portugais", "Arabe", "Mandingue"]
STATUTS = [("Membre actif", 60), ("Membre adhérent", 30), ("Membre fondateur", 6), ("Membre d'honneur", 2)]
CONTRIBUTIONS = ["Mentorat (Give Back)", "Recrutement / PPED", "Missions d'expertise", "Investissement", "Formation / conférences", "Accueil de stagiaires"]
COMPETENCES = {
    "NUM": ["Python", "JavaScript", "Cloud", "Kubernetes", "SQL", "Machine learning", "API REST", "Sécurité"],
    "GEO": ["QGIS", "PostGIS", "WebSIG", "Télédétection", "Cartographie", "Aménagement", "Foncier"],
    "SAN": ["Santé publique", "Recherche clinique", "Épidémiologie", "Télémédecine", "Gestion hospitalière"],
    "FIN": ["Modélisation financière", "Conformité", "Audit", "Microfinance", "Mobile money", "Levée de fonds"],
    "ING": ["Lean", "Qualité", "Maintenance", "CAO", "Gestion de production"],
    "ENE": ["Photovoltaïque", "Réseaux électriques", "Hydrocarbures", "Bilan carbone", "Gestion de l'eau"],
    "BTP": ["BIM", "Génie civil", "Maîtrise d'œuvre", "Routes", "Assainissement"],
    "AGR": ["Irrigation", "Agro-écologie", "Chaîne de valeur", "Transformation"],
    "EDU": ["Pédagogie", "Recherche", "E-learning", "Direction de thèse"],
    "DRO": ["Droit des affaires", "OHADA", "Marchés publics", "Coopération", "Plaidoyer"],
    "ENT": ["Stratégie", "Business plan", "Gestion de projet", "Négociation", "Export"],
    "LOG": ["Supply chain", "Transport international", "Douane", "Achats"],
    "COM": ["Communication", "Design graphique", "Production vidéo", "Réseaux sociaux"],
    "RH": ["Recrutement", "Gestion des talents", "Formation", "Management interculturel"],
}

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-")

def wchoice(pairs):
    return random.choices([p[0] for p in pairs], [p[1] for p in pairs])[0]

def gen_talents(n=300):
    talents, used = [], set()
    ville_poids = [(v, v[4]) for v in VILLES]
    # pondération des domaines (la diaspora qualifiée est très présente dans le numérique, la santé, la finance)
    dom_poids = {"NUM": 16, "SAN": 12, "FIN": 11, "ENT": 11, "ING": 7, "EDU": 8, "GEO": 5, "ENE": 6, "BTP": 6,
                 "DRO": 6, "AGR": 4, "LOG": 4, "COM": 4, "RH": 4}
    for i in range(1, n + 1):
        genre = random.choice("FH")
        while True:
            prenom = random.choice(PRENOMS_F if genre == "F" else PRENOMS_H)
            nom = random.choice(NOMS)
            if (prenom, nom) not in used:
                used.add((prenom, nom)); break
        v = wchoice(ville_poids)
        dcode = random.choices(list(dom_poids), list(dom_poids.values()))[0]
        dom = next(d for d in DOMAINES if d[0] == dcode)
        filiere = random.choice(list(dom[3]))
        metier = random.choice(dom[3][filiere])
        annees = max(1, int(random.gauss(11, 6)))
        langs = ["Français"] + random.sample(["Wolof"] * 3 + ["Anglais"] * 3 + LANGUES[3:], 3)
        langs = list(dict.fromkeys(langs))
        if v[1] in ("ES", "IT", "DE", "PT") :
            local = {"ES": "Espagnol", "IT": "Italien", "DE": "Allemand", "PT": "Portugais"}[v[1]]
            if local not in langs: langs.append(local)
        if v[1] in ("US", "GB", "CA", "AE", "QA", "SG", "AU", "ZA", "KE", "GH") and "Anglais" not in langs:
            langs.append("Anglais")
        adhesion = datetime.date(2022, 3, 1) + datetime.timedelta(days=random.randint(0, 1600))
        if adhesion > datetime.date(2026, 10, 15):
            adhesion = datetime.date(2026, 10, 15) - datetime.timedelta(days=random.randint(0, 200))
        contribs = random.sample(CONTRIBUTIONS, random.choice([1, 1, 2, 2, 3]))
        comp = random.sample(COMPETENCES[dcode], min(4, len(COMPETENCES[dcode])))
        visibilite = random.choices(["publique", "membres", "membres"], [1, 1, 1])[0]
        talents.append({
            "id": f"T{i:04d}",
            "prenom": prenom, "nom": nom, "genre": genre,
            "ville": v[0], "pays": v[1], "lat": v[2], "lon": v[3],
            "domaine": dcode, "filiere": filiere, "metier": metier,
            "secteur": random.choice(SECTEURS), "niveau": random.choices(NIVEAUX, [1, 4, 3, 2, 1])[0],
            "experience": annees, "langues": langs, "competences": comp,
            "contributions": contribs,
            "statut": wchoice(STATUTS), "adhesion": adhesion.isoformat(),
            "cv": random.random() < 0.82, "visibilite": visibilite,
            "accroche": f"{metier} · {annees} ans d'expérience · {random.choice(SECTEURS).lower()}",
        })
    return talents

def gen_demandes(talents):
    etapes = ["soumise", "soumise", "soumise", "verif_referent", "verif_referent", "verif_referent",
              "validation_commission", "validation_commission", "complement", "soumise", "verif_referent", "validation_commission",
              "soumise", "rejetee"]
    demandes = []
    used = {(t["prenom"], t["nom"]) for t in talents}
    for i, etape in enumerate(etapes, 1):
        genre = random.choice("FH")
        while True:
            p, n = random.choice(PRENOMS_F if genre == "F" else PRENOMS_H), random.choice(NOMS)
            if (p, n) not in used: used.add((p, n)); break
        v = random.choice(VILLES[:40])
        dom = random.choice(DOMAINES); fil = random.choice(list(dom[3])); met = random.choice(dom[3][fil])
        jours = random.randint(1, 24)
        demandes.append({
            "id": f"D{i:03d}", "prenom": p, "nom": n, "genre": genre,
            "email": f"{slug(p)}.{slug(n)}@exemple.org",
            "ville": v[0], "pays": v[1], "lat": v[2], "lon": v[3],
            "domaine": dom[0], "filiere": fil, "metier": met,
            "experience": random.randint(2, 22), "secteur": random.choice(SECTEURS),
            "parrain": random.choice(["", "", f"{random.choice(PRENOMS_H + PRENOMS_F)} {random.choice(NOMS)}"]),
            "date": (datetime.date(2026, 10, 23) - datetime.timedelta(days=jours)).isoformat(),
            "etape": etape, "cv": random.random() < 0.9,
            "historique": [{"date": (datetime.date(2026, 10, 23) - datetime.timedelta(days=jours)).isoformat(),
                            "action": "Demande déposée", "par": "Candidat·e"}],
        })
    return demandes

def main():
    talents = gen_talents()
    ref = {
        "domaines": [{"code": c, "libelle": l, "couleur": col,
                      "filieres": [{"libelle": f, "metiers": m} for f, m in fil.items()]}
                     for c, l, col, fil in DOMAINES],
        "secteurs": SECTEURS, "niveaux": NIVEAUX, "langues": LANGUES,
        "contributions": CONTRIBUTIONS, "statuts": [s for s, _ in STATUTS],
        "villes": [{"nom": n, "pays": p, "lat": la, "lon": lo} for n, p, la, lo, _ in VILLES]
                  + [{"nom": n, "pays": p, "lat": la, "lon": lo} for n, p, la, lo in VILLES_RECHERCHE],
    }
    OUT.mkdir(exist_ok=True)
    (OUT / "referentiels.json").write_text(json.dumps(ref, ensure_ascii=False, indent=1))
    (OUT / "talents.json").write_text(json.dumps(talents, ensure_ascii=False))
    (OUT / "demandes.json").write_text(json.dumps(gen_demandes(talents), ensure_ascii=False, indent=1))
    print(len(talents), "talents fictifs,", len({t['pays'] for t in talents}), "pays,", len({t['ville'] for t in talents}), "villes")

if __name__ == "__main__":
    main()
