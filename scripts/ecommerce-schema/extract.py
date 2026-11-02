import os
HERE = os.path.dirname(os.path.abspath(__file__))
import ast, os, re, json, glob
odoo = os.path.expanduser(os.environ.get("ODOO_SRC", "~/Devtop/Odoo/odoo"))
NL = "<expr>"
MB = {"Model", "TransientModel", "AbstractModel"}
def modpath(m):
    for d in ("addons", "odoo/addons"):
        p = os.path.join(odoo, d, m)
        if os.path.isdir(p): return p
rows = [l.split(" | ")[-2] for l in open("docs/ecommerce/CARTOGRAPHIE.md", encoding="utf-8") if l.startswith("| [ECOM")]
deps, todo = {}, sorted({m for c in rows for m in re.findall(r"`([a-z0-9_]+)`", c)})
while todo:
    m = todo.pop()
    if m in deps or not modpath(m): continue
    try: deps[m] = ast.literal_eval(open(os.path.join(modpath(m), "__manifest__.py"), encoding="utf-8").read()).get("depends", [])
    except Exception: deps[m] = []; print("MANIFESTE ILLISIBLE", m)
    todo += deps[m]
order, done = [], set()
def visit(m):
    if m in done or m not in deps: return
    done.add(m)
    for d in sorted(deps[m]): visit(d)
    order.append(m)
for m in sorted(deps): visit(m)
def lit(n):
    try: return ast.literal_eval(n)
    except Exception: return NL
R = {}
def reg(t): return R.setdefault(t, {"kinds": set(), "auto": True, "log": True, "table": None, "mixins": [], "dele": {}, "f": {}, "cons": [], "idx": []})
def kinds_of(cls, cdefs, vis=()):
    out = set()
    for b in cls.bases:
        n = b.attr if isinstance(b, ast.Attribute) else getattr(b, "id", "")
        if n in MB: out.add(n)
        elif n in cdefs and n not in vis: out |= kinds_of(cdefs[n], cdefs, vis + (n,))
    return out
for m in order:
    for sub in ("models", "wizard", "wizards", "report"):
        for root, ds, files in os.walk(os.path.join(modpath(m), sub)):
            ds.sort()
            for fn in sorted(files):
                if not fn.endswith(".py"): continue
                try: tree = ast.parse(open(os.path.join(root, fn), encoding="utf-8").read())
                except Exception: print("ILLISIBLE", m, fn); continue
                cdefs = {n.name: n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)}
                for cls in sorted(cdefs.values(), key=lambda n: n.lineno):
                    A = {st.targets[0].id: st.value for st in cls.body if isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name)}
                    nm = lit(A["_name"]) if "_name" in A else None
                    nm = nm if isinstance(nm, str) and nm != NL else None
                    inh = lit(A["_inherit"]) if "_inherit" in A else None
                    inh = [inh] if isinstance(inh, str) else list(inh) if isinstance(inh, (list, tuple)) else []
                    inh = [x for x in inh if isinstance(x, str) and x != NL]
                    tgt = nm or (inh[0] if inh else None)
                    if not tgt: continue
                    r = reg(tgt); r["kinds"] |= kinds_of(cls, cdefs)
                    if lit(A.get("_auto", ast.Constant(True))) is False: r["auto"] = False
                    if lit(A.get("_log_access", ast.Constant(True))) is False: r["log"] = False
                    tb = lit(A["_table"]) if "_table" in A else None
                    if isinstance(tb, str) and tb != NL: r["table"] = tb
                    dl = lit(A["_inherits"]) if "_inherits" in A else None
                    if isinstance(dl, dict): r["dele"].update(dl)
                    for x in inh:
                        if x != tgt and x not in r["mixins"]: r["mixins"].append(x)
                    for st in cls.body:
                        if isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name): name, v = st.targets[0].id, st.value
                        elif isinstance(st, ast.AnnAssign) and isinstance(st.target, ast.Name) and st.value is not None: name, v = st.target.id, st.value
                        else: continue
                        if not (isinstance(v, ast.Call) and isinstance(v.func, ast.Attribute)): continue
                        a = v.func.attr
                        if isinstance(v.func.value, ast.Name) and v.func.value.id == "fields":
                            kw = {k.arg: lit(k.value) for k in v.keywords if k.arg}
                            ar = [lit(x) for x in v.args]
                            f = r["f"].get(name)
                            if f is None or f["type"] != a: r["f"][name] = {"mod": m, "type": a, "args": ar, "kw": kw}
                            else:
                                f["kw"].update(kw)
                                if ar: f["args"] = ar
                        elif a in ("Constraint", "Index", "UniqueIndex"):
                            txt = lit(v.args[0]) if v.args else NL
                            r["cons" if a == "Constraint" else "idx"].append([name.lstrip("_"), a, " ".join(txt.split()) if isinstance(txt, str) else NL, m])
