"""Read-only screenshots of the running site; optional admin credentials via env."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
base=os.environ.get('SCREENSHOT_BASE_URL','http://localhost:3000')
out=Path('screenshots');out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'/main',wait_until='domcontentloaded')
    expect(page.locator('.product-card').first).to_be_visible()
    page.evaluate('document.fonts.ready')
    page.screenshot(path=str(out/'redesign-main.png'))
    page.locator('.shop-section').scroll_into_view_if_needed()
    page.locator('.shop-section').screenshot(path=str(out/'redesign-catalog.png'))
    page.locator('.recent-purchases').scroll_into_view_if_needed()
    page.locator('.recent-purchases').screenshot(path=str(out/'recent-purchases.png'))
    assert not page.locator('a[href="/support"]').count()
    broken=page.locator('img').evaluate_all('(images)=>images.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute("src"))')
    assert not broken,broken
    page.set_viewport_size({'width':390,'height':844})
    page.goto(base+'/main',wait_until='domcontentloaded')
    expect(page.locator('.product-card').first).to_be_visible()
    page.screenshot(path=str(out/'redesign-mobile.png'))
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    if os.environ.get('ADMIN_PASSWORD'):
        page.set_viewport_size({'width':1440,'height':1000})
        r=context.request.post(base+'/api/auth',headers={'Origin':base},data={'login':os.environ['ADMIN_LOGIN'],'password':os.environ['ADMIN_PASSWORD']});assert r.status==200
        page.goto(base+'/admin',wait_until='domcontentloaded')
        nav=page.get_by_role('navigation',name='Разделы админки')
        nav.get_by_role('button',name='Оформление',exact=True).click()
        expect(page.get_by_role('heading',name='Главный баннер')).to_be_visible()
        page.screenshot(path=str(out/'redesign-admin.png'),full_page=True)
        nav.get_by_role('button',name='Аналитика',exact=True).click()
        expect(page.get_by_role('heading',name='Выручка по дням')).to_be_visible()
        page.screenshot(path=str(out/'redesign-analytics.png'),full_page=True)
        context.request.delete(base+'/api/auth',headers={'Origin':base})
    assert not errors,errors
    browser.close()
    print('Screenshots saved; no broken images, JavaScript errors or mobile overflow.')
