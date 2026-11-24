"""Tests E2E navigateur sur le build statique (dist-preview ou dist).
Usage : python3 tests/e2e/smoke.py <url_racine>   ex. http://127.0.0.1:4173/
"""
import sys, re
from playwright.sync_api import sync_playwright, expect

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/'
errors, results = [], []

def check(name, fn):
    try:
        fn(); results.append(('OK', name))
    except Exception as e:
        results.append(('ÉCHEC', f'{name} — {str(e).splitlines()[0][:160]}'))

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 900}, locale='fr-FR')
    page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    page.on('pageerror', lambda e: errors.append(str(e)))

    def root_redirect():
        page.goto(ROOT); page.wait_for_url(re.compile(r'/fr/'), timeout=5000)
    check('Racine → /fr/ (navigateur francophone)', root_redirect)

    def home():
        page.goto(ROOT + 'fr/index.html')
        expect(page.locator('h1')).to_contain_text('Trouver, organiser')
        expect(page.locator('main a', has_text='Géomatique & SIG').first).to_be_visible()
        page.screenshot(path='/tmp/shot-home.png', full_page=False)
    check('Accueil FR rendu', home)

    def search_from_home():
        page.fill('input[name=q]', 'qgis'); page.click('button:has-text("Rechercher")')
        page.wait_for_url(re.compile(r'explore'))
        expect(page.locator('text=1 résultat(s)')).to_be_visible(timeout=5000)
        expect(page.locator('main h2')).to_contain_text('QGIS')
    check('Recherche depuis l’accueil → 1 résultat QGIS', search_from_home)

    def filters():
        page.goto(ROOT + 'fr/explore/index.html')
        expect(page.locator('text=17 résultat(s)')).to_be_visible(timeout=5000)
        page.select_option('select >> nth=1', 'dataset')
        expect(page.locator('text=/^[0-9]+ résultat\\(s\\)$/')).not_to_have_text('17 résultat(s)')
        assert 'type=dataset' in page.url, page.url
        page.fill('input[type=search]', 'données santé')
        expect(page.locator('main h2').first).to_contain_text('santé', ignore_case=True)
        page.screenshot(path='/tmp/shot-explore.png')
        page.click('button:has-text("Réinitialiser")')
        expect(page.locator('text=17 résultat(s)')).to_be_visible()
    check('Filtres + URL partageable + réinitialisation', filters)

    def deep_link():
        page.goto(ROOT + 'fr/explore/index.html?discipline=geomatique')
        expect(page.locator('text=3 résultat(s)')).to_be_visible(timeout=5000)
    check('Lien profond ?discipline=geomatique → 3 résultats', deep_link)

    def accents():
        page.goto(ROOT + 'fr/explore/index.html?q=DEMOGRAPHIE')
        expect(page.locator('main h2').first).to_be_visible(timeout=5000)
    check('Recherche insensible aux accents/casse', accents)

    def detail_and_fav():
        page.goto(ROOT + 'fr/resources/qgis-training-manual/index.html')
        expect(page.locator('h1')).to_have_text('Manuel de formation QGIS')
        expect(page.locator('dd', has_text='Non renseigné').first).to_be_visible()
        page.click('button:has-text("Ajouter aux favoris")')
        expect(page.locator('button[aria-pressed=true]')).to_be_visible()
        page.goto(ROOT + 'fr/dashboard/index.html')
        expect(page.locator('a', has_text='Manuel de formation QGIS')).to_be_visible(timeout=5000)
    check('Fiche : « Non renseigné » + favori visible dans Mon espace', detail_and_fav)

    def fallback_lang():
        page.goto(ROOT + 'en/resources/khan-academy-fr/index.html')
        expect(page.locator('h1')).to_contain_text('Khan Academy')
    check('Fiche EN d’une ressource FR', fallback_lang)

    def progress():
        page.goto(ROOT + 'fr/paths/debuter-cartographie-libre/index.html')
        page.locator('input[type=checkbox]').first.check()
        expect(page.locator('text=1 / 3 étapes terminées')).to_be_visible()
        page.reload()
        expect(page.locator('text=1 / 3 étapes terminées')).to_be_visible()
    check('Progression de parcours persistante', progress)

    def contribute():
        page.goto(ROOT + 'fr/contribute/index.html')
        page.click('button[type=submit]')
        expect(page.locator('[role=alert]').first).to_be_visible()
        assert page.evaluate('document.activeElement.id') == 'f-title'
        page.fill('#f-url', 'http://www.naturalearthdata.com/?utm_source=x')
        expect(page.locator('text=semble déjà présente')).to_be_visible(timeout=5000)
        page.fill('#f-title', 'Ressource de test')
        page.fill('#f-url', 'https://exemple.org/cours')
        page.select_option('#f-type', 'course'); page.select_option('#f-discipline', 'informatique')
        page.fill('#f-description', 'Une description suffisamment longue pour passer la validation du formulaire.')
        page.click('button[type=submit]')
        expect(page.locator('a:has-text("Envoyer via GitHub")')).to_be_visible()
        assert '"license"' not in page.locator('pre').inner_text(), 'champ vide inventé'
    check('Contribution : validation, focus, doublon, JSON sans champ inventé', contribute)

    def lang_switch():
        page.goto(ROOT + 'fr/collections/index.html')
        page.click('a[hreflang=en]')
        expect(page.locator('h1')).to_have_text('Collections')
        assert '/en/collections' in page.url
    check('Changement de langue conserve la page', lang_switch)

    def mobile():
        m = browser.new_page(viewport={'width': 360, 'height': 780})
        m.goto(ROOT + 'fr/resources/mit-6-0001-python/index.html')
        overflow = m.evaluate('document.documentElement.scrollWidth > window.innerWidth')
        m.screenshot(path='/tmp/shot-mobile.png', full_page=True)
        assert not overflow, 'débordement horizontal à 360 px'
        m.close()
    check('Mobile 360 px sans débordement horizontal', mobile)

    def not_found():
        r = page.goto(ROOT + 'fr/n-existe-pas/')
        assert r.status == 404
    check('404 pour une page inexistante', not_found)

    browser.close()

for s, n in results: print(f'[{s}] {n}')
real_errors = [e for e in errors if 'serviceWorker' not in e and '404' not in e]
print(f'Erreurs console JS : {len(real_errors)}'); [print('  ', e[:200]) for e in real_errors[:10]]
sys.exit(0 if all(s == 'OK' for s, _ in results) and not real_errors else 1)
