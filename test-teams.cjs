const axios = require('axios');
const cheerio = require('cheerio');

// KBO 팀 ID 목록 (KBO 사이트에서 사용하는 값)
const TEAM_IDS = ['HT', 'OB', 'LG', 'SK', 'KT', 'HH', 'SS', 'NC', 'LT', 'WO'];
const TEAM_NAMES = ['KIA', '두산', 'LG', 'SSG', 'KT', '한화', '삼성', 'NC', '롯데', '키움'];

(async () => {
  const url = 'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx';
  let totalPlayers = 0;
  
  for (let i = 0; i < TEAM_IDS.length; i++) {
    const tid = TEAM_IDS[i];
    const name = TEAM_NAMES[i];
    try {
      const r = await axios.get(url, {
        params: { leagueId: '1', seasonId: '2025', sort: 'Game_Cn', teamId: tid },
        timeout: 15000
      });
      const ch = cheerio.load(r.data);
      const rows = [];
      ch('table tr').each((ii, row) => {
        const cols = [];
        ch(row).find('td').each((_, td) => cols.push(ch(td).text().trim()));
        if (cols.length > 0) rows.push(cols);
      });
      totalPlayers += rows.length;
      console.log(tid + '(' + name + '): ' + rows.length + ' players');
      if (rows.length > 0) {
        console.log('  First: ' + rows[0][1] + ' PA=' + rows[0][5] + ' | Last: ' + rows[rows.length-1][1] + ' PA=' + rows[rows.length-1][5]);
      }
    } catch (e) {
      console.log(tid + ': ERROR ' + e.message);
    }
  }
  console.log('\nTotal players:', totalPlayers);
})();
