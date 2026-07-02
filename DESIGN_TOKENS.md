# KBO Records Design Tokens

> 기준 시안: **A. Press Box Ledger**
> 목적: 기록지/신문/아카이브 느낌을 일관되게 구현하기 위한 색, 글꼴, 간격, 선, 상태값 기준.

---

## 1. 토큰 설계 방향

시각 요소는 “화려한 스포츠 앱”보다 “잘 정리된 기록 장부”에 맞춘다.

- 기본은 밝은 기록지 톤
- 숫자는 또렷하고 정렬이 쉬워야 함
- 선과 여백으로 구조를 만든다
- 팀 컬러는 작은 면적에만 사용한다
- 그림자는 약하게, 경계선은 분명하게

CSS 변수 이름은 가능하면 기존 shadcn/Tailwind 토큰(`background`, `foreground`, `card`, `border`, `primary`)과 연결한다.

---

## 2. Color Tokens

### 2.1 Light Theme

| Token                  |     Value | 용도                       |
| ---------------------- | --------: | -------------------------- |
| `--background`         | `#F7F3EA` | 전체 종이색 배경           |
| `--foreground`         | `#111827` | 기본 본문 텍스트           |
| `--muted`              | `#EDE7DB` | 필터바, 표 헤더, 보조 배경 |
| `--muted-foreground`   | `#6B665C` | 보조 설명, caption         |
| `--card`               | `#FBF8F0` | 카드/패널 배경             |
| `--card-foreground`    | `#111827` | 카드 내부 텍스트           |
| `--popover`            | `#FFFDF7` | 드롭다운, 툴팁 배경        |
| `--popover-foreground` | `#111827` | 드롭다운 텍스트            |
| `--border`             | `#D8D0C2` | 기본 경계선                |
| `--border-strong`      | `#9C9385` | 표 상단선, 섹션 구분선     |
| `--input`              | `#D8D0C2` | 입력창 경계                |
| `--ring`               | `#2F5D8C` | focus ring                 |
| `--primary`            | `#183B59` | 주요 링크, 활성 상태       |
| `--primary-foreground` | `#FFFDF7` | primary 위 텍스트          |
| `--accent`             | `#E7EEF5` | hover 배경                 |
| `--accent-foreground`  | `#183B59` | accent 위 텍스트           |
| `--destructive`        | `#B42318` | 오류, 패배 강조            |
| `--success`            | `#16824A` | 승리, 긍정 상태            |
| `--draw`               | `#7A808A` | 무승부                     |
| `--warning`            | `#B7791F` | 주의, B등급 등             |
| `--note`               | `#6F4E37` | 주석, 아카이브 장식        |

### 2.2 Dark Theme

다크 테마는 보조 모드다. 현재처럼 어두운 경기장 느낌을 유지하되, 시안 A의 기록지 질서를 잃지 않는다.

| Token                  |     Value | 용도              |
| ---------------------- | --------: | ----------------- |
| `--background`         | `#101722` | 전체 배경         |
| `--foreground`         | `#F3EDE2` | 기본 텍스트       |
| `--muted`              | `#1D2735` | 필터바, 표 헤더   |
| `--muted-foreground`   | `#9FA9B7` | 보조 텍스트       |
| `--card`               | `#172131` | 카드/패널 배경    |
| `--card-foreground`    | `#F3EDE2` | 카드 내부 텍스트  |
| `--popover`            | `#111A27` | 드롭다운 배경     |
| `--popover-foreground` | `#F3EDE2` | 드롭다운 텍스트   |
| `--border`             | `#2C394A` | 기본 경계선       |
| `--border-strong`      | `#607086` | 강한 구분선       |
| `--primary`            | `#7DB7E8` | 링크/활성 상태    |
| `--primary-foreground` | `#07111F` | primary 위 텍스트 |
| `--accent`             | `#223047` | hover 배경        |
| `--accent-foreground`  | `#D8EBFF` | accent 위 텍스트  |
| `--destructive`        | `#FF5A5F` | 오류, 패배        |
| `--success`            | `#21B36B` | 승리              |
| `--draw`               | `#8E99A8` | 무승부            |
| `--warning`            | `#F1B94E` | 주의              |
| `--note`               | `#C8A06D` | 주석              |

---

## 3. Team Color Tokens

팀 컬러는 넓은 배경으로 쓰지 않는다. 작은 식별 요소에 제한한다.

권장 사용처:

- 팀 로고 옆 2px accent line
- 순위 카드 상단 얇은 선
- 팀 badge border
- 표 행 hover의 아주 옅은 tint
- 선수 상세 헤더의 작은 강조색

비권장 사용처:

