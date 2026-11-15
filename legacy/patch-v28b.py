# v28.4: "Chat with <business>" pill fits the full name on every demo and live widget (wraps to 2 lines).
import sys, re, hashlib
f = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(f).read()
old = 'max-width:min(260px,40vw);'
assert s.count(old) == 1
i = s.index(old); j = s.index('}', i)
rule = s[i:j]
assert 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis' in rule
s = s[:i] + rule.replace('max-width:min(260px,40vw);', 'max-width:min(340px,54vw);').replace('white-space:nowrap;overflow:hidden;text-overflow:ellipsis', 'white-space:normal;overflow:visible;text-align:left;overflow-wrap:break-word;line-height:1.25') + s[j:]
old2 = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:sfwi'
assert s.count(old2) == 1
s = s.replace(old2, 'white-space:normal;overflow:visible;text-align:left;overflow-wrap:break-word;line-height:1.25;animation:sfwi')
old3 = '.replace(/ +(Pty|Ltd|Limited|Group)( .*)?$/i,"").slice(0,26)'
assert s.count(old3) == 1
s = s.replace(old3, '.replace(/ +(Pty|Ltd|Limited|Group)( .*)?$/i,"").slice(0,48)')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace(oldv, hashlib.sha1(s.encode()).hexdigest()[:10])
open(f, 'w').write(s)
print('v28.4 launcher pill fits full names')
