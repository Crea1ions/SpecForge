import os
HERE = os.path.dirname(os.path.abspath(__file__))
import json, sys
D = json.load(open(os.path.join(HERE, "schema.json"))); M = D["models"]; S = D["scope"]
SQL = {"int4": "integer", "float8": "double precision", "bool": "boolean", "timestamp": "timestamp", "numeric": "numeric", "bytea": "bytea"}
JB = {"societe": "JSON : une valeur par société", "traduit": "JSON : une valeur par langue", "json": "JSON natif (données structurées)"}
def od_eff(kind, flags, declared):
    if declared: return declared, ""
    req = "!" in flags
    if kind == "transitoire" and req: return "cascade", " (défaut ORM)"
    return ("restrict" if req else "set null"), " (défaut ORM)"
def row(c, kind):
    n, ty, fl = c[0], c[1], c[2]; decl = c[4] if len(c) > 4 else ""
    cons, rem = [], []
    if "!" in fl: cons.append("NOT NULL")
    if "#" in fl: cons.append("indexé")
    if ty.startswith("→"):
        o, src = od_eff(kind, fl, decl)
        cons.append("FK → `%s`, ON DELETE %s%s" % (ty[1:], o.upper(), src)); ty = "integer"
    elif ty == "jsonb": rem.append(JB.get(c[5] if len(c) > 5 else "", "JSON"))
    else: ty = SQL.get(ty, ty)
    if "~" in fl: rem.append("stockage conditionnel")
    return "| `%s` | %s | %s | %s |" % (n, ty, ", ".join(cons), "; ".join(rem))
def section(t):
    x = M[t]; out = ["## %s — table `%s`" % (t, x["table"]), ""]
    out += ["| Colonne | Type | Contraintes | Remarque |", "|---|---|---|---|"]
    ci = "".join("; `%s` indexé (redéclaré dans `%s`)" % (c[0], c[3]) for c in x["cols"] if c[0] in ("create_date", "write_date") and "#" in c[2])
    if x["log"]:
        out += ["| `id` | serial | PK | |", "| `create_uid`, `write_uid` | integer | FK → `res_users` | colonnes automatiques |", "| `create_date`, `write_date` | timestamp | | colonnes automatiques" + ci + " |"]
    else: out.append("| `id` | serial | PK | |")
    auto = {"id", "create_uid", "write_uid", "create_date", "write_date"} if x["log"] else {"id"}
    out += [row(c, x["kind"]) for c in x["cols"] if c[0] not in auto]
    G = {}
    for r in x["rel"]: G.setdefault((r[1], r[2], r[3], r[4]), []).append(r[0])
    for (tb, c1, c2, tg), fl in G.items(): out += ["", "**Table de relation** `%s` (champ%s %s) : `%s` → `%s`, `%s` → `%s`." % (tb, "s" if len(fl) > 1 else "", ", ".join("`%s`" % f for f in fl), c1, x["table"], c2, tg)]
    if x["cons"]: out += ["", "**Contraintes**"] + ["- `%s` : `%s`" % (c[0], c[2]) for c in x["cons"]]
    if x["idx"]: out += ["", "**Index** (nom déclaré dans le code)"] + ["- `%s` : `%s`" % (c[0], c[2]) for c in x["idx"]]
    return "\n".join(out) + "\n"
if __name__ == "__main__":
    for t in (sys.argv[1:] or S): print(section(t))