- 전체 카드 배경을 팀 컬러로 채우기
- 강한 그라디언트 배경
- 긴 문장 텍스트에 팀 컬러 적용
- 동시에 여러 팀 컬러를 큰 면적으로 배치

권장 투명도:

| 용도             |     Alpha |
| ---------------- | --------: |
| 배경 tint        | `08`~`12` |
| border tint      | `33`~`55` |
| 얇은 accent line |    `100%` |
| hover tint       | `10`~`18` |

---

## 4. Typography Tokens

### 4.1 Font Families

| Token          | 권장값                                               | 용도                        |
| -------------- | ---------------------------------------------------- | --------------------------- |
| `--font-sans`  | `Pretendard, Noto Sans KR, system-ui, sans-serif`    | 기본 UI, 한글 본문          |
| `--font-serif` | `Noto Serif KR, IBM Plex Serif, Georgia, serif`      | 큰 제목, 기록지 제목, 인용  |
| `--font-stat`  | `Roboto Condensed, Inter, JetBrains Mono, monospace` | 숫자, 표 수치, 순위         |
| `--font-mono`  | `JetBrains Mono, ui-monospace, monospace`            | 코드성 지표, 짧은 고정폭 값 |

### 4.2 Type Scale

| Token         | Size / Line-height | 용도                |
| ------------- | ------------------ | ------------------- |
| `--text-xs`   | `12px / 16px`      | 표 주석, 보조 설명  |
| `--text-sm`   | `14px / 20px`      | 표 본문, 필터, 메뉴 |
| `--text-md`   | `16px / 24px`      | 일반 본문           |
| `--text-lg`   | `18px / 26px`      | 섹션 제목           |
| `--text-xl`   | `22px / 30px`      | 페이지 보조 제목    |
| `--text-page` | `32px / 40px`      | 페이지 제목         |
| `--text-stat` | `36px / 40px`      | 대표 기록 숫자      |

규칙:

- 표 안의 숫자는 `font-stat`과 `tabular-nums`를 사용한다.
- 페이지 제목은 너무 크지 않게 유지한다.
- 카드 안 제목은 `text-sm`~`text-lg` 범위에 둔다.
- letter spacing은 기본값을 유지한다. 과한 자간은 기록지 느낌을 해친다.

---

## 5. Spacing Tokens

기본 단위는 4px이며, 기록실 UI는 넓은 여백보다 **정확한 간격**을 우선한다.

| Token       |  Value | 용도                    |
| ----------- | -----: | ----------------------- |
| `--space-1` |  `4px` | 아이콘/텍스트 미세 간격 |
| `--space-2` |  `8px` | 버튼 내부, 작은 gap     |
| `--space-3` | `12px` | 표 셀 좌우 여백         |
| `--space-4` | `16px` | 카드 내부 기본 padding  |
| `--space-5` | `20px` | 필터바, 섹션 내부       |
| `--space-6` | `24px` | 페이지 섹션 간격        |
| `--space-8` | `32px` | 큰 영역 간격            |

---

## 6. Radius Tokens

시안 A는 둥근 SaaS 카드보다 기록지/문서 느낌이 강하므로 radius를 낮춘다.

| Token           |   Value | 용도           |
| --------------- | ------: | -------------- |
| `--radius-xs`   |   `2px` | 표 안 작은 칩  |
| `--radius-sm`   |   `4px` | 버튼, 입력창   |
| `--radius-md`   |   `6px` | 카드, 패널     |
| `--radius-lg`   |   `8px` | 큰 패널, 모달  |
| `--radius-pill` | `999px` | W/L/D 칩, 배지 |

규칙:

- 일반 카드 radius는 `6px` 이하를 기본으로 한다.
- 대형 패널도 `8px`를 넘기지 않는다.
- 원형/알약형은 상태 칩과 작은 배지에만 사용한다.

---

## 7. Border & Shadow Tokens

### Border

| Token           | Value                             | 용도                 |
| --------------- | --------------------------------- | -------------------- |
| `--line-hair`   | `1px solid var(--border)`         | 기본 경계            |
| `--line-strong` | `1px solid var(--border-strong)`  | 표 상단, 중요 구분   |
| `--line-dashed` | `1px dashed var(--border-strong)` | 커트라인, 기준선     |
| `--line-accent` | `2px solid var(--primary)`        | 활성 메뉴, 선택 상태 |

### Shadow

그림자는 “떠 있는 카드”보다 “종이 겹침” 정도로만 사용한다.

| Token            | Value                             | 용도           |
| ---------------- | --------------------------------- | -------------- |
| `--shadow-paper` | `0 1px 2px rgb(17 24 39 / 0.08)`  | 기본 카드      |
| `--shadow-raise` | `0 8px 20px rgb(17 24 39 / 0.10)` | 드롭다운, 모달 |
| `--shadow-none`  | `none`                            | 표, 큰 영역    |

