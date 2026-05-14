"""
KBO Stats API Server
KBO 공식 사이트에서 실시간 데이터를 크롤링하여 REST API로 제공합니다.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import json
from datetime import datetime, date
from typing import Optional, List
import re

app = FastAPI(title="KBO Stats API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── 공통 설정 ───────────────────────────────────────────────
BASE_URL = "https://www.koreabaseball.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
    "Referer": "https://www.koreabaseball.com/",
}

# 팀 컬러 매핑
TEAM_COLORS = {
    "KIA": {"primary": "#EA0029", "secondary": "#000000"},
    "삼성": {"primary": "#074CA1", "secondary": "#FFFFFF"},
    "LG": {"primary": "#C30037", "secondary": "#000000"},
    "두산": {"primary": "#131230", "secondary": "#ED1C24"},
    "KT": {"primary": "#000000", "secondary": "#ED1C24"},
    "SSG": {"primary": "#CE0E2D", "secondary": "#FFC600"},
    "NC": {"primary": "#315288", "secondary": "#C5985E"},
    "롯데": {"primary": "#041E42", "secondary": "#D00F31"},
    "한화": {"primary": "#FF6600", "secondary": "#000000"},
    "키움": {"primary": "#820024", "secondary": "#000000"},
}

# 팀 풀네임 매핑
TEAM_FULL_NAMES = {
    "KIA": "KIA 타이거즈",
    "삼성": "삼성 라이온즈",
    "LG": "LG 트윈스",
    "두산": "두산 베어스",
    "KT": "KT 위즈",
    "SSG": "SSG 랜더스",
    "NC": "NC 다이노스",
    "롯데": "롯데 자이언츠",
    "한화": "한화 이글스",
    "키움": "키움 히어로즈",
}

# 간단한 메모리 캐시
_cache = {}
CACHE_TTL = 300  # 5분


def get_cached(key: str):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None


def set_cache(key: str, data):
    _cache[key] = (data, time.time())


def get_session():
    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def get_team_info(team_name: str):
    for key in TEAM_COLORS:
        if key in team_name:
            return {
                "short": key,
                "full": TEAM_FULL_NAMES.get(key, team_name),
                "colors": TEAM_COLORS[key],
            }
    return {"short": team_name, "full": team_name, "colors": {"primary": "#666666", "secondary": "#FFFFFF"}}


# ─── 팀 순위 ─────────────────────────────────────────────────
@app.get("/api/team-rank")
def get_team_rank():
    cached = get_cached("team_rank")
    if cached:
        return cached

    try:
        session = get_session()
        url = f"{BASE_URL}/Record/TeamRank/TeamRankDaily.aspx"
        resp = session.get(url, timeout=15)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        table = soup.find("table")

        if not table:
            raise HTTPException(status_code=503, detail="데이터를 가져올 수 없습니다")

        rows = table.find_all("tr")
        result = []
        for row in rows[1:]:
            cols = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cols) >= 8:
                team_info = get_team_info(cols[1])
                result.append({
                    "rank": int(cols[0]) if cols[0].isdigit() else 0,
                    "teamName": cols[1],
                    "teamShort": team_info["short"],
                    "teamFull": team_info["full"],
                    "colors": team_info["colors"],
                    "games": int(cols[2]) if cols[2].isdigit() else 0,
                    "wins": int(cols[3]) if cols[3].isdigit() else 0,
                    "losses": int(cols[4]) if cols[4].isdigit() else 0,
                    "draws": int(cols[5]) if cols[5].isdigit() else 0,
                    "winRate": cols[6],
                    "gameBehind": cols[7],
                    "recentTen": cols[8] if len(cols) > 8 else "",
                    "streak": cols[9] if len(cols) > 9 else "",
                    "home": cols[10] if len(cols) > 10 else "",
                    "away": cols[11] if len(cols) > 11 else "",
                })

        data = {"data": result, "updatedAt": datetime.now().isoformat()}
        set_cache("team_rank", data)
        return data

    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# ─── 타자 기록 ────────────────────────────────────────────────
@app.get("/api/hitters")
def get_hitters(season: str = Query(default="2026"), page: int = Query(default=1)):
    cache_key = f"hitters_{season}_{page}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    try:
        session = get_session()
        url = f"{BASE_URL}/Record/Player/HitterBasic/Basic1.aspx"
        params = {"leagueId": "1", "seasonId": season, "currentPage": str(page)}
        resp = session.get(url, params=params, timeout=15)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        table = soup.find("table")

        if not table:
            raise HTTPException(status_code=503, detail="데이터를 가져올 수 없습니다")

        rows = table.find_all("tr")
        headers_row = rows[0].find_all("th") if rows else []
        col_names = [th.get_text(strip=True) for th in headers_row]

        result = []
        for row in rows[1:]:
            cols = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cols) < 5:
                continue
            team_info = get_team_info(cols[2] if len(cols) > 2 else "")
            item = {
                "rank": int(cols[0]) if cols[0].isdigit() else 0,
                "playerName": cols[1] if len(cols) > 1 else "",
                "teamName": cols[2] if len(cols) > 2 else "",
                "teamShort": team_info["short"],
                "colors": team_info["colors"],
                "avg": cols[3] if len(cols) > 3 else "0",
                "games": int(cols[4]) if len(cols) > 4 and cols[4].isdigit() else 0,
                "pa": int(cols[5]) if len(cols) > 5 and cols[5].isdigit() else 0,
                "ab": int(cols[6]) if len(cols) > 6 and cols[6].isdigit() else 0,
                "runs": int(cols[7]) if len(cols) > 7 and cols[7].isdigit() else 0,
                "hits": int(cols[8]) if len(cols) > 8 and cols[8].isdigit() else 0,
                "doubles": int(cols[9]) if len(cols) > 9 and cols[9].isdigit() else 0,
                "triples": int(cols[10]) if len(cols) > 10 and cols[10].isdigit() else 0,
                "hr": int(cols[11]) if len(cols) > 11 and cols[11].isdigit() else 0,
                "tb": int(cols[12]) if len(cols) > 12 and cols[12].isdigit() else 0,
                "rbi": int(cols[13]) if len(cols) > 13 and cols[13].isdigit() else 0,
                "sac": int(cols[14]) if len(cols) > 14 and cols[14].isdigit() else 0,
                "sf": int(cols[15]) if len(cols) > 15 and cols[15].isdigit() else 0,
            }
            result.append(item)

        # OPS 추가 계산 (타자 기록 2페이지에서 가져오거나 추정)
        data = {"data": result, "season": season, "page": page, "updatedAt": datetime.now().isoformat()}
        set_cache(cache_key, data)
        return data

    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# ─── 타자 기록 (OPS/OBP/SLG 포함) ───────────────────────────
@app.get("/api/hitters/ops")
def get_hitters_ops(season: str = Query(default="2026"), page: int = Query(default=1)):
    cache_key = f"hitters_ops_{season}_{page}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    try:
        session = get_session()
        url = f"{BASE_URL}/Record/Player/HitterBasic/Basic2.aspx"
        params = {"leagueId": "1", "seasonId": season, "currentPage": str(page)}
        resp = session.get(url, params=params, timeout=15)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        table = soup.find("table")

        if not table:
            return {"data": [], "season": season, "updatedAt": datetime.now().isoformat()}

        rows = table.find_all("tr")
        result = []
        for row in rows[1:]:
            cols = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cols) < 5:
                continue
            team_info = get_team_info(cols[2] if len(cols) > 2 else "")
            # Basic2 컬럼: 순위|선수명|팀명|AVG|BB|IBB|HBP|SO|GDP|SLG|OBP|OPS|MH|RISP|PH-BA
            item = {
                "rank": int(cols[0]) if cols[0].isdigit() else 0,
                "playerName": cols[1] if len(cols) > 1 else "",
                "teamName": cols[2] if len(cols) > 2 else "",
                "teamShort": team_info["short"],
                "colors": team_info["colors"],
                "avg": cols[3] if len(cols) > 3 else "0",
                "bb": int(cols[4]) if len(cols) > 4 and cols[4].isdigit() else 0,
                "ibb": int(cols[5]) if len(cols) > 5 and cols[5].isdigit() else 0,
                "hbp": int(cols[6]) if len(cols) > 6 and cols[6].isdigit() else 0,
                "so": int(cols[7]) if len(cols) > 7 and cols[7].isdigit() else 0,
                "gdp": int(cols[8]) if len(cols) > 8 and cols[8].isdigit() else 0,
                "slg": cols[9] if len(cols) > 9 else "0",
                "obp": cols[10] if len(cols) > 10 else "0",
                "ops": cols[11] if len(cols) > 11 else "0",
            }
            result.append(item)

        data = {"data": result, "season": season, "page": page, "updatedAt": datetime.now().isoformat()}
        set_cache(cache_key, data)
        return data

    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# ─── 투수 기록 ────────────────────────────────────────────────
@app.get("/api/pitchers")
def get_pitchers(season: str = Query(default="2026"), page: int = Query(default=1)):
    cache_key = f"pitchers_{season}_{page}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    try:
        session = get_session()
        url = f"{BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx"
        params = {"leagueId": "1", "seasonId": season, "currentPage": str(page)}
        resp = session.get(url, params=params, timeout=15)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        table = soup.find("table")

        if not table:
            raise HTTPException(status_code=503, detail="데이터를 가져올 수 없습니다")

        rows = table.find_all("tr")
        result = []
        for row in rows[1:]:
            cols = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cols) < 5:
                continue
            team_info = get_team_info(cols[2] if len(cols) > 2 else "")
            item = {
                "rank": int(cols[0]) if cols[0].isdigit() else 0,
                "playerName": cols[1] if len(cols) > 1 else "",
                "teamName": cols[2] if len(cols) > 2 else "",
                "teamShort": team_info["short"],
                "colors": team_info["colors"],
                "era": cols[3] if len(cols) > 3 else "0.00",
                "games": int(cols[4]) if len(cols) > 4 and cols[4].isdigit() else 0,
                "wins": int(cols[5]) if len(cols) > 5 and cols[5].isdigit() else 0,
                "losses": int(cols[6]) if len(cols) > 6 and cols[6].isdigit() else 0,
                "saves": int(cols[7]) if len(cols) > 7 and cols[7].isdigit() else 0,
                "holds": int(cols[8]) if len(cols) > 8 and cols[8].isdigit() else 0,
                "wpct": cols[9] if len(cols) > 9 else "0",
                "ip": cols[10] if len(cols) > 10 else "0",
                "hits": int(cols[11]) if len(cols) > 11 and cols[11].isdigit() else 0,
                "hr": int(cols[12]) if len(cols) > 12 and cols[12].isdigit() else 0,
                "bb": int(cols[13]) if len(cols) > 13 and cols[13].isdigit() else 0,
                "hbp": int(cols[14]) if len(cols) > 14 and cols[14].isdigit() else 0,
                "so": int(cols[15]) if len(cols) > 15 and cols[15].isdigit() else 0,
                "runs": int(cols[16]) if len(cols) > 16 and cols[16].isdigit() else 0,
                "er": int(cols[17]) if len(cols) > 17 and cols[17].isdigit() else 0,
                "whip": cols[18] if len(cols) > 18 else "0.00",
            }
            result.append(item)

        data = {"data": result, "season": season, "page": page, "updatedAt": datetime.now().isoformat()}
        set_cache(cache_key, data)
        return data

    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# ─── 경기 일정/결과 ───────────────────────────────────────────
@app.get("/api/schedule")
def get_schedule(game_date: Optional[str] = Query(default=None)):
    if not game_date:
        game_date = date.today().strftime("%Y%m%d")

    cache_key = f"schedule_{game_date}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    try:
        session = get_session()
        url = f"{BASE_URL}/Schedule/Schedule.aspx"
        params = {"date": game_date, "leagueId": "1"}
        resp = session.get(url, params=params, timeout=15)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")

        games = []
        # 경기 결과 파싱 (KBO 사이트 구조에 맞게)
        game_boxes = soup.find_all("div", class_="game-cont") or soup.find_all("li", class_="game")
        
        if not game_boxes:
            # 테이블 방식으로 시도
            tables = soup.find_all("table")
            for table in tables:
                rows = table.find_all("tr")
                for row in rows[1:]:
                    cols = [td.get_text(strip=True) for td in row.find_all("td")]
                    if len(cols) >= 4:
                        games.append({
                            "gameDate": game_date,
                            "awayTeam": cols[0] if len(cols) > 0 else "",
                            "awayScore": cols[1] if len(cols) > 1 else "",
                            "homeScore": cols[2] if len(cols) > 2 else "",
                            "homeTeam": cols[3] if len(cols) > 3 else "",
                            "status": "완료",
                            "stadium": cols[4] if len(cols) > 4 else "",
                        })

        data = {"data": games, "gameDate": game_date, "updatedAt": datetime.now().isoformat()}
        set_cache(cache_key, data)
        return data

    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# ─── 선수 검색 ────────────────────────────────────────────────
@app.get("/api/search")
def search_players(q: str = Query(..., min_length=1), season: str = Query(default="2026")):
    if len(q) < 1:
        return {"data": []}

    # 타자 + 투수 데이터에서 검색
    results = []
    try:
        hitters_data = get_hitters(season=season, page=1)
        for p in hitters_data.get("data", []):
            if q in p.get("playerName", "") or q in p.get("teamName", ""):
                results.append({**p, "type": "hitter"})

        pitchers_data = get_pitchers(season=season, page=1)
        for p in pitchers_data.get("data", []):
            if q in p.get("playerName", "") or q in p.get("teamName", ""):
                results.append({**p, "type": "pitcher"})

    except Exception:
        pass

    return {"data": results[:20], "query": q}


# ─── 통합 리더보드 ────────────────────────────────────────────
@app.get("/api/leaderboard")
def get_leaderboard(
    category: str = Query(default="avg"),
    season: str = Query(default="2026"),
    team: Optional[str] = Query(default=None),
    limit: int = Query(default=30),
):
    pitcher_stats = {"era", "wins", "so", "whip", "saves", "holds", "ip"}
    # HR, RBI, 안타 등은 Basic1 데이터 사용, OPS/OBP/SLG는 Basic2 사용
    basic1_stats = {"hr", "rbi", "hits", "runs", "doubles", "triples", "tb", "sac", "sf"}
    is_pitcher = category in pitcher_stats

    if is_pitcher:
        raw = get_pitchers(season=season)
        data = raw.get("data", [])
        sort_key_map = {
            "era": lambda x: float(x.get("era", "99.99") or "99.99"),
            "wins": lambda x: -x.get("wins", 0),
            "so": lambda x: -x.get("so", 0),
            "whip": lambda x: float(x.get("whip", "99.99") or "99.99"),
            "saves": lambda x: -x.get("saves", 0),
            "holds": lambda x: -x.get("holds", 0),
        }
        sort_fn = sort_key_map.get(category, lambda x: x.get("rank", 999))
    elif category in basic1_stats:
        # Basic1 데이터 사용 (HR, RBI, 안타 등)
        raw = get_hitters(season=season)
        data = raw.get("data", [])
        sort_key_map = {
            "hr": lambda x: -x.get("hr", 0),
            "rbi": lambda x: -x.get("rbi", 0),
            "hits": lambda x: -x.get("hits", 0),
            "runs": lambda x: -x.get("runs", 0),
            "doubles": lambda x: -x.get("doubles", 0),
            "triples": lambda x: -x.get("triples", 0),
            "tb": lambda x: -x.get("tb", 0),
            "avg": lambda x: -float(x.get("avg", "0") or "0"),
        }
        sort_fn = sort_key_map.get(category, lambda x: x.get("rank", 999))
    else:
        # Basic2 데이터 사용 (OPS, OBP, SLG, BB, SO 등)
        raw = get_hitters_ops(season=season)
        data = raw.get("data", [])
        sort_key_map = {
            "avg": lambda x: -float(x.get("avg", "0") or "0"),
            "ops": lambda x: -float(x.get("ops", "0") or "0"),
            "obp": lambda x: -float(x.get("obp", "0") or "0"),
            "slg": lambda x: -float(x.get("slg", "0") or "0"),
            "sb": lambda x: -x.get("sb", 0),
            "bb": lambda x: -x.get("bb", 0),
            "so": lambda x: -x.get("so", 0),
        }
        sort_fn = sort_key_map.get(category, lambda x: x.get("rank", 999))

    if team:
        data = [p for p in data if team in p.get("teamName", "") or team in p.get("teamShort", "")]

    try:
        data = sorted(data, key=sort_fn)
    except Exception:
        pass

    # 순위 재계산
    for i, item in enumerate(data):
        item["leaderboardRank"] = i + 1

    return {
        "data": data[:limit],
        "category": category,
        "season": season,
        "updatedAt": datetime.now().isoformat(),
    }


# ─── 헬스체크 ─────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
