const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const url = 'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx';
  const qs = '?leagueId=1&seasonId=2025&sort=Game_Cn';
  const fullUrl = url + qs;
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
  
  // Page 1 GET - capture cookies
  const r1 = await axios.get(fullUrl, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    timeout: 15000,
    // Don't auto-follow redirects so we can see cookies
    maxRedirects: 5,
  });
  
  // Extract cookies from response
  const setCookies = r1.headers['set-cookie'] || [];
  console.log('Set-Cookie headers:', setCookies.length);
  setCookies.forEach((c, i) => console.log('  Cookie ' + i + ':', c.substring(0, 80)));
  
  // Build cookie string
  const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');
  console.log('Cookie string:', cookieStr.substring(0, 100));
  
  const ch = cheerio.load(r1.data);
  
  // Extract ALL form fields dynamically
  const formData = {};
  ch('input[type="hidden"]').each((i, el) => {
    const name = ch(el).attr('name');
    const val = ch(el).val() || '';
    if (name) formData[name] = val;
  });
  ch('select').each((i, el) => {
    const name = ch(el).attr('name');
    if (name) {
      const selected = ch(el).find('option[selected]').val();
      formData[name] = selected || '';
    }
  });
  
  // Override for page 2
  formData['__EVENTTARGET'] = 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$btnNo2';
  formData['__EVENTARGUMENT'] = '';
  
  console.log('\nForm fields count:', Object.keys(formData).length);
  Object.entries(formData).forEach(([k, v]) => {
    const vs = String(v);
    console.log('  ' + k + ': ' + (vs.length > 40 ? vs.substring(0, 40) + '... (' + vs.length + ')' : vs));
  });
  
  // POST with cookies
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(formData)) {
    form.append(k, String(v));
  }
  
  try {
    const r2 = await axios.post(fullUrl, form.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        'Referer': fullUrl,
        'Origin': 'https://www.koreabaseball.com',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': cookieStr,
      },
      timeout: 15000,
      responseType: 'text',
      maxRedirects: 0,
      validateStatus: (s) => s < 400,
    });
    
    console.log('\nPOST Status:', r2.status);
    const ch2 = cheerio.load(r2.data);
    const title = ch2('title').text();
    console.log('Title:', title);
    
    const rows2 = [];
    ch2('table tr').each((i, row) => {
      const cols = [];
      ch2(row).find('td').each((_, td) => cols.push(ch2(td).text().trim()));
      if (cols.length > 0) rows2.push(cols);
    });
    console.log('Page 2 rows:', rows2.length);
    if (rows2.length > 0) {
      console.log('P2 first:', rows2[0][1], '| P2 last:', rows2[rows2.length-1][1]);
    }
  } catch (e) {
    console.log('\nPOST Error:', e.message);
    if (e.response) {
      console.log('Status:', e.response.status);
      const ch2 = cheerio.load(e.response.data);
      console.log('Title:', ch2('title').text());
    }
  }
})();