---

## 8. Table Tokens

| Token                 |              Value | 용도            |
| --------------------- | -----------------: | --------------- |
| `--table-row-height`  |             `44px` | 일반 표 행      |
| `--table-row-compact` |             `36px` | 조밀한 기록표   |
| `--table-cell-x`      |             `12px` | 셀 좌우 padding |
| `--table-header-bg`   |     `var(--muted)` | 표 헤더         |
| `--table-hover-bg`    |    `var(--accent)` | 행 hover        |
| `--table-border`      | `var(--line-hair)` | 행 구분선       |

숫자 열:

- 오른쪽 정렬
- `tabular-nums`
- 소수점 자리 유지
- 주요 지표는 `primary` 또는 굵기만으로 강조

---

## 9. Status Tokens

### Game Result Chips

| 상태 | 배경            | 텍스트    | 표기 |
| ---- | --------------- | --------- | ---- |
| 승   | `--success`     | `#FFFFFF` | `W`  |
| 패   | `--destructive` | `#FFFFFF` | `L`  |
| 무   | `--draw`        | `#FFFFFF` | `D`  |

칩 크기:

- Desktop: `18px x 18px`
- Compact: `16px x 16px`
- Radius: `2px` 또는 `3px`
- Font: `10px`, bold, `font-stat`

### FA Grade Badges

| 등급 | 색상 방향     | 용도        |
| ---- | ------------- | ----------- |
| A    | red / ink red | 핵심 전력급 |
| B    | amber / brass | 전력 보강급 |
| C    | green / field | 뎁스/백업급 |

배지는 배경색을 옅게 쓰고 border와 텍스트로 구분한다.

---

## 10. Icon Tokens

아이콘은 Lucide를 기본으로 사용한다.

| Token       |   Size | 용도               |
| ----------- | -----: | ------------------ |
| `--icon-xs` | `12px` | 표 헤더, 작은 설명 |
| `--icon-sm` | `16px` | 버튼, 입력창       |
| `--icon-md` | `20px` | 메뉴, 섹션 제목    |
| `--icon-lg` | `24px` | 페이지 제목 옆     |

규칙:

- 아이콘 단독 버튼은 tooltip을 제공한다.
- 장식용 아이콘은 사용하지 않는다.
- 야구 관련 커스텀 아이콘은 꼭 필요한 곳에만 둔다.

---

## 11. Motion Tokens

기록 조회 서비스는 빠르고 안정적으로 느껴져야 한다.

| Token             |                             Value | 용도          |
| ----------------- | --------------------------------: | ------------- |
| `--duration-fast` |                           `120ms` | hover, active |
| `--duration-base` |                           `180ms` | dropdown, tab |
| `--duration-slow` |                           `240ms` | modal, drawer |
| `--ease-out`      |  `cubic-bezier(0.23, 1, 0.32, 1)` | enter/hover   |
| `--ease-in-out`   | `cubic-bezier(0.77, 0, 0.175, 1)` | 이동/전환     |

규칙:

- 표 행 hover는 즉각적이어야 한다.
- 숫자 카운트업은 핵심 대표 수치에만 제한한다.
- 필터 변경 후 데이터 로딩은 skeleton보다 얇은 loading bar를 우선한다.
- `prefers-reduced-motion`을 존중한다.

---

## 12. Suggested CSS Variable Draft

```css
:root {
  --background: #f7f3ea;
  --foreground: #111827;
  --card: #fbf8f0;
  --card-foreground: #111827;
  --muted: #ede7db;
  --muted-foreground: #6b665c;
  --popover: #fffdf7;
  --popover-foreground: #111827;
  --border: #d8d0c2;
  --border-strong: #9c9385;
  --primary: #183b59;
  --primary-foreground: #fffdf7;
  --accent: #e7eef5;
  --accent-foreground: #183b59;
  --destructive: #b42318;
  --success: #16824a;
  --draw: #7a808a;
  --warning: #b7791f;
  --note: #6f4e37;
  --radius: 6px;
}

.dark {
  --background: #101722;
  --foreground: #f3ede2;
  --card: #172131;
  --card-foreground: #f3ede2;
  --muted: #1d2735;
  --muted-foreground: #9fa9b7;
  --popover: #111a27;
  --popover-foreground: #f3ede2;
  --border: #2c394a;
  --border-strong: #607086;
  --primary: #7db7e8;
  --primary-foreground: #07111f;
  --accent: #223047;
  --accent-foreground: #d8ebff;
  --destructive: #ff5a5f;
  --success: #21b36b;
  --draw: #8e99a8;
  --warning: #f1b94e;
  --note: #c8a06d;
}
```
