"""Run only against an isolated test instance; changes seasonal settings."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ['TEST_BASE_URL'];results=Path('test-results');results.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 admin=browser.new_page(viewport={'width':1440,'height':1000});visitor=browser.new_page(viewport={'width':1280,'height':900});errors=[]
 for page in [admin,visitor]:page.on('pageerror',lambda e:errors.append(str(e)))
 admin.goto(base+'/admin',wait_until='networkidle')
 admin.get_by_label('Логин',exact=True).fill(os.environ['TEST_ADMIN_LOGIN']);admin.get_by_label('Пароль администратора',exact=True).fill(os.environ['TEST_ADMIN_PASSWORD']);admin.get_by_role('button',name='Войти в панель').click()
 admin.get_by_role('navigation',name='Разделы админки').get_by_role('button',name='Сезоны и плагин').click()
 expect(admin.get_by_role('heading',name='Сезоны и события')).to_be_visible()
 for theme,label in [('snow','Тихий снег'),('rain','Осенний дождь'),('halloween','Хэллоуин')]:
  admin.get_by_role('button',name=label).click();admin.get_by_role('button',name='Сохранить оформление').click();expect(admin.locator('.panel-heading .status').first).to_have_text(label)
  visitor.goto(base+'/main',wait_until='networkidle');expect(visitor.locator('.season-overlay.'+theme)).to_be_attached()
  if theme=='snow':assert visitor.locator('.snow i').count()==24
  if theme=='rain':assert visitor.locator('.edge-leaves').count()==2
  visitor.screenshot(path=str(results/('season-'+theme+'.png')))
 admin.screenshot(path=str(results/'season-admin.png'),full_page=True)
 for route in ['/main','/rules','/news']:
  visitor.goto(base+route,wait_until='networkidle')
  for i in range(2):visitor.get_by_role('button',name='Собрать тыкву',exact=True).first.click()
 expect(visitor.get_by_role('dialog')).to_be_visible();visitor.get_by_label('Ник в Minecraft').fill('BrowserHunter');visitor.get_by_role('button',name='Получить команду').click();expect(visitor.locator('.claim-command code')).to_contain_text('/gtclaim ')
 visitor.screenshot(path=str(results/'season-prize.png'))
 visitor.get_by_role('button',name='Закрыть').click()
 visitor.reload(wait_until='networkidle');expect(visitor.locator('.hunt-status small')).to_contain_text('6 / 6')
 mobile=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');mobile.goto(base+'/main',wait_until='networkidle');expect(mobile.locator('.hunt-status')).to_be_visible();assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mobile.screenshot(path=str(results/'season-mobile.png'))
 assert not errors,errors
 print('PASS: admin themes, snow/rain, all 6 pumpkins, persistence, claim dialog, mobile layout; no JS errors')
 browser.close()
