"""Tell Bing, Yandex and the other IndexNow search engines which pages of the site changed.

GitHub runs this after every push that changes .github/indexnow/pages.txt (see .github/workflows/indexnow.yml).
pages.txt comes from the site build: a line per page, "<fingerprint> <address>". The fingerprint skips the
hashed names of pictures and styles, so a new sprite or stylesheet alone doesn't count as a changed page.

The script
  1. compares pages.txt with its copy in the commit before the push and takes the new and changed addresses
     plus the ones that are gone (search engines drop those sooner); with no earlier copy (the first push
     with IndexNow, or a manual run) it takes every page;
  2. waits until GitHub Pages serves this commit: the key file and one changed page must match the files here;
  3. posts the addresses to api.indexnow.org, up to 10,000 per request; IndexNow search engines share what
     one of them receives with the others. The first time a key is used, Bing answers 403
     SiteVerificationNotCompleted while it checks the key file: the script waits and tries again, and if
     Bing still isn't done it sends the addresses straight to Yandex and fails, so the run can be re-run later.

usage: python3 .github/indexnow/ping.py <commit before the push>    (empty or 000… = every page)
Run it from the root of the site's repository. For tests: SITE_ORIGIN (where the published pages are),
INDEXNOW_ENDPOINT, YANDEX_ENDPOINT, INDEXNOW_WAIT (seconds to wait for GitHub Pages, 600 by default),
INDEXNOW_RETRY (seconds between tries while Bing verifies the site, "120,240,480" by default).
The log is in Russian: it is read by the site's owner.
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

MANIFEST = '.github/indexnow/pages.txt'
CONFIG = '.github/indexnow/config.json'
BATCH = 10000
UA = 'robruncalc-indexnow (GitHub Actions)'
ANSWERS = {200: 'принято', 202: 'принято, ключ ещё проверяется', 400: 'неверный запрос',
           403: 'ключ не подошёл: файла с ключом нет на сайте или в нём другой ключ',
           422: 'адреса не с этого сайта или ключ не совпал', 429: 'слишком много запросов, повтори позже'}
VERIFYING = 'SiteVerificationNotCompleted'   # Bing is still checking the key file of a new key


def explain(status, text):
    if status == 403 and VERIFYING in text:
        return 'Bing ещё проверяет, что сайт твой: так бывает при первой отправке с новым ключом'
    return ANSWERS.get(status, 'нет связи' if status == 0 else 'неожиданный ответ')


def parse(text):
    pages = {}
    for line in text.splitlines():
        line = line.strip()
        if line and not line.startswith('#'):
            fingerprint, url = line.split()
            pages[url] = fingerprint
    return pages


def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True)


def previous(before):
    """pages.txt as it was in the commit before the push, or None when there is no such copy."""
    if not before or set(before) == {'0'}:
        return None
    if git('cat-file', '-e', f'{before}^{{commit}}').returncode != 0:
        git('fetch', '--quiet', '--depth=1', 'origin', before)   # the push had more than one commit
    r = git('show', f'{before}:{MANIFEST}')
    return parse(r.stdout) if r.returncode == 0 else None


def local_file(path):
    return path + 'index.html' if path == '' or path.endswith('/') else path


def published(origin, path, want):
    """True when the site serves `want` at `path`; the query string gets past the CDN's cached copy."""
    req = urllib.request.Request(f'{origin}/{path}?indexnow={time.time_ns()}', headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().strip() == want.strip()
    except (urllib.error.URLError, OSError, ValueError):
        return False


def wait_until_published(origin, host, key, sample, wait):
    checks = [(f'{key}.txt', key.encode())]
    if sample:
        path = sample[len(f'https://{host}/'):]
        if os.path.exists(local_file(path)):
            checks.append((path, open(local_file(path), 'rb').read()))
    deadline = time.monotonic() + wait
    while True:
        waiting = [path or '/' for path, want in checks if not published(origin, path, want)]
        if not waiting:
            print('GitHub Pages уже показывает новую версию.')
            return True
        if time.monotonic() >= deadline:
            print(f'GitHub Pages ещё не показывает новую версию ({", ".join(waiting)}). Отправляю всё равно: '
                  'поисковики придут за страницами позже.')
            return False
        time.sleep(10)


def post(endpoint, body):
    data = json.dumps(body, ensure_ascii=False).encode('utf-8')
    for attempt in range(3):
        req = urllib.request.Request(endpoint, data=data, method='POST',
                                     headers={'Content-Type': 'application/json; charset=utf-8', 'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read().decode('utf-8', 'replace').strip()
        except urllib.error.HTTPError as e:
            if e.code < 500 or attempt == 2:
                return e.code, e.read().decode('utf-8', 'replace').strip()
        except (urllib.error.URLError, OSError) as e:
            if attempt == 2:
                return 0, str(e)
        time.sleep(20)


def submit(endpoint, body, waits):
    """Post; while Bing is still verifying the site, wait and try again."""
    for wait in waits + [None]:
        status, text = post(endpoint, body)
        if wait is None or not (status == 403 and VERIFYING in text):
            return status, text
        print(f'Ответ 403: {explain(status, text)}. Жду {wait // 60 or 1} мин и пробую снова.', flush=True)
        time.sleep(wait)


def main(argv):
    before = argv[1] if len(argv) > 1 else ''
    cfg = json.load(open(CONFIG, encoding='utf-8'))
    host, key = cfg['host'], cfg['key']
    origin = os.environ.get('SITE_ORIGIN', f'https://{host}').rstrip('/')
    endpoint = os.environ.get('INDEXNOW_ENDPOINT', 'https://api.indexnow.org/indexnow')
    yandex = os.environ.get('YANDEX_ENDPOINT', 'https://yandex.com/indexnow')
    wait = int(os.environ.get('INDEXNOW_WAIT', '600'))
    retry = [int(x) for x in os.environ.get('INDEXNOW_RETRY', '120,240,480').split(',') if x.strip()]

    now = parse(open(MANIFEST, encoding='utf-8').read())
    old = previous(before)
    if old is None:
        changed, gone = sorted(now), []
        print(f'Отправляю все страницы сайта: {len(changed)}.')
    else:
        changed = sorted(u for u, f in now.items() if old.get(u) != f)
        gone = sorted(u for u in old if u not in now)
        print(f'Новых и изменённых страниц: {len(changed)}, удалённых: {len(gone)}.')
    urls = changed + gone
    if not urls:
        print('Отправлять нечего.')
        return 0
    for u in urls[:30]:
        print('  ' + u)
    if len(urls) > 30:
        print(f'  … и ещё {len(urls) - 30}')

    wait_until_published(origin, host, key, changed[0] if changed else None, wait)
    ok, verifying = True, False
    for i in range(0, len(urls), BATCH):
        body = {'host': host, 'key': key, 'keyLocation': f'https://{host}/{key}.txt', 'urlList': urls[i:i + BATCH]}
        status, text = submit(endpoint, body, retry)
        print(f'IndexNow: {len(body["urlList"])} адресов, ответ {status} ({explain(status, text)})' + (f': {text[:300]}' if text else ''))
        if status in (200, 202):
            continue
        ok = False
        if status == 403 and VERIFYING in text:
            verifying = True
            y_status, y_text = post(yandex, body)   # Yandex checks the key itself: don't make it wait for Bing
            print(f'Яндекс напрямую: ответ {y_status} ({ANSWERS.get(y_status, "нет связи" if y_status == 0 else "неожиданный ответ")})'
                  + (f': {y_text[:300]}' if y_text else ''))
    if verifying:
        print('Bing пока не закончил проверку сайта. Через час-другой открой этот запуск и нажми '
              '«Re-run jobs» → «Re-run failed jobs»: страницы уйдут ещё раз.')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
