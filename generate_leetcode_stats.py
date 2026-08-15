#!/usr/bin/env python3
"""
LeetCode Live Stats Widget Generator
Generates a highly aesthetic, animated SVG stats dashboard for GitHub profiles.
"""

import json
import requests
import argparse
import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List

# Single optimized GraphQL query for all stats
LEETCODE_QUERY = """
query getUserStats($username: String!) {
  allQuestionsCount {
    difficulty
    count
  }
  matchedUser(username: $username) {
    username
    profile {
      realName
      ranking
      userAvatar
    }
    submitStats {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
    submissionCalendar
    languageProblemCount {
      languageName
      problemsSolved
    }
    tagProblemCounts {
      advanced {
        tagName
        problemsSolved
      }
      intermediate {
        tagName
        problemsSolved
      }
      fundamental {
        tagName
        problemsSolved
      }
    }
  }
  recentSubmissionList(username: $username, limit: 6) {
    title
    titleSlug
    timestamp
    statusDisplay
    lang
  }
}
"""

THEMES = {
  "dark": {
    "bg": "#0d1117",
    "card": "#161b22",
    "border": "#30363d",
    "text": "#e6edf3",
    "subtext": "#8b949e",
    "easy": "#00b8a3",
    "medium": "#ffa116",
    "hard": "#ef4743",
    "accent": "#58a6ff",
    "flame": "#f7931a",
    "gridActive": "#39d353",
    "gridBg": "#161b22"
  },
  "cyberpunk": {
    "bg": "#05030a",
    "card": "#0d0a1b",
    "border": "#ff0055",
    "text": "#00ffcc",
    "subtext": "#82829f",
    "easy": "#00ffcc",
    "medium": "#ffe600",
    "hard": "#ff0055",
    "accent": "#00ffcc",
    "flame": "#ff00ea",
    "gridActive": "#ff0055",
    "gridBg": "#18142a"
  },
  "nord": {
    "bg": "#2e3440",
    "card": "#3b4252",
    "border": "#4c566a",
    "text": "#eceff4",
    "subtext": "#d8dee9",
    "easy": "#a3be8c",
    "medium": "#ebcb8b",
    "hard": "#bf616a",
    "accent": "#88c0d0",
    "flame": "#d08770",
    "gridActive": "#88c0d0",
    "gridBg": "#2e3440"
  },
  "sunset": {
    "bg": "#1a0e1c",
    "card": "#29142c",
    "border": "#4a154b",
    "text": "#fff0f5",
    "subtext": "#c39bbd",
    "easy": "#ffd700",
    "medium": "#ff8c00",
    "hard": "#ff3e3e",
    "accent": "#ff69b4",
    "flame": "#ff4500",
    "gridActive": "#ff69b4",
    "gridBg": "#1e0a20"
  },
  "neon": {
    "bg": "#000000",
    "card": "#080808",
    "border": "#39ff14",
    "text": "#ffffff",
    "subtext": "#7a7a7a",
    "easy": "#39ff14",
    "medium": "#00ffff",
    "hard": "#ff007f",
    "accent": "#00ffff",
    "flame": "#ffea00",
    "gridActive": "#39ff14",
    "gridBg": "#121212"
  },
  "glassmorphism": {
    "bg": "transparent",
    "card": "rgba(255, 255, 255, 0.04)",
    "border": "rgba(255, 255, 255, 0.08)",
    "text": "#ffffff",
    "subtext": "rgba(255, 255, 255, 0.5)",
    "easy": "#00f2fe",
    "medium": "#ffa116",
    "hard": "#ff4b2b",
    "accent": "#00f2fe",
    "flame": "#ff416c",
    "gridActive": "#00f2fe",
    "gridBg": "rgba(255, 255, 255, 0.02)"
  }
}

def adjust_color_brightness(hex_color: str, percent: float) -> str:
    if hex_color == 'transparent' or not hex_color.startswith('#'):
        return hex_color
    try:
        r = int(hex_color[1:3], 16)
        g = int(hex_color[3:5], 16)
        b = int(hex_color[5:7], 16)
        
        r = min(255, int(r * percent))
        g = min(255, int(g * percent))
        b = min(255, int(b * percent))
        
        return f"#{r:02x}{g:02x}{b:02x}"
    except Exception:
        return hex_color

def get_heat_color(count: int, theme: Dict) -> str:
    if count == 0:
        return theme["gridBg"]
    opacity = min(0.2 + (count * 0.15), 1.0)
    if theme["gridActive"].startswith('#'):
        alpha = f"{round(opacity * 255):02x}"
        return theme["gridActive"] + alpha
    return theme["gridActive"]

