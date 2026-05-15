const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const url = 'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx';
  const qs = '?leagueId=1&seasonId=2025&sort=Game_Cn';
  const fullUrl = url + qs;
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
  
  // Helper to extract form data from cheerio
  function extractForm(ch) {
    const fd = {};
    ch('input[type="hidden"]').each((i, el) => {
      const name = ch(el).attr('name');
      const val = ch(el).val() || '';
      if (name) fd[name] = val;
    });
    ch('select').each((i, el) => {
      const name = ch(el).attr('name');
      if (name) {
        const selected = ch(el).find('option[selected]').val();
        fd[name] = selected || '';
      }
    });
    return fd;
  }
  
  // GET page 1
  const r1 = await axios.get(fullUrl, {
    headers: { 'User-Agent': UA },
    timeout: 15000,
  });
  const cookies = (r1.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  const ch1 = cheerio.load(r1.data);
  
  const allPlayers = [];
  const seen = new Set();
  
  // Parse page 1
  ch1('table tr').each((i, row) => {
    const cols = [];
    ch1(row).find('td').each((_, td) => cols.push(ch1(td).text().trim()));
    if (cols.length > 0 && cols[1] && !seen.has(cols[1])) {
      seen.add(cols[1]);
      allPlayers.push({ name: cols[1], team: cols[2], pa: cols[5] });
    }
  });
  console.log('Page 1:', allPlayers.length, 'players');
  
  // Pages 2-5 via POST  
  let curForm = extractForm(ch1);
  
  for (let p = 2; p <= 6; p++) {
    curForm['__EVENTTARGET'] = 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$btnNo' + p;
    curForm['__EVENTARGUMENT'] = '';
    
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(curForm)) {
      form.append(k, String(v));
    }
    
    try {
      const rN = await axios.post(fullUrl, form.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': UA,
          'Referer': fullUrl,
          'Cookie': cookies,
        },
        timeout: 15000,
        responseType: 'text',
        validateStatus: (s) => s < 400,
      });
      
      const chN = cheerio.load(rN.data);
      let pageCount = 0;
      chN('table tr').each((i, row) => {
        const cols = [];
        chN(row).find('td').each((_, td) => cols.push(chN(td).text().trim()));
        if (cols.length > 0 && cols[1] && !seen.has(cols[1])) {
          seen.add(cols[1]);
          allPlayers.push({ name: cols[1], team: cols[2], pa: cols[5] });
          pageCount++;
        }
      });
      console.log('Page ' + p + ':', pageCount, 'new players (total: ' + allPlayers.length + ')');
      
      if (pageCount === 0) {
        console.log('  (No new players, stopping)');
        break;
      }
      
      // Update form for next page
      curForm = extractForm(chN);
    } catch (e) {
      console.log('Page ' + p + ' ERROR:', e.message);
      break;
    }
  }
  
  console.log('\n=== TOTAL:', allPlayers.length, 'unique players ===');
  console.log('\nFirst 5:', allPlayers.slice(0, 5).map(p => p.name + '(' + p.team + ' PA=' + p.pa + ')').join(', '));
  console.log('Last 5:', allPlayers.slice(-5).map(p => p.name + '(' + p.team + ' PA=' + p.pa + ')').join(', '));
  
  // Count players with PA < 124 (non-qualified)
  const nonQualified = allPlayers.filter(p => parseInt(p.pa) < 124);
  console.log('\nNon-qualified (PA < 124):', nonQualified.length);
  console.log('Qualified (PA >= 124):', allPlayers.length - nonQualified.length);
})();
