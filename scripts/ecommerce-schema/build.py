import os
HERE = os.path.dirname(os.path.abspath(__file__))
import sys
sys.argv = [sys.argv[0]]
exec(open(os.path.join(HERE, "render.py"), encoding="utf-8").read().split('if __name__')[0])
KIND = {"table": "table", "transitoire": "modèle transitoire (assistant)", "abstrait": "modèle abstrait", "vue": "vue SQL"}
head = ["# Schéma de données PostgreSQL — template e-commerce Odoo", "",
        "Document généré depuis le code source Odoo (extraction statique, sans base de données). "
        "%d modèles du périmètre e-commerce, dans l'ordre alphabétique." % len(S), "",
        "**Lecture** : chaque section décrit une table. Les colonnes `id`, `create_uid`, `create_date`, `write_uid`, `write_date` "
        "sont ajoutées par l'ORM. `ON DELETE … (défaut ORM)` signifie que le code ne le déclare pas et que l'ORM applique sa règle par défaut. "
        "Les champs JSON stockent soit une valeur par langue, soit une valeur par société, soit des données structurées. Une table de relation apparaît dans la section de chaque modèle qui la déclare, avec ses deux colonnes dans l'ordre de ce modèle.", ""]
body = []
for t in sorted(S):
    k = M[t]["kind"]
    sec = section(t)
    if k != "table": sec = sec.replace("\n", "\n\n*Type : %s.*\n" % KIND[k], 1) if False else sec.split("\n", 1)[0] + "\n\n*Type : %s.*\n" % KIND[k] + sec.split("\n", 1)[1]
    if k in ("abstrait", "vue"):
        x = M[t]; note = {"abstrait": "Pas de table propre : ces champs sont copiés dans la table de chaque modèle qui hérite de celui-ci.",
                          "vue": "Vue SQL (`_auto = False`) : les colonnes réelles viennent de la requête de la vue. Le tableau liste les champs Python déclarés."}[k]
        hdr = "## %s — %s" % (t, "aucune table" if k == "abstrait" else "vue `%s`" % x["table"])
        lines = [hdr, "", "*Type : %s.*" % KIND[k], "", note, ""]
        if x["cols"]:
            lines += ["| Champ | Type | Remarque |", "|---|---|---|"]
            for c in x["cols"]:
                ty = ("référence → `%s`" % c[1][1:]) if c[1].startswith("→") else SQL.get(c[1], c[1])
                rem = JB.get(c[5], "") if c[1] == "jsonb" and len(c) > 5 else ""
                lines.append("| `%s` | %s | %s |" % (c[0], ty, rem))
        else: lines.append("Aucun champ stocké déclaré.")
        sec = "\n".join(lines) + "\n"
    body.append(sec)
TR = "index GIST trigramme (recherche floue e-commerce), définition calculée à l'exécution : "
TR += "`USING GIST(unaccent((JSONB_PATH_QUERY_ARRAY(%s, '$.*'::jsonpath))::text) gist_trgm_ops)` si `unaccent` est indexable, "
TR += "sinon `USING GIST((JSONB_PATH_QUERY_ARRAY(%s, '$.*'::jsonpath)::text) gist_trgm_ops)` ; aucun index si `pg_trgm` est absent"
DC = "index GIST trigramme (recherche floue e-commerce), définition calculée à l'exécution : `USING GIST(unaccent(default_code) gist_trgm_ops)` si `unaccent` est indexable, sinon `USING GIST(default_code gist_trgm_ops)` ; aucun index si `pg_trgm` est absent"
txt = "\n".join(head + body)
for f in ("name", "description", "description_sale", "description_ecommerce"):
    old = "- `%s_gist_idx` : `<expr>`" % f
    assert txt.count(old) == 1, f
    txt = txt.replace(old, "- `%s_gist_idx` : %s" % (f, TR % (f, f)))
old = "- `default_code_gist_idx` : `<expr>`"
assert txt.count(old) == 1
txt = txt.replace(old, "- `default_code_gist_idx` : " + DC)
assert "<expr>" not in txt, "reste <expr>"
open("docs/ecommerce/SCHEMA-DONNEES.md", "w", encoding="utf-8").write(txt)
