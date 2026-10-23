-- =============================================================================
-- RISCE · Nos talents — schéma cible PostgreSQL 16 + PostGIS 3
-- Le module « talents » COMPLÈTE la base des membres du RISCE : il référence
-- l'identifiant du membre (RISCE Manager) sans dupliquer l'identité.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- recherche approchée (fautes de frappe)
CREATE EXTENSION IF NOT EXISTS unaccent;    -- recherche insensible aux accents

CREATE SCHEMA IF NOT EXISTS ref;      -- référentiels partagés
CREATE SCHEMA IF NOT EXISTS talents;  -- profils, compétences, documents
CREATE SCHEMA IF NOT EXISTS workflow; -- circuit de validation
CREATE SCHEMA IF NOT EXISTS audit;    -- consentements et journal

-- -----------------------------------------------------------------------------
-- 0. Membres : table EXISTANTE côté RISCE (RISCE Manager).
--    Dans la cible, elle est soit la vraie table de l'outil d'adhésion (même base),
--    soit une table miroir alimentée par l'API de RISCE Manager.
--    Ce bloc n'est donné que pour rendre le script exécutable de bout en bout.
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS risce;
CREATE TABLE IF NOT EXISTS risce.membre (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_adherent  text UNIQUE,
  prenom           text NOT NULL,
  nom              text NOT NULL,
  email            text UNIQUE NOT NULL,
  type_membre      text NOT NULL CHECK (type_membre IN ('fondateur','actif','adherent','honneur')),
  mode_adhesion    text CHECK (mode_adhesion IN ('spontane','parrainage','honneur')),
  parrain_id       uuid REFERENCES risce.membre(id),
  date_adhesion    date,
  statut           text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif','suspendu','radie')),
  keycloak_sub     text UNIQUE            -- identifiant SSO (OpenID Connect)
);

-- -----------------------------------------------------------------------------
-- 1. Référentiels
-- -----------------------------------------------------------------------------
CREATE TABLE ref.zone (code text PRIMARY KEY, libelle text NOT NULL);

CREATE TABLE ref.pays (
  iso2     char(2) PRIMARY KEY,
  iso3     char(3) UNIQUE,
  nom_fr   text NOT NULL,
  zone     text REFERENCES ref.zone(code),
  geom     geometry(MultiPolygon, 4326)      -- Natural Earth 1:50m
);
CREATE INDEX ON ref.pays USING gist (geom);

CREATE TABLE ref.ville (
  id           serial PRIMARY KEY,
  geonames_id  integer UNIQUE,               -- identifiant GeoNames (CC-BY)
  nom          text NOT NULL,
  pays_iso2    char(2) NOT NULL REFERENCES ref.pays(iso2),
  population   integer,
  geom         geometry(Point, 4326) NOT NULL -- centroïde : seule position stockée
);
CREATE INDEX ON ref.ville USING gist (geom);
CREATE INDEX ON ref.ville USING gin (nom gin_trgm_ops);

-- Nomenclature métiers à 3 niveaux, alignée sur ISCO-08 (BIT) et ROME (France Travail)
CREATE TABLE ref.domaine (code text PRIMARY KEY, libelle text NOT NULL, couleur char(7), ordre smallint);
CREATE TABLE ref.filiere (
  id serial PRIMARY KEY, domaine_code text NOT NULL REFERENCES ref.domaine(code),
  libelle text NOT NULL, UNIQUE (domaine_code, libelle)
);
CREATE TABLE ref.metier (
  id serial PRIMARY KEY, filiere_id integer NOT NULL REFERENCES ref.filiere(id),
  libelle text NOT NULL, code_isco08 varchar(4), code_rome varchar(5), actif boolean DEFAULT true
);
CREATE TABLE ref.competence (id serial PRIMARY KEY, libelle text UNIQUE NOT NULL, domaine_code text REFERENCES ref.domaine(code));
CREATE TABLE ref.niveau_etudes (id smallserial PRIMARY KEY, libelle text UNIQUE NOT NULL, ordre smallint);
CREATE TABLE ref.secteur (id smallserial PRIMARY KEY, libelle text UNIQUE NOT NULL);
CREATE TABLE ref.programme (code text PRIMARY KEY, libelle text NOT NULL);          -- PPED, GBTC, PDC
CREATE TABLE ref.type_contribution (code text PRIMARY KEY, libelle text NOT NULL);  -- mentorat, recrutement…

-- -----------------------------------------------------------------------------
-- 2. Profils talents (1 profil par membre)
-- -----------------------------------------------------------------------------
CREATE TYPE talents.visibilite AS ENUM ('publique','membres','admin');
CREATE TYPE talents.publication AS ENUM ('brouillon','publie','suspendu','archive');

