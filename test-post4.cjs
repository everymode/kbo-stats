const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const url = 'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx';
  const qs = { leagueId: '1', seasonId: '2025', sort: 'Game_Cn' };
  
  const r1 = await axios.get(url, { params: qs, timeout: 15000 });
  const ch = cheerio.load(r1.data);
  
  // Extract ALL form fields
  const vs = ch('#__VIEWSTATE').val() || '';
  const vsg = ch('#__VIEWSTATEGENERATOR').val() || '';
  const ev = ch('#__EVENTVALIDATION').val() || '';
  
  // Page 1 names
  const rows1 = [];
  ch('table tr').each((i, row) => {
    const cols = [];
    ch(row).find('td').each((_, td) => cols.push(ch(td).text().trim()));
    if (cols.length > 0) rows1.push(cols);
  });
  console.log('Page 1:', rows1.length, 'rows');
  console.log('P1 first:', rows1[0]?.[1], '| P1 last:', rows1[rows1.length-1]?.[1]);
  
  // Build POST form with ALL fields
  const form = new URLSearchParams();
  form.append('__VIEWSTATE', vs);
  form.append('__VIEWSTATEGENERATOR', vsg);
  form.append('__EVENTVALIDATION', ev);
  form.append('__EVENTTARGET', 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$btnNo2');
  form.append('__EVENTARGUMENT', '');
  // Hidden fields
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$hfPage', '1');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$hfOrderByCol', 'Game_Cn');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$hfOrderBy', 'DESC');
  // Dropdowns
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeason$ddlSeason', '2026');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeries$ddlSeries', '0');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlTeam$ddlTeam', '');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlPos$ddlPos', '');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSituation$ddlSituation', '');
  form.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSituationDetail$ddlSituationDetail', '');
  
  const r2 = await axios.post(url + '?leagueId=1&seasonId=2025&sort=Game_Cn', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': url + '?leagueId=1&seasonId=2025&sort=Game_Cn',
    },
    timeout: 15000, responseType: 'text',
    maxRedirects: 5
  });
  
  const ch2 = cheerio.load(r2.data);
  const rows2 = [];
  ch2('table tr').each((i, row) => {
    const cols = [];
    ch2(row).find('td').each((_, td) => cols.push(ch2(td).text().trim()));
    if (cols.length > 0) rows2.push(cols);
  });
  console.log('\nPage 2:', rows2.length, 'rows');
  if (rows2.length > 0) {
    console.log('P2 first:', rows2[0]?.[1], '| P2 last:', rows2[rows2.length-1]?.[1]);
    // Check overlap
    const p1names = new Set(rows1.map(r => r[1]));
    const newPlayers = rows2.filter(r => !p1names.has(r[1]));
    console.log('New players on page 2:', newPlayers.length);
  } else {
    // Check for error
    const title = ch2('title').text();
    console.log('Page title:', title);
    console.log('Response length:', r2.data.length);
    console.log('Tables:', ch2('table').length);
  }
})();
