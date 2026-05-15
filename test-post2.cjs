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
  
  // Page 2 POST - without params in URL
  const form = new URLSearchParams();
  form.append('__VIEWSTATE', vs);
  form.append('__VIEWSTATEGENERATOR', vsg);
  form.append('__EVENTVALIDATION', ev);
  form.append('__EVENTTARGET', 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$btnNo2');
  form.append('__EVENTARGUMENT', '');
  
  try {
    // Try without params on POST URL
    const r2 = await axios.post(url, form.toString(), {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded', 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': url + '?leagueId=1&seasonId=2025&sort=Game_Cn',
        'Origin': 'https://www.koreabaseball.com'
      },
      timeout: 15000, responseType: 'text'
    });
    const ch2 = cheerio.load(r2.data);
    
    // Check if there's a table
    const tables = ch2('table').length;
    console.log('Tables found:', tables);
    
    const rows2 = [];
    ch2('table tr').each((i, row) => {
      const cols = [];
      ch2(row).find('td').each((_, td) => cols.push(ch2(td).text().trim()));
      if (cols.length > 0) rows2.push(cols);
    });
    console.log('Page 2 rows (no params):', rows2.length);
    if (rows2.length > 0) {
      console.log('P2 first:', rows2[0]?.[1], '| P2 last:', rows2[rows2.length-1]?.[1]);
    }
    
    // Check for specific table classes
    console.log('\nTable classes:');
    ch2('table').each((i, t) => {
      console.log(`  Table ${i}: class="${ch2(t).attr('class')}" id="${ch2(t).attr('id')}"`);
    });
    
    // Check for div with record content
    const recordDiv = ch2('.record-result').html();
    if (recordDiv) {
      console.log('\n.record-result found, length:', recordDiv.length);
    }
    
    // Print a sample of the response HTML around table area
    const html = r2.data;
    const tblIdx = html.indexOf('<table');
    if (tblIdx > -1) {
      console.log('\nHTML around first table:', html.substring(tblIdx, tblIdx + 300));
    } else {
      console.log('\nNo <table> in response!');
      // Check for partial content
      console.log('Response length:', html.length);
      console.log('First 500 chars:', html.substring(0, 500));
    }
  } catch (e) {
    console.log('POST ERROR:', e.message);
  }
})();