def get_lang_color(lang: str) -> str:
    colors = {
        "python": "#3572A5", "python3": "#3572A5", "java": "#b07219", "javascript": "#f1e05a",
        "c++": "#f34b7d", "cpp": "#f34b7d", "c": "#555555", "c#": "#178600", "csharp": "#178600",
        "go": "#00ADD8", "rust": "#dea584", "typescript": "#2b7489", "sql": "#e38c00", "mysql": "#e38c00"
    }
    return colors.get(lang.lower(), "#6e7681")

def get_relative_time(timestamp: int) -> str:
    diff = int(datetime.now(timezone.utc).timestamp()) - timestamp
    if diff < 60:
        return "Just now"
    mins = diff // 60
    if mins < 60:
        return f"{mins}m ago"
    hours = mins // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    return f"{days}d ago"

def fetch_leetcode_data(username: str) -> Dict:
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Referer": "https://leetcode.com/"
    }
    resp = requests.post(
        "https://leetcode.com/graphql",
        json={"query": LEETCODE_QUERY, "variables": {"username": username}},
        headers=headers
    )
    resp.raise_for_status()
    return resp.json()

def calculate_stats(calendar_str: str) -> Dict:
    calendar = json.loads(calendar_str or "{}")
    date_counts = {}
    
    # Calculate date strings in UTC
    for ts_str, count in calendar.items():
        dt = datetime.fromtimestamp(int(ts_str), tz=timezone.utc)
        d_str = dt.strftime("%Y-%m-%d")
        date_counts[d_str] = date_counts.get(d_str, 0) + count
        
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)
    
    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = yesterday.strftime("%Y-%m-%d")
    
    # Calculate current streak
    current_streak = 0
    check_date = today
    check_str = today_str
    
    if check_str not in date_counts:
        check_date = yesterday
        check_str = yesterday_str
        
    while check_str in date_counts:
        current_streak += 1
        check_date -= timedelta(days=1)
        check_str = check_date.strftime("%Y-%m-%d")
        
    # Calculate max streak
    sorted_dates = sorted(date_counts.keys())
    max_streak = 0
    temp_streak = 0
    prev_date = None
    
    for date_str in sorted_dates:
        curr_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        if prev_date is None:
            temp_streak = 1
        else:
            diff = (curr_date - prev_date).days
            if diff == 1:
                temp_streak += 1
            elif diff > 1:
                max_streak = max(max_streak, temp_streak)
                temp_streak = 1
        prev_date = curr_date
        
    max_streak = max(max_streak, temp_streak, current_streak)
    
    # 7-day progress
    weekly = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        d_str = d.strftime("%Y-%m-%d")
        weekly.append({
            "day": d.strftime("%a"),
            "count": date_counts.get(d_str, 0),
            "is_today": i == 0
        })
        
    # Heatmap (53 weeks)
    heatmap = []
    start_heatmap = today - timedelta(days=364)
    days_since_sunday = (start_heatmap.weekday() + 1) % 7
    heatmap_start = start_heatmap - timedelta(days=days_since_sunday)
    
    current_date = heatmap_start
    for week in range(53):
        for day in range(7):
            d_str = current_date.strftime("%Y-%m-%d")
            count = date_counts.get(d_str, 0)
            heatmap.append({
                "x": week * 11,
                "y": day * 11,
                "count": count,
                "date": current_date.strftime("%b %d")
            })
            current_date += timedelta(days=1)
            
    return {
        "current_streak": current_streak,
        "max_streak": max_streak,
        "active_days": len(date_counts),
        "today_count": date_counts.get(today_str, 0),
        "yesterday_count": date_counts.get(yesterday_str, 0),
        "weekly": weekly,
        "heatmap": heatmap
    }

