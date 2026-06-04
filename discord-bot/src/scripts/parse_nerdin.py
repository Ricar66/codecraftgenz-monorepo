import re
with open('/tmp/nerdin.html') as f:
    html = f.read()
urls = re.findall(r"onclick=\"window\.location\.href='([^']+)'\"", html)
titles = re.findall(r'class="vaga-titulo[^"]*"[^>]*>(.*?)<', html, re.DOTALL)
empresas = re.findall(r'class="vaga-empresa[^"]*"[^>]*>(.*?)<', html, re.DOTALL)
for i in range(min(5, len(urls))):
    t = re.sub(r'<[^>]+>','', titles[i]).strip() if i < len(titles) else '?'
    e = re.sub(r'<[^>]+>','', empresas[i]).strip() if i < len(empresas) else '?'
    print(f'Titulo: {t}')
    print(f'Empresa: {e}')
    print(f'URL: https://www.nerdin.com.br/{urls[i]}')
    print()