TY = {"Integer": "int4", "Boolean": "bool", "Text": "text", "Html": "text", "Date": "date", "Datetime": "timestamp", "Monetary": "numeric", "Json": "jsonb", "Properties": "jsonb", "PropertiesDefinition": "jsonb", "Selection": "varchar", "Reference": "varchar", "Many2oneReference": "int4", "Char": "varchar", "Many2one": "int4", "Float": "float8", "Binary": "bytea", "Image": "bytea"}
def tbl(model):
    x = R.get(model)
    return x["table"] if x and x["table"] else model.replace(".", "_")
def defs(model, name, vis=None):
    vis = vis if vis is not None else set()
    if model in vis or model not in R: return []
    vis.add(model)
    out = [R[model]["f"][name]] if name in R[model]["f"] else []
    for mx in R[model]["mixins"]: out += defs(mx, name, vis)
    return out
def comodel(model, name, depth=0):
    if depth > 6: return None
    for f in defs(model, name):
        kw, ar = f["kw"], f["args"]
        co = kw.get("comodel_name") or (ar[0] if ar and isinstance(ar[0], str) else None)
        if isinstance(co, str) and co != NL: return co
        rel = kw.get("related")
        if isinstance(rel, str) and rel != NL:
            cur = model
            for part in rel.split(".")[:-1]:
                cur = comodel(cur, part, depth + 1)
                if not cur: break
            else:
                c = comodel(cur, rel.split(".")[-1], depth + 1)
                if c: return c
    return None
def resolve(model, name, f):
    t, kw, ar = f["type"], f["kw"], f["args"]
    if t in ("One2many", "Many2many", "Id"): return None
    st = kw.get("store"); comp = "compute" in kw or "related" in kw; cond = ""
    if st is False: return None
    if comp and st is not True:
        if st == NL: cond = "~"
        else: return None
    if t not in TY: return ["?" + t, ""]
    if t in ("Binary", "Image") and kw.get("attachment", True) is not False: return None
    ty = TY[t]
    if t == "Float" and (("digits" in kw and kw["digits"] is not None) or (len(ar) > 1 and ar[1] is not None)): ty = "numeric"
    if t == "Char" and isinstance(kw.get("size"), int): ty = "varchar(%d)" % kw["size"]
    if t in ("Char", "Text", "Html") and kw.get("translate") not in (None, False): ty = "jsonb"
    if kw.get("company_dependent") is True: ty = "jsonb"
    if t == "Many2one" and ty != "jsonb":
        co = comodel(model, name)
        ty = "→" + (tbl(co) if co else "?")
    fl = cond
    rq = kw.get("required")
    if rq is True: fl += "!"
    elif rq == NL: fl += "!?"
    ix = kw.get("index")
    if ix is True or ix == "btree": fl += "#"
    elif ix == NL: fl += "#?"
    elif isinstance(ix, str): fl += "#" + {"btree_not_null": "nn", "trigram": "tri"}.get(ix, ix)
    od = kw.get("ondelete") if t == "Many2one" and ty != "jsonb" else ""
    jb = ""
    if ty == "jsonb":
        jb = "societe" if kw.get("company_dependent") is True else "traduit" if t in ("Char", "Text", "Html") and kw.get("translate") not in (None, False) else "json"
    return [ty, fl, od if isinstance(od, str) else "", jb]
def m2m(model, name, f):
    kw, ar = f["kw"], f["args"]
    st = kw.get("store"); comp = "compute" in kw or "related" in kw
    if st is False or (comp and st is not True): return None
    co = comodel(model, name)
    if not co: return [name, "?", "?", "?", "?"]
    t1, t2 = tbl(model), tbl(co)
    rel = kw.get("relation") or (ar[1] if len(ar) > 1 else None) or "%s_%s_rel" % tuple(sorted([t1, t2]))
    c1 = kw.get("column1") or (ar[2] if len(ar) > 2 else None) or t1 + "_id"
    c2 = kw.get("column2") or (ar[3] if len(ar) > 3 else None) or t2 + "_id"
    return [name, rel, c1, c2, t2]
OUT = {}
for t, r in R.items():
    k = "vue" if not r["auto"] else "abstrait" if r["kinds"] and r["kinds"] <= {"AbstractModel"} else "transitoire" if r["kinds"] and r["kinds"] <= {"TransientModel"} else "table" if r["kinds"] else "inconnu"
    cols, rel = [], []
    for n, f in r["f"].items():
        c = resolve(t, n, f)
        if c: cols.append([n, c[0], c[1], f["mod"], c[2] if len(c) > 2 else "", c[3] if len(c) > 3 else ""])
        if f["type"] == "Many2many":
            x = m2m(t, n, f)
            if x: rel.append(x + [f["mod"]])
    OUT[t] = {"table": tbl(t), "kind": k, "mixins": r["mixins"], "dele": r["dele"], "cols": cols, "rel": rel, "cons": r["cons"], "idx": r["idx"], "log": r["log"]}
text = " ".join(open(p, encoding="utf-8").read() for p in sorted(glob.glob("docs/ecommerce/fiches/ECOM-*.md")))
toks = set(re.findall(r"`([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)`", text))
json.dump({"order": order, "scope": sorted(t for t in toks if t in OUT), "models": OUT}, open(os.path.join(HERE, "schema.json"), "w"), ensure_ascii=False)
