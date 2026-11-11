# Writes /tmp/claude-0/cols.txt (table|col1,col2,...) from schema/*.sql for test/schema checks (schema/strict.mjs).
import re, glob, os, sys
cols = {}
for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'schema', '*.sql'))):
    sql = re.sub(r'--[^\n]*', '', open(f).read())
    for m in re.finditer(r'create table(?: if not exists)?\s+(?:public\.)?(\w+)\s*\((.*?)\);', sql, re.S | re.I):
        t, body = m.group(1), m.group(2)
        depth, cur, parts = 0, '', []
        for ch in body:
            if ch == '(': depth += 1
            if ch == ')': depth -= 1
            if ch == ',' and depth == 0: parts.append(cur); cur = ''
            else: cur += ch
        parts.append(cur)
        for p in parts:
            w = p.strip().split()
            if w and w[0].lower() not in ('primary', 'unique', 'constraint', 'foreign', 'check', 'exclude'):
                cols.setdefault(t, set()).add(w[0].strip('"'))
    for m in re.finditer(r'alter table(?: if exists)?\s+(?:public\.)?(\w+)\s+add column(?: if not exists)?\s+"?(\w+)', sql, re.I):
        cols.setdefault(m.group(1), set()).add(m.group(2))
    for m in re.finditer(r'alter table(?: if exists)?\s+(?:public\.)?(\w+)((?:\s+add column(?: if not exists)?\s+\w+[^,;]*,?)+);', sql, re.I):
        for c in re.findall(r'add column(?: if not exists)?\s+"?(\w+)', m.group(2), re.I):
            cols.setdefault(m.group(1), set()).add(c)
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/cols.txt'
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w').write('\n'.join(t + '|' + ','.join(sorted(c)) for t, c in sorted(cols.items())) + '\n')
print(len(cols), 'tables ->', out)