CREATE TABLE talents.profil (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membre_id          uuid UNIQUE NOT NULL REFERENCES risce.membre(id) ON DELETE CASCADE,
  ville_id           integer NOT NULL REFERENCES ref.ville(id),
  metier_id          integer NOT NULL REFERENCES ref.metier(id),
  experience_annees  smallint CHECK (experience_annees BETWEEN 0 AND 60),
  niveau_etudes_id   smallint REFERENCES ref.niveau_etudes(id),
  secteur_id         smallint REFERENCES ref.secteur(id),
  genre              char(1) CHECK (genre IN ('F','H','N')),   -- facultatif, statistiques de parité
  accroche           varchar(160),
  biographie         text,
  linkedin_url       text,
  visibilite         talents.visibilite NOT NULL DEFAULT 'membres',
  publication        talents.publication NOT NULL DEFAULT 'brouillon',
  cree_le            timestamptz NOT NULL DEFAULT now(),
  maj_le             timestamptz NOT NULL DEFAULT now(),
  recherche          tsvector                                   -- alimenté par trigger
);
CREATE INDEX ON talents.profil (ville_id);
CREATE INDEX ON talents.profil (metier_id);
CREATE INDEX ON talents.profil USING gin (recherche);

CREATE TABLE talents.profil_competence (
  profil_id uuid REFERENCES talents.profil(id) ON DELETE CASCADE,
  competence_id integer REFERENCES ref.competence(id),
  niveau smallint CHECK (niveau BETWEEN 1 AND 4),
  PRIMARY KEY (profil_id, competence_id)
);
CREATE TABLE talents.profil_langue (
  profil_id uuid REFERENCES talents.profil(id) ON DELETE CASCADE,
  langue_iso639 varchar(3),                -- fra, wol, eng, ful, srr, dyo…
  niveau_cecrl varchar(2),                 -- A1…C2 ou « LM » (langue maternelle)
  PRIMARY KEY (profil_id, langue_iso639)
);
CREATE TABLE talents.profil_contribution (
  profil_id uuid REFERENCES talents.profil(id) ON DELETE CASCADE,
  type_code text REFERENCES ref.type_contribution(code),
  programme_code text REFERENCES ref.programme(code),
  disponibilite text,                      -- ex. « 2 h / mois », « missions courtes »
  PRIMARY KEY (profil_id, type_code)
);
CREATE TABLE talents.experience (
  id serial PRIMARY KEY, profil_id uuid NOT NULL REFERENCES talents.profil(id) ON DELETE CASCADE,
  intitule text NOT NULL, organisation text, pays_iso2 char(2) REFERENCES ref.pays(iso2),
  debut date, fin date
);
CREATE TABLE talents.diplome (
  id serial PRIMARY KEY, profil_id uuid NOT NULL REFERENCES talents.profil(id) ON DELETE CASCADE,
  intitule text NOT NULL, etablissement text, pays_iso2 char(2) REFERENCES ref.pays(iso2), annee smallint
);
-- CV et pièces : le fichier vit dans MinIO (S3), la base ne garde que la référence
CREATE TABLE talents.document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid NOT NULL REFERENCES talents.profil(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('cv','portfolio','autre')),
  cle_objet text NOT NULL,                 -- clé dans le bucket MinIO
  nom_fichier text, taille_octets integer, sha256 char(64),
  depose_le timestamptz NOT NULL DEFAULT now()
);

-- Recherche plein texte (français, sans accents)
CREATE TEXT SEARCH CONFIGURATION talents.fr (COPY = french);
ALTER TEXT SEARCH CONFIGURATION talents.fr ALTER MAPPING FOR hword, hword_part, word WITH unaccent, french_stem;

CREATE FUNCTION talents.maj_recherche() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT setweight(to_tsvector('talents.fr', coalesce(m.libelle,'')), 'A') ||
         setweight(to_tsvector('talents.fr', coalesce(f.libelle,'') || ' ' || coalesce(d.libelle,'')), 'B') ||
         setweight(to_tsvector('talents.fr', coalesce(NEW.accroche,'') || ' ' || coalesce(NEW.biographie,'')), 'C')
    INTO NEW.recherche
    FROM ref.metier m JOIN ref.filiere f ON f.id = m.filiere_id JOIN ref.domaine d ON d.code = f.domaine_code
   WHERE m.id = NEW.metier_id;
  NEW.maj_le := now();
  RETURN NEW;
END $$;
CREATE TRIGGER profil_recherche BEFORE INSERT OR UPDATE ON talents.profil
  FOR EACH ROW EXECUTE FUNCTION talents.maj_recherche();

-- -----------------------------------------------------------------------------
-- 3. Circuit de validation des demandes de compte
-- -----------------------------------------------------------------------------
CREATE TYPE workflow.etape AS ENUM ('soumise','verif_referent','complement','validation_commission','activee','rejetee');

