const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const url = 'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx';
  const params = { leagueId: '1', seasonId: '2025', sort: 'Game_Cn' };
  
  // Page 1 GET
  const r1 = await axios.get(url, { params, timeout: 15000 });
  const ch = cheerio.load(r1.data);
  
  const vs = ch('#__VIEWSTATE').val() || '';
  const vsg = ch('#__VIEWSTATEGENERATOR').val() || '';
  const ev = ch('#__EVENTVALIDATION').val() || '';
  
  console.log('VS length:', vs.length);
  console.log('VSG:', vsg);
  console.log('EV length:', ev.length);
  
  // Count rows page 1
  const rows1 = [];
  ch('table tr').each((i, row) => {
    const cols = [];
    ch(row).find('td').each((_, td) => cols.push(ch(td).text().trim()));
    if (cols.length > 0) rows1.push(cols);
  });
  console.log('Page 1 rows:', rows1.length);
  console.log('P1 first:', rows1[0]?.[1], '| P1 last:', rows1[rows1.length-1]?.[1]);
  
  if (!vs) { console.log('NO VIEWSTATE! Cannot POST.'); return; }
  
  // Page 2 POST
  const form = new URLSearchParams();
  form.append('__VIEWSTATE', vs);
  form.append('__VIEWSTATEGENERATOR', vsg);
  form.append('__EVENTVALIDATION', ev);
  form.append('__EVENTTARGET', 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$btnNo2');
  form.append('__EVENTARGUMENT', '');
  
  try {
    const r2 = await axios.post(url, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
      params, timeout: 15000, responseType: 'text'
    });
    const ch2 = cheerio.load(r2.data);
    const rows2 = [];
    ch2('table tr').each((i, row) => {
      const cols = [];
      ch2(row).find('td').each((_, td) => cols.push(ch2(td).text().trim()));
      if (cols.length > 0) rows2.push(cols);
    });
    console.log('Page 2 rows:', rows2.length);
    console.log('P2 first:', rows2[0]?.[1], '| P2 last:', rows2[rows2.length-1]?.[1]);
    
    // Check overlap
    const p1names = new Set(rows1.map(r => r[1]));
    const overlap = rows2.filter(r => p1names.has(r[1]));
    console.log('Overlap with page 1:', overlap.length, 'of', rows2.length);
  } catch (e) {
    console.log('POST ERROR:', e.message);
    if (e.response) {
      console.log('Status:', e.response.status);
      console.log('Data preview:', e.response.data?.substring(0, 200));
    }
  }
})();