def generate_svg(data: Dict, stats: Dict, theme_name: str) -> str:
    theme = THEMES.get(theme_name, THEMES["dark"])
    matchedUser = data["data"]["matchedUser"]
    allQuestionsCount = data["data"]["allQuestionsCount"]
    recentSubmissions = data["data"].get("recentSubmissionList", [])
    
    username = matchedUser["username"]
    realName = matchedUser["profile"]["realName"] or username
    ranking = matchedUser["profile"]["ranking"]
    
    # Donut chart stroke math
    solved_stats = matchedUser["submitStats"]["acSubmissionNum"]
    easySolved = next((s["count"] for s in solved_stats if s["difficulty"] == "Easy"), 0)
    mediumSolved = next((s["count"] for s in solved_stats if s["difficulty"] == "Medium"), 0)
    hardSolved = next((s["count"] for s in solved_stats if s["difficulty"] == "Hard"), 0)
    totalSolved = next((s["count"] for s in solved_stats if s["difficulty"] == "All"), 0)
    
    easyTotal = next((q["count"] for q in allQuestionsCount if q["difficulty"] == "Easy"), 1)
    mediumTotal = next((q["count"] for q in allQuestionsCount if q["difficulty"] == "Medium"), 1)
    hardTotal = next((q["count"] for q in allQuestionsCount if q["difficulty"] == "Hard"), 1)
    allTotal = next((q["count"] for q in allQuestionsCount if q["difficulty"] == "All"), 1)
    
    r = 42
    circ = 2 * math.pi * r
    
    pctEasy = easySolved / allTotal
    pctMedium = mediumSolved / allTotal
    pctHard = hardSolved / allTotal
    
    easyStroke = pctEasy * circ
    mediumStroke = pctMedium * circ
    hardStroke = pctHard * circ
    
    easyOffset = 0
    mediumOffset = -easyStroke
    hardOffset = -(easyStroke + mediumStroke)
    
    # 7-day progress graph calculations
    weekly = stats["weekly"]
    max_weekly = max([d["count"] for d in weekly] or [1])
    if max_weekly == 0:
        max_weekly = 1
        
    gx, gy, gw, gh = 30, 30, 180, 60
    points = []
    for idx, d in enumerate(weekly):
        x = gx + idx * (gw / 6)
        y = gy + gh - (d["count"] / max_weekly * gh)
        points.append({"x": x, "y": y, "count": d["count"], "day": d["day"], "is_today": d["is_today"]})
        
    linePath = "M " + " L ".join([f"{p['x']},{p['y']}" for p in points])
    areaPath = linePath + f" L {points[-1]['x']},{gy+gh} L {points[0]['x']},{gy+gh} Z"
    
    graphCircles = ""
    for p in points:
        strokeColor = theme["accent"] if p["is_today"] else theme["gridActive"]
        graphCircles += f'''<circle cx="{p["x"]}" cy="{p["y"]}" r="3.5" fill="{theme["card"]}" stroke="{strokeColor}" stroke-width="1.5">
          <animate attributeName="r" values="3.5;5;3.5" dur="3s" repeatCount="indefinite"/>
        </circle>'''
        
    graphLabels = ""
    for p in points:
        textColor = theme["accent"] if p["is_today"] else theme["subtext"]
        weight = 'font-weight="bold"' if p["is_today"] else ''
        graphLabels += f'<text x="{p["x"]}" y="{gy + gh + 14}" fill="{textColor}" {weight} font-size="7" font-family="monospace" text-anchor="middle">{p["day"][0]}</text>'
        
    # Languages Bar Chart
    topLangs = sorted(matchedUser["languageProblemCount"] or [], key=lambda x: x["problemsSolved"], reverse=True)[:4]
    langsSvg = ""
    for index, lang in enumerate(topLangs):
        y = 30 + index * 32
        color = get_lang_color(lang["languageName"])
        maxSolved = topLangs[0]["problemsSolved"] or 1
        barWidth = max(10, (lang["problemsSolved"] / maxSolved) * 160)
        langsSvg += f'''<g transform="translate(15, {y})">
          <text x="0" y="10" fill="{theme["text"]}" font-size="9" font-family="-apple-system, sans-serif" font-weight="500">{lang["languageName"]}</text>
          <rect x="0" y="16" width="160" height="5" rx="2.5" fill="{theme["bg"] if theme["bg"] != "transparent" else "rgba(255,255,255,0.06)"}"/>
          <rect x="0" y="16" width="{barWidth}" height="5" rx="2.5" fill="{color}">
            <animate attributeName="width" from="0" to="{barWidth}" dur="1.5s" fill="freeze"/>
          </rect>
          <text x="175" y="10" fill="{theme["text"]}" font-size="10" font-family="monospace" font-weight="bold">{lang["problemsSolved"]}</text>
          <text x="210" y="10" fill="{theme["subtext"]}" font-size="7.5" font-family="-apple-system, sans-serif">solved</text>
        </g>'''
        
    # Skills Tags
    tags = matchedUser["tagProblemCounts"] or {}
    advancedTags = (tags.get("advanced") or [])[:3]
    intermediateTags = (tags.get("intermediate") or [])[:3]
    fundamentalTags = (tags.get("fundamental") or [])[:3]
    
    skillsHtml = ""
    curY = 35
    
    def render_tag_row(label, labelColor, badgeBg, borderCol, list_tags):
        nonlocal curY
        if not list_tags:
            return ""
        row = f'<text x="15" y="{curY}" fill="{labelColor}" font-size="8.5" font-weight="bold" font-family="-apple-system, sans-serif">{label}</text>'
        curY += 12
        curX = 15
        for tag in list_tags:
            textLen = len(tag["tagName"]) * 5.2 + 10
            row += f'''<g transform="translate({curX}, {curY})">
              <rect width="{textLen}" height="18" rx="9" fill="{badgeBg}" stroke="{borderCol}" stroke-width="0.8"/>
              <text x="{textLen/2}" y="11.5" fill="{labelColor}" font-size="7" font-weight="600" font-family="monospace" text-anchor="middle">{tag["tagName"]}</text>
              <text x="{textLen + 6}" y="12" fill="{theme["subtext"]}" font-size="7.5" font-family="monospace">x{tag["problemsSolved"]}</text>
            </g>'''
            curX += textLen + 30
        curY += 34
        return row
        
    skillsHtml += render_tag_row('Advanced Categories', theme["hard"], 'rgba(239, 71, 67, 0.08)', theme["hard"] + '40', advancedTags)
    skillsHtml += render_tag_row('Intermediate Categories', theme["medium"], 'rgba(255, 161, 22, 0.08)', theme["medium"] + '40', intermediateTags)
    skillsHtml += render_tag_row('Fundamental Categories', theme["easy"], 'rgba(0, 184, 163, 0.08)', theme["easy"] + '40', fundamentalTags)
    
    # Recent submissions
    recSubsSvg = ""
    for idx, sub in enumerate(recentSubmissions):
        y = 30 + idx * 46
        isAC = sub["statusDisplay"] == "Accepted"
        statusCol = theme["easy"] if isAC else theme["hard"]
        relativeTime = get_relative_time(int(sub["timestamp"]))
        title_display = sub["title"]
        if len(title_display) > 34:
            title_display = title_display[:32] + ".."
            
        recSubsSvg += f'''<g transform="translate(15, {y})">
          <circle cx="6" cy="14" r="3.5" fill="{statusCol}"/>
          <text x="22" y="12" fill="{theme["text"]}" font-size="9.5" font-weight="bold" font-family="-apple-system, sans-serif">{title_display}</text>
          <text x="22" y="24" fill="{theme["subtext"]}" font-size="8" font-family="monospace">{sub["lang"]} • {relativeTime}</text>
          <rect x="360" y="4" width="55" height="15" rx="3.5" fill="{"rgba(0, 184, 163, 0.08)" if isAC else "rgba(239, 71, 67, 0.08)"}" stroke="{statusCol}" stroke-width="0.5"/>
          <text x="387.5" y="14.5" fill="{statusCol}" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">{"AC" if isAC else "WA"}</text>
          <line x1="0" y1="36" x2="425" y2="36" stroke="{theme["border"]}" stroke-width="0.5"/>
        </g>'''
        
    # Heatmap rects
    heatmapHtml = ""
    for cell in stats["heatmap"]:
        c = get_heat_color(cell["count"], theme)
        heatmapHtml += f'''<rect x="{cell["x"]}" y="{cell["y"]}" width="9" height="9" rx="1.5" fill="{c}">
          <title>{cell["count"]} submissions on {cell["date"]}</title>
        </rect>'''
        
    # Streak math
    currentStreak = stats["current_streak"]
    maxStreak = stats["max_streak"]
    activeDays = stats["active_days"]
    todayCount = stats["today_count"]
    yesterdayCount = stats["yesterday_count"]
    
    streakPct = min(currentStreak / 30, 1.0)
    streakRingCirc = 2 * math.pi * 36
    streakStrokeDash = streakPct * streakRingCirc
    streakStrokeGap = streakRingCirc - streakStrokeDash
    
    statusColor = theme["easy"] if todayCount > 0 else theme["accent"]
    dateUpdateStr = datetime.now(timezone.utc).strftime("%H:%M UTC")
    
    bg_gradient_val = f'''<linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:{theme["bg"]};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:{adjust_color_brightness(theme["bg"], 1.2) if theme["bg"] != "transparent" else "transparent"};stop-opacity:1"/>
      </linearGradient>'''
      
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="950" height="720" viewBox="0 0 950 720" class="theme-{theme_name}">
    <defs>
      <!-- Gradients -->
      {bg_gradient_val}
      <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:{theme["gridActive"]};stop-opacity:0.25"/>
        <stop offset="100%" style="stop-color:{theme["gridActive"]};stop-opacity:0"/>
      </linearGradient>
      <linearGradient id="streakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:{theme["flame"]}"/>
        <stop offset="100%" style="stop-color:#ffd700"/>
      </linearGradient>
      
      <!-- Filters -->
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.55"/>
      </filter>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feColorMatrix type="matrix" values="0 0 0 0 1   0 0 0 0 0.5   0 0 0 0 0   0 0 0 1 0"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <style>
      text {{ font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
      .mono {{ font-family: 'Fira Code', monospace; }}
      
      .card-item {{
        transition: transform 0.3s ease, filter 0.3s ease;
      }}
      
      @keyframes fillDonut {{
        from {{ stroke-dashoffset: {circ}; }}
        to {{ stroke-dashoffset: 0; }}
      }}
      @keyframes pulse {{
        0% {{ transform: scale(1); opacity: 1; }}
        50% {{ transform: scale(1.05); opacity: 0.8; }}
        100% {{ transform: scale(1); opacity: 1; }}
      }}
      @keyframes blink {{
        50% {{ opacity: 0; }}
      }}
      
      .donut-segment {{
        stroke-dasharray: {circ};
        animation: fillDonut 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }}
      
      .flame-icon {{
        transform-origin: 50% 50%;
        animation: pulse 2.2s infinite ease-in-out;
      }}
      
      .cursor-blink {{
        animation: blink 1s step-end infinite;
      }}
    </style>

    <!-- Main Window with Glassmorphism / Shadow -->
    <rect width="950" height="720" rx="14" fill="url(#bgGrad)" stroke="{theme["border"]}" stroke-width="1.5" filter="url(#shadow)"/>
    
    <!-- Title Bar -->
    <path d="M 0,14 A 14,14 0 0,1 14,0 L 936,0 A 14,14 0 0,1 950,14 L 950,38 L 0,38 Z" fill="{"rgba(255,255,255,0.06)" if theme_name == "glassmorphism" else theme["card"]}" stroke="{theme["border"]}" stroke-width="0.5"/>
    <circle cx="20" cy="19" r="6" fill="#ff5f56"/>
    <circle cx="38" cy="19" r="6" fill="#ffbd2e"/>
    <circle cx="56" cy="19" r="6" fill="#27c93f"/>
    <text x="475" y="24" fill="{theme["text"]}" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="1">
      LEETCODE STREAK DASHBOARD<tspan class="cursor-blink" fill="{theme["accent"]}">_</tspan>
    </text>
    <text x="930" y="23" fill="{theme["accent"]}" font-size="10.5" class="mono" text-anchor="end" font-weight="700">@{username}</text>
    
    <!-- ============ ROW 1: 4 CARDS ============ -->
    
    <!-- Card 1: SOLVED DONUT -->
    <g class="card-item" transform="translate(12, 48)">
      <rect width="170" height="175" rx="10" fill="{theme["card"]}" stroke="{theme["border"]}" stroke-width="1"/>
      <text x="85" y="20" fill="{theme["subtext"]}" font-size="9.5" font-weight="700" letter-spacing="0.5" text-anchor="middle">AC PROBLEMS</text>
      
      <!-- Donut segments -->
      <g transform="translate(85, 92)">
        <circle cx="0" cy="0" r="{r}" fill="none" stroke="{"rgba(255,255,255,0.05)" if theme["bg"] == "transparent" else theme["bg"]}" stroke-width="7"/>
        
        <!-- Easy segment -->
        <circle cx="0" cy="0" r="{r}" fill="none" stroke="{theme["easy"]}" stroke-width="7" 
                stroke-dasharray="{easyStroke} {circ - easyStroke}" stroke-dashoffset="{easyOffset}" 
                class="donut-segment" transform="rotate(-90)" stroke-linecap="round"/>
                
        <!-- Medium segment -->
        <circle cx="0" cy="0" r="{r}" fill="none" stroke="{theme["medium"]}" stroke-width="7" 
                stroke-dasharray="{mediumStroke} {circ - mediumStroke}" stroke-dashoffset="{mediumOffset}" 
                class="donut-segment" transform="rotate(-90)" stroke-linecap="round"/>
                
        <!-- Hard segment -->
        <circle cx="0" cy="0" r="{r}" fill="none" stroke="{theme["hard"]}" stroke-width="7" 
                stroke-dasharray="{hardStroke} {circ - hardStroke}" stroke-dashoffset="{hardOffset}" 
                class="donut-segment" transform="rotate(-90)" stroke-linecap="round"/>
                
        <!-- Inner Label -->
        <text x="0" y="1" fill="{theme["text"]}" font-size="20" font-weight="800" text-anchor="middle">{totalSolved}</text>
        <text x="0" y="14" fill="{theme["subtext"]}" font-size="8" class="mono" text-anchor="middle">/ {allTotal}</text>
      </g>
      
      <!-- Legend counts -->
      <g transform="translate(15, 155)" class="mono">
        <circle cx="4" cy="-2" r="3.5" fill="{theme["easy"]}"/>
        <text x="12" y="1" fill="{theme["text"]}" font-size="8.5" font-weight="700">{easySolved}</text>
        
        <circle cx="56" cy="-2" r="3.5" fill="{theme["medium"]}"/>
        <text x="64" y="1" fill="{theme["text"]}" font-size="8.5" font-weight="700">{mediumSolved}</text>
        
        <circle cx="108" cy="-2" r="3.5" fill="{theme["hard"]}"/>
        <text x="116" y="1" fill="{theme["text"]}" font-size="8.5" font-weight="700">{hardSolved}</text>
      </g>
    </g>
    
    <!-- Card 2: STREAK FLAME -->
    <g class="card-item" transform="translate(194, 48)">
      <rect width="170" height="175" rx="10" fill="{theme["card"]}" stroke="{theme["border"]}" stroke-width="1"/>
      <text x="85" y="20" fill="{theme["subtext"]}" font-size="9.5" font-weight="700" letter-spacing="0.5" text-anchor="middle">ACTIVE STREAK</text>
      
      <g transform="translate(85, 82)">
        <!-- Progress Ring for Streak -->
        <circle cx="0" cy="0" r="36" fill="none" stroke="{"rgba(255,255,255,0.05)" if theme["bg"] == "transparent" else theme["bg"]}" stroke-width="5"/>
        <circle cx="0" cy="0" r="36" fill="none" stroke="url(#streakGrad)" stroke-width="5"
                stroke-dasharray="{streakStrokeDash} {streakStrokeGap}" stroke-dashoffset="0"
                transform="rotate(-90)" stroke-linecap="round" filter="url(#glow)"/>
        
        <!-- Flame Vector inside -->
        <g class="flame-icon" transform="translate(-18, -26) scale(0.95)" filter="url(#neonGlow)">
          <path d="M18.8 3C18.8 3 19 8.2 14.5 11.2C9.9 14.3 9.4 19.3 11.4 22.9C13.4 26.5 17.5 28.5 22.2 28C27.9 27.4 31.9 21.6 30.2 16.5C30.2 16.5 30.6 15 28.8 14.5C26.5 13.9 25.1 11.1 26.5 8C27.9 4.9 21.5 0.5 18.8 3Z" fill="url(#streakGrad)"/>
          <path d="M16 11.5C16 11.5 16.8 15.2 14.2 17.8C11.5 20.4 11.8 24.3 13.7 26.8C15.6 29.3 19.8 30 22.5 28.8C25.9 27.3 27.2 22.9 25.8 19.8C25.8 19.8 26.5 18.2 24.8 18C22.6 17.7 21 15 22 12C23 9 17.5 7.5 16 11.5Z" fill="#ff4500" opacity="0.8"/>
          <path d="M18.5 17.5C18.5 17.5 19 19.8 17.8 21.5C16.5 23.2 16.8 25.8 18 27.5C19.2 29.2 22.2 29 23.5 28C25.8 26.3 25 23 24.2 21.5C24.2 21.5 24.5 20.8 23.8 20.5C22.5 20 21.8 18.8 22.2 17.5C22.6 16.2 19.5 15.5 18.5 17.5Z" fill="#ffcc00" opacity="0.9"/>
        </g>
        
        <!-- Streak text overlay -->
        <text x="0" y="24" fill="{theme["text"]}" font-size="20" font-weight="800" text-anchor="middle">{currentStreak}</text>
        <text x="0" y="34" fill="{theme["flame"]}" font-size="7" font-weight="700" letter-spacing="1" text-anchor="middle">STREAK</text>
      </g>
      
      <!-- Best & Active Days -->
      <g transform="translate(10, 143)">
        <rect width="70" height="22" rx="5" fill="{"rgba(255,255,255,0.05)" if theme["bg"] == "transparent" else theme["bg"]}" stroke="{theme["border"]}" stroke-width="0.5"/>
        <text x="35" y="8" fill="{theme["subtext"]}" font-size="6.5" font-weight="700" text-anchor="middle">BEST</text>
        <text x="35" y="18" fill="{theme["flame"]}" font-size="9" font-weight="800" class="mono" text-anchor="middle">{maxStreak}d</text>
        
        <g transform="translate(80, 0)">
          <rect width="70" height="22" rx="5" fill="{"rgba(255,255,255,0.05)" if theme["bg"] == "transparent" else theme["bg"]}" stroke="{theme["border"]}" stroke-width="0.5"/>
          <text x="35" y="8" fill="{theme["subtext"]}" font-size="6.5" font-weight="700" text-anchor="middle">ACTIVE</text>
          <text x="35" y="18" fill="{theme["easy"]}" font-size="9" font-weight="800" class="mono" text-anchor="middle">{activeDays}d</text>
        </g>
      </g>
    </g>
    
    <!-- Card 3: WEEKLY PROGRESSION -->
    <g class="card-item" transform="translate(376, 48)">
      <rect width="240" height="175" rx="10" fill="{theme["card"]}" stroke="{theme["border"]}" stroke-width="1"/>
      <text x="15" y="20" fill="{theme["subtext"]}" font-size="9.5" font-weight="700" letter-spacing="0.5">WEEKLY ACTIVITY</text>
      <text x="225" y="20" fill="{theme["accent"]}" font-size="8" font-weight="bold" class="mono" text-anchor="end">7 DAYS</text>
      
      <!-- Mini Chart -->
      <g transform="translate(15, 20)">
        <path d="{areaPath}" fill="url(#areaGrad)"/>
        <path d="{linePath}" fill="none" stroke="{theme["gridActive"]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
        {graphCircles}
        {graphLabels}
      </g>
      
      <!-- Stats summary block -->
      <g transform="translate(15, 143)">
        <rect width="64" height="22" rx="5" fill="{"rgba(255,255,255,0.05)" if theme["bg"] == "transparent" else theme["bg"]}"/>
        <text x="32" y="8" fill="{theme["subtext"]}" font-size="6.5" font-weight="700" text-anchor="middle">TODAY</text>
        <text x="32" y="18" fill="{theme["easy"] if todayCount > 0 else theme["subtext"]}" font-size="9" font-weight="800" class="mono" text-anchor="middle">{todayCount}</text>
        
        <g transform="translate(73, 0)">
          <rect width="64" height="22" rx="5" fill="{"rgba(255,255,255,0.05)" if theme["bg"] == "transparent" else theme["bg"]}"/>
          <text x="32" y="8" fill="{theme["subtext"]}" font-size="6.5" font-weight="700" text-anchor="middle">YEST</text>
          <text x="32" y="18" fill="{theme["easy"] if yesterdayCount > 0 else theme["subtext"]}" font-size="9" font-weight="800" class="mono" text-anchor="middle">{yesterdayCount}</text>
        </g>
        
        <g transform="translate(146, 0)">
          <rect width="64" height="22" rx="5" fill="{"rgba(255,255,255,0.05)" if theme["bg"] == "transparent" else theme["bg"]}"/>
          <text x="32" y="8" fill="{theme["subtext"]}" font-size="6.5" font-weight="700" text-anchor="middle">RANKING</text>
          <text x="32" y="18" fill="{theme["flame"]}" font-size="8.5" font-weight="800" class="mono" text-anchor="middle">#{ranking // 1000000}M</text>
        </g>
      </g>
    </g>
    
    <!-- Card 4: LANGUAGES BAR CHART -->
    <g class="card-item" transform="translate(628, 48)">
      <rect width="310" height="175" rx="10" fill="{theme["card"]}" stroke="{theme["border"]}" stroke-width="1"/>
      <text x="155" y="20" fill="{theme["subtext"]}" font-size="9.5" font-weight="700" letter-spacing="0.5" text-anchor="middle">TOP LANGUAGES</text>
      {langsSvg}
    </g>
    
    <!-- ============ ROW 2: YEARLY HEATMAP ============ -->
    <g class="card-item" transform="translate(12, 235)">
      <rect width="926" height="120" rx="10" fill="{theme["card"]}" stroke="{theme["border"]}" stroke-width="1"/>
      <text x="15" y="20" fill="{theme["subtext"]}" font-size="9.5" font-weight="700" letter-spacing="0.5">YEARLY SUBMISSIONS</text>
      
      <!-- Week labels -->
      <g transform="translate(35, 33)" fill="{theme["subtext"]}" font-size="7" font-weight="600" class="mono">
        <text x="0" y="0">Jan</text>
        <text x="80" y="0">Mar</text>
        <text x="160" y="0">May</text>
        <text x="240" y="0">Jul</text>
        <text x="320" y="0">Sep</text>
        <text x="400" y="0">Nov</text>
        <text x="480" y="0">Dec</text>
      </g>
      
      <!-- Day Grid Labels -->
      <g transform="translate(15, 48)" fill="{theme["subtext"]}" font-size="7.5" font-weight="bold" class="mono">
        <text x="0" y="8">S</text>
        <text x="0" y="30">T</text>
        <text x="0" y="52">T</text>
        <text x="0" y="74">S</text>
      </g>
      
      <!-- Grid Cells Container (Centered) -->
      <g transform="translate(35, 41)">
        {heatmapHtml}
      </g>
      
      <!-- Legend -->
      <g transform="translate(800, 100)" class="mono" font-size="7.5" fill="{theme["subtext"]}">
        <text x="0" y="8" text-anchor="end">Less</text>
        <rect x="5" y="0" width="8" height="8" rx="1" fill="{theme["gridBg"]}" stroke="{theme["border"]}" stroke-width="0.3"/>
        <rect x="15" y="0" width="8" height="8" rx="1" fill="{get_heat_color(1, theme)}"/>
        <rect x="25" y="0" width="8" height="8" rx="1" fill="{get_heat_color(3, theme)}"/>
        <rect x="35" y="0" width="8" height="8" rx="1" fill="{get_heat_color(6, theme)}"/>
        <rect x="45" y="0" width="8" height="8" rx="1" fill="{get_heat_color(10, theme)}"/>
        <text x="60" y="8">More</text>
      </g>
    </g>
    
    <!-- ============ ROW 3: SKILLS & RECENT SUBMISSIONS ============ -->
    
    <!-- Card 5: SKILLS TAGS -->
    <g class="card-item" transform="translate(12, 367)">
      <rect width="455" height="305" rx="10" fill="{theme["card"]}" stroke="{theme["border"]}" stroke-width="1"/>
      <text x="227.5" y="22" fill="{theme["subtext"]}" font-size="9.5" font-weight="700" letter-spacing="0.5" text-anchor="middle">SUBMISSION STATS BY SKILL CATEGORY</text>
      <g transform="translate(0, 10)">
        {skillsHtml}
      </g>
    </g>
    
    <!-- Card 6: RECENT SUBMISSIONS -->
    <g class="card-item" transform="translate(483, 367)">
      <rect width="455" height="305" rx="10" fill="{theme["card"]}" stroke="{theme["border"]}" stroke-width="1"/>
      <text x="227.5" y="22" fill="{theme["subtext"]}" font-size="9.5" font-weight="700" letter-spacing="0.5" text-anchor="middle">RECENT SUBMISSIONS</text>
      <g transform="translate(15, 12)">
        {recSubsSvg}
      </g>
    </g>
    
    <!-- Status Bar -->
    <g transform="translate(12, 684)">
      <rect width="926" height="24" rx="6" fill="{"rgba(255,255,255,0.06)" if theme_name == "glassmorphism" else theme["card"]}" stroke="{theme["border"]}" stroke-width="1"/>
      <circle cx="15" cy="12" r="3.5" fill="{statusColor}">
        <animate attributeName="opacity" values="1;0.4;1" dur="2.2s" repeatCount="indefinite"/>
      </circle>
      <text x="25" y="15.5" fill="{statusColor}" font-size="8" font-weight="bold" class="mono">STATIC ACTION GENERATION</text>
      
      <text x="463" y="15.5" fill="{theme["subtext"]}" font-size="8" font-weight="500" text-anchor="middle">LeetCode Dashboard • Generated statically for {realName}</text>
      
      <text x="910" y="15" fill="{theme["subtext"]}" font-size="8" class="mono" text-anchor="end">UPDATED: {dateUpdateStr}</text>
    </g>
  </svg>'''
    return svg

def main():
    parser = argparse.ArgumentParser(description="Generate LeetCode statistics SVG.")
    parser.add_argument("--username", type=str, default="apumukherjee819", help="LeetCode username")
    parser.add_argument("--theme", type=str, default="dark", choices=list(THEMES.keys()), help="Widget theme")
    parser.add_argument("--output", type=str, default="leetcode_stats.svg", help="Output SVG filepath")
    args = parser.parse_args()
    
    print(f"Fetching LeetCode data for {args.username}...")
    try:
        raw_data = fetch_leetcode_data(args.username)
        
        # Verify user exist
        if not raw_data.get("data") or not raw_data["data"].get("matchedUser"):
            print(f"Error: User '{args.username}' not found or is private.")
            return
            
        print("Calculating streak and submission statistics...")
        stats = calculate_stats(raw_data["data"]["matchedUser"]["submissionCalendar"])
        
        print(f"Rendering SVG using theme: {args.theme}...")
        svg = generate_svg(raw_data, stats, args.theme)
        
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(svg)
            
        print(f"Success! Stat card successfully written to {args.output}")
        
    except Exception as e:
        print(f"Failed to generate LeetCode Stats SVG: {e}")

if __name__ == "__main__":
    main()