CREATE TABLE workflow.referent (                         -- périmètre géographique des référent·es
  membre_id uuid REFERENCES risce.membre(id),
  pays_iso2 char(2) REFERENCES ref.pays(iso2),
  PRIMARY KEY (membre_id, pays_iso2)
);
CREATE TABLE workflow.demande_compte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,                        -- ex. D-2026-00123
  membre_id uuid REFERENCES risce.membre(id),            -- renseigné à l'activation
  donnees_soumises jsonb NOT NULL,                       -- formulaire tel que déposé
  pays_iso2 char(2) NOT NULL REFERENCES ref.pays(iso2),
  etape workflow.etape NOT NULL DEFAULT 'soumise',
  referent_id uuid REFERENCES risce.membre(id),
  cree_le timestamptz NOT NULL DEFAULT now(),
  cloture_le timestamptz
);
CREATE INDEX ON workflow.demande_compte (etape, pays_iso2);

CREATE TABLE workflow.transition (
  id bigserial PRIMARY KEY,
  demande_id uuid NOT NULL REFERENCES workflow.demande_compte(id) ON DELETE CASCADE,
  de_etape workflow.etape, vers_etape workflow.etape NOT NULL,
  acteur_id uuid REFERENCES risce.membre(id),
  motif text,
  horodatage timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. Conformité : consentements (loi 2008-12 / RGPD) et journal des accès
-- -----------------------------------------------------------------------------
CREATE TABLE audit.consentement (
  id bigserial PRIMARY KEY,
  membre_id uuid NOT NULL REFERENCES risce.membre(id) ON DELETE CASCADE,
  finalite text NOT NULL,                  -- 'annuaire_talents', 'mise_en_relation', 'statistiques'
  version_texte text NOT NULL,
  donne_le timestamptz NOT NULL DEFAULT now(),
  retire_le timestamptz
);
CREATE TABLE audit.journal (
  id bigserial PRIMARY KEY,
  acteur_id uuid REFERENCES risce.membre(id),
  action text NOT NULL,                    -- 'consultation_cv', 'export', 'validation', 'changement_visibilite'…
  objet text NOT NULL, objet_id text,
  details jsonb,
  ip_hash char(64),                        -- adresse IP hachée, jamais en clair
  horodatage timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON audit.journal (objet, objet_id);

-- -----------------------------------------------------------------------------
-- 5. Vues publiques : agrégats sans identité (carte, globe, tableau de bord)
-- -----------------------------------------------------------------------------
CREATE VIEW talents.v_effectifs_ville AS
SELECT v.id AS ville_id, v.nom, v.pays_iso2, v.geom, d.code AS domaine_code, count(*) AS effectif
  FROM talents.profil p
  JOIN ref.ville v ON v.id = p.ville_id
  JOIN ref.metier m ON m.id = p.metier_id
  JOIN ref.filiere f ON f.id = m.filiere_id
  JOIN ref.domaine d ON d.code = f.domaine_code
 WHERE p.publication = 'publie'
 GROUP BY v.id, v.nom, v.pays_iso2, v.geom, d.code;

CREATE VIEW talents.v_effectifs_pays AS
SELECT pays_iso2, domaine_code, sum(effectif) AS effectif
  FROM talents.v_effectifs_ville GROUP BY pays_iso2, domaine_code;

-- Annuaire visible selon le rôle (la sécurité fine est assurée par RLS ci-dessous)
CREATE VIEW talents.v_annuaire AS
SELECT p.id, mb.prenom, mb.nom, left(mb.nom, 1) || '.' AS nom_initiale,
       m.libelle AS metier, f.libelle AS filiere, d.libelle AS domaine,
       v.nom AS ville, v.pays_iso2, p.experience_annees, p.visibilite, p.recherche
  FROM talents.profil p
  JOIN risce.membre mb ON mb.id = p.membre_id
  JOIN ref.ville v ON v.id = p.ville_id
  JOIN ref.metier m ON m.id = p.metier_id
  JOIN ref.filiere f ON f.id = m.filiere_id
  JOIN ref.domaine d ON d.code = f.domaine_code
 WHERE p.publication = 'publie' AND mb.statut = 'actif';

-- Sécurité au niveau des lignes : le rôle applicatif transmet le rôle Keycloak
-- via SET app.role = 'visiteur' | 'membre' | 'referent' | 'admin'
ALTER TABLE talents.profil ENABLE ROW LEVEL SECURITY;
CREATE POLICY profil_lecture ON talents.profil FOR SELECT USING (
  current_setting('app.role', true) = 'admin'
  OR (current_setting('app.role', true) IN ('membre','referent') AND visibilite IN ('publique','membres'))
  OR visibilite = 'publique'
);
