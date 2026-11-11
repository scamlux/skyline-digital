import puppeteer from "puppeteer-core";
const BASE="http://localhost:3106";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [style="a", w="390"] = process.argv.slice(2);
const browser = await puppeteer.launch({executablePath:CHROME, headless:"new", args:["--hide-scrollbars"]});
const page = await browser.newPage();
const mobile = Number(w)<800;
await page.setViewport({width:Number(w), height: mobile?844:900, isMobile:mobile, hasTouch:mobile, deviceScaleFactor: mobile?2:1});
const errs=[]; page.on("pageerror",e=>errs.push(e.message)); page.on("console",m=>{ if(m.type()==="error") errs.push(m.text())});
await page.goto(`${BASE}/sites/cafe/${style}`,{waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,900));
await page.screenshot({path:`/tmp/cafe-shots/${style}-hero-${w}.png`});
// прокрутка для reveal
const h = await page.evaluate(()=>document.documentElement.scrollHeight);
for(let y=0;y<h;y+=500){ await page.evaluate(y=>window.scrollTo(0,y),y); await new Promise(r=>setTimeout(r,120)); }
await page.evaluate(()=>window.scrollTo(0,0)); await new Promise(r=>setTimeout(r,400));
await page.screenshot({path:`/tmp/cafe-shots/${style}-full-${w}.png`, fullPage:true});
console.log("overflow", await page.evaluate(()=>document.documentElement.scrollWidth - window.innerWidth), "errs", errs.slice(0,5));
await browser.close();
