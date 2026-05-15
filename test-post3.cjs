const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const url = 'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx';
  const params = { leagueId: '1', seasonId: '2025', sort: 'Game_Cn' };
  
  const r1 = await axios.get(url, { params, timeout: 15000 });
  const ch = cheerio.load(r1.data);
  
  // List ALL hidden inputs
  console.log('=== Hidden inputs ===');
  ch('input[type="hidden"]').each((i, el) => {
    const name = ch(el).attr('name') || '';
    const val = (ch(el).val() || '').toString();
    console.log(`  ${name}: ${val.length > 50 ? val.substring(0,50) + '...' : val}`);
  });
  
  // List all select/dropdown elements
  console.log('\n=== Select elements ===');
  ch('select').each((i, el) => {
    const name = ch(el).attr('name') || ch(el).attr('id') || '';
    const selected = ch(el).find('option[selected]').val() || ch(el).find('option:first').val();
    console.log(`  ${name}: selected=${selected}`);
  });
  
  // List all input elements that aren't hidden
  console.log('\n=== Other inputs ===');
  ch('input:not([type="hidden"])').each((i, el) => {
    const name = ch(el).attr('name') || '';
    const type = ch(el).attr('type') || '';
    const val = (ch(el).val() || '').toString();
    if (name) console.log(`  ${name} (${type}): ${val}`);
  });
  
  // Check form action
  console.log('\n=== Form ===');
  ch('form').each((i, el) => {
    console.log(`  action="${ch(el).attr('action')}" method="${ch(el).attr('method')}" id="${ch(el).attr('id')}"`);
  });
  
  // Check the pager buttons
  console.log('\n=== Pager links ===');
  ch('a[href*="doPostBack"]').each((i, el) => {
    const href = ch(el).attr('href') || '';
    const text = ch(el).text().trim();
    if (text.match(/^\d+$/) || text === '다음') {
      console.log(`  ${text}: ${href}`);
    }
  });
})();
