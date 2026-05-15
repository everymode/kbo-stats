const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

(async () => {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar, withCredentials: true }));
  
  const url = 'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx';
  const qs = '?leagueId=1&seasonId=2025&sort=Game_Cn';
  const fullUrl = url + qs;
  
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
  
  // Page 1 GET with cookies
  const r1 = await client.get(fullUrl, { 
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
    timeout: 15000 
  });
  const ch = cheerio.load(r1.data);
  
  // Cookies from page 1
  const cookies = await jar.getCookieString(url);
  console.log('Cookies:', cookies.substring(0, 100));
  
  // Page 1 data
  const rows1 = [];
  ch('table tr').each((i, row) => {
    const cols = [];
    ch(row).find('td').each((_, td) => cols.push(ch(td).text().trim()));
    if (cols.length > 0) rows1.push(cols);
  });
  console.log('Page 1:', rows1.length, 'rows |', rows1[0]?.[1], '->', rows1[rows1.length-1]?.[1]);
  
  // Extract form fields
  const vs = ch('#__VIEWSTATE').val() || '';
  const vsg = ch('#__VIEWSTATEGENERATOR').val() || '';
  const ev = ch('#__EVENTVALIDATION').val() || '';
  
  // Build POST with ALL form fields
  const form = new URLSearchParams();
  form.append('__VIEWSTATE', vs);
  form.append('__VIEWSTATEGENERATOR', vsg);
  form.append('__EVENTVALIDATION', ev);
  form.append('__EVENTTARGET', 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$btnNo2');
  form.append('__EVENTARGUMENT', '');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$hfPage', '1');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$hfOrderByCol', 'Game_Cn');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$hfOrderBy', 'DESC');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeason$ddlSeason', '2026');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeries$ddlSeries', '0');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlTeam$ddlTeam', '');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlPos$ddlPos', '');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSituation$ddlSituation', '');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSituationDetail$ddlSituationDetail', '');
  
  try {
    const r2 = await client.post(fullUrl, form.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        'Referer': fullUrl,
        'Origin': 'https://www.koreabaseball.com',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000, responseType: 'text',
    });
    
    const ch2 = cheerio.load(r2.data);
    const rows2 = [];
    ch2('table tr').each((i, row) => {
      const cols = [];
      ch2(row).find('td').each((_, td) => cols.push(ch2(td).text().trim()));
      if (cols.length > 0) rows2.push(cols);
    });
    console.log('Page 2:', rows2.length, 'rows');
    if (rows2.length > 0) {
      console.log('P2:', rows2[0]?.[1], '->', rows2[rows2.length-1]?.[1]);
    } else {
      const title = ch2('title').text();
      console.log('Title:', title);
      console.log('Status:', r2.status);
      // Check for body content
      const bodyText = ch2('body').text().trim().substring(0, 200);
      console.log('Body:', bodyText);
    }
  } catch(e) {
    console.log('Error:', e.message);
    if (e.response) console.log('Status:', e.response.status);
  }
})();
