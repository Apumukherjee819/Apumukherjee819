import { VercelRequest, VercelResponse } from '@vercel/node';

// GraphQL query to fetch all required statistics in a single call
const LEETCODE_QUERY = `
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
`;

// Color Palettes for Premium Themes
const THEMES: Record<string, any> = {
  dark: {
    bg: '#0d1117',
    card: '#161b22',
    border: '#30363d',
    text: '#e6edf3',
    subtext: '#8b949e',
    easy: '#00b8a3',
    medium: '#ffa116',
    hard: '#ef4743',
    accent: '#58a6ff',
    flame: '#f7931a',
    gridActive: '#39d353',
    gridBg: '#161b22'
  },
  cyberpunk: {
    bg: '#05030a',
    card: '#0d0a1b',
    border: '#ff0055',
    text: '#00ffcc',
    subtext: '#82829f',
    easy: '#00ffcc',
    medium: '#ffe600',
    hard: '#ff0055',
    accent: '#00ffcc',
    flame: '#ff00ea',
    gridActive: '#ff0055',
    gridBg: '#18142a'
  },
  nord: {
    bg: '#2e3440',
    card: '#3b4252',
    border: '#4c566a',
    text: '#eceff4',
    subtext: '#d8dee9',
    easy: '#a3be8c',
    medium: '#ebcb8b',
    hard: '#bf616a',
    accent: '#88c0d0',
    flame: '#d08770',
    gridActive: '#88c0d0',
    gridBg: '#2e3440'
  },
  sunset: {
    bg: '#1a0e1c',
    card: '#29142c',
    border: '#4a154b',
    text: '#fff0f5',
    subtext: '#c39bbd',
    easy: '#ffd700',
    medium: '#ff8c00',
    hard: '#ff3e3e',
    accent: '#ff69b4',
    flame: '#ff4500',
    gridActive: '#ff69b4',
    gridBg: '#1e0a20'
  },
  neon: {
    bg: '#000000',
    card: '#080808',
    border: '#39ff14',
    text: '#ffffff',
    subtext: '#7a7a7a',
    easy: '#39ff14',
    medium: '#00ffff',
    hard: '#ff007f',
    accent: '#00ffff',
    flame: '#ffea00',
    gridActive: '#39ff14',
    gridBg: '#121212'
  },
  glassmorphism: {
    bg: 'transparent',
    card: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#ffffff',
    subtext: 'rgba(255, 255, 255, 0.5)',
    easy: '#00f2fe',
    medium: '#ffa116',
    hard: '#ff4b2b',
    accent: '#00f2fe',
    flame: '#ff416c',
    gridActive: '#00f2fe',
    gridBg: 'rgba(255, 255, 255, 0.02)'
  }
};

// Submissions heat color scale
function getHeatColor(count: number, theme: any): string {
  if (count === 0) return theme.gridBg;
  const opacity = Math.min(0.2 + (count * 0.15), 1);
  // Mix gridActive color with opacity
  if (theme.gridActive.startsWith('#')) {
    return theme.gridActive + Math.round(opacity * 255).toString(16).padStart(2, '0');
  }
  return theme.gridActive; // e.g. for RGBA
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const username = (req.query.username as string) || 'apumukherjee819';
  const themeName = (req.query.theme as string) || 'dark';
  const tz = (req.query.timezone as string) || 'UTC';
  
  const theme = THEMES[themeName] || THEMES.dark;

  try {
    // 1. Fetch data from LeetCode GraphQL
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://leetcode.com/'
      },
      body: JSON.stringify({
        query: LEETCODE_QUERY,
        variables: { username }
      })
    });

    if (!response.ok) {
      throw new Error(`LeetCode API returned status ${response.status}`);
    }

    const json = await response.json() as any;
    
    // Graceful error if user does not exist
    if (!json.data || !json.data.matchedUser) {
      return renderErrorSVG(res, username, `User "${username}" not found or private.`, theme);
    }

    const { allQuestionsCount, matchedUser, recentSubmissionList } = json.data;
    
    // Parse submission calendar
    const calendarStr = matchedUser.submissionCalendar || '{}';
    const calendarObj = JSON.parse(calendarStr);
    const dateCounts: Record<string, number> = {};

    // Group submission calendar counts by date in user timezone
    for (const [tsStr, count] of Object.entries(calendarObj)) {
      const date = new Date(Number(tsStr) * 1000);
      let dateStr = '';
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        dateStr = formatter.format(date); // YYYY-MM-DD
      } catch (e) {
        dateStr = date.toISOString().split('T')[0];
      }
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + (count as number);
    }

    // Calculate today and yesterday in user timezone
    let todayStr = '';
    let yesterdayStr = '';
    const now = new Date();
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      todayStr = formatter.format(now);
      
      const yesterday = new Date(now.getTime() - 86400000);
      yesterdayStr = formatter.format(yesterday);
    } catch (e) {
      todayStr = now.toISOString().split('T')[0];
      yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    }

    // 2. Compute streaks
    let currentStreak = 0;
    let checkDate = new Date(now);
    let checkStr = todayStr;

    // Check if user solved today; if not, check from yesterday
    if (!(checkStr in dateCounts)) {
      checkDate.setDate(checkDate.getDate() - 1);
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        checkStr = formatter.format(checkDate);
      } catch (e) {
        checkStr = checkDate.toISOString().split('T')[0];
      }
    }

    while (checkStr in dateCounts) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        checkStr = formatter.format(checkDate);
      } catch (e) {
        checkStr = checkDate.toISOString().split('T')[0];
      }
    }

    // Calculate max streak
    const sortedDates = Object.keys(dateCounts).sort();
    let maxStreak = 0;
    let tempStreak = 0;
    let prevTime: number | null = null;

    for (const dateStr of sortedDates) {
      const parts = dateStr.split('-');
      const currTime = Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      
      if (prevTime === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((currTime - prevTime) / 86400000);
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      }
      prevTime = currTime;
    }
    maxStreak = Math.max(maxStreak, tempStreak, currentStreak);

    // 3. Compute solved counts
    const solvedStats = matchedUser.submitStats.acSubmissionNum;
    const easySolved = solvedStats.find((s: any) => s.difficulty === 'Easy')?.count || 0;
    const mediumSolved = solvedStats.find((s: any) => s.difficulty === 'Medium')?.count || 0;
    const hardSolved = solvedStats.find((s: any) => s.difficulty === 'Hard')?.count || 0;
    const totalSolved = solvedStats.find((s: any) => s.difficulty === 'All')?.count || 0;

    const easyTotal = allQuestionsCount.find((q: any) => q.difficulty === 'Easy')?.count || 1;
    const mediumTotal = allQuestionsCount.find((q: any) => q.difficulty === 'Medium')?.count || 1;
    const hardTotal = allQuestionsCount.find((q: any) => q.difficulty === 'Hard')?.count || 1;
    const allTotal = allQuestionsCount.find((q: any) => q.difficulty === 'All')?.count || 1;

    // 4. Weekly progression (last 7 days)
    const weeklyProgress: { day: string; count: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      let dStr = '';
      let dayName = '';
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        dStr = formatter.format(d);
        dayName = d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });
      } catch (e) {
        dStr = d.toISOString().split('T')[0];
        dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      }
      weeklyProgress.push({
        day: dayName,
        count: dateCounts[dStr] || 0,
        isToday: dStr === todayStr
      });
    }

    // 5. Yearly activity heatmap cells
    const heatmapCells: { x: number; y: number; count: number; date: string }[] = [];
    const cellWidth = 9;
    const cellGap = 2;
    const totalWeeks = 53;
    
    // Find start date: 53 weeks ago, aligned to Sunday
    const startHeatmapDate = new Date(now.getTime() - 364 * 86400000);
    const dayOfWeek = startHeatmapDate.getDay(); // 0 is Sunday, 6 is Saturday
    startHeatmapDate.setDate(startHeatmapDate.getDate() - dayOfWeek);

    const tempDate = new Date(startHeatmapDate);
    for (let week = 0; week < totalWeeks; week++) {
      for (let day = 0; day < 7; day++) {
        let tempDateStr = '';
        try {
          const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
          tempDateStr = formatter.format(tempDate);
        } catch (e) {
          tempDateStr = tempDate.toISOString().split('T')[0];
        }
        
        // Count for this day
        const count = dateCounts[tempDateStr] || 0;
        
        heatmapCells.push({
          x: week * (cellWidth + cellGap),
          y: day * (cellWidth + cellGap),
          count,
          date: tempDate.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric' })
        });
        
        tempDate.setDate(tempDate.getDate() + 1);
      }
    }

    // 6. SVG generation
    const svg = generateSVG({
      username: matchedUser.username,
      realName: matchedUser.profile.realName || username,
      ranking: matchedUser.profile.ranking,
      easySolved, easyTotal,
      mediumSolved, mediumTotal,
      hardSolved, hardTotal,
      totalSolved, allTotal,
      currentStreak, maxStreak,
      activeDays: Object.keys(dateCounts).length,
      todayCount: dateCounts[todayStr] || 0,
      yesterdayCount: dateCounts[yesterdayStr] || 0,
      weeklyProgress,
      heatmapCells,
      languages: matchedUser.languageProblemCount || [],
      tags: matchedUser.tagProblemCounts || {},
      recentSubmissions: recentSubmissionList || [],
      theme,
      themeName,
      timezone: tz
    });

    // Return the response as SVG with cache settings
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=1800, stale-while-revalidate=600');
    return res.status(200).send(svg);

  } catch (error: any) {
    console.error(error);
    return renderErrorSVG(res, username, `Error fetching data: ${error.message}`, THEMES.dark);
  }
}

// Function to render an error state SVG card
function renderErrorSVG(res: VercelResponse, username: string, message: string, theme: any): void {
  const errorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="950" height="720" viewBox="0 0 950 720">
    <rect width="950" height="720" rx="10" fill="${theme.bg === 'transparent' ? '#0d1117' : theme.bg}" stroke="${theme.border}" stroke-width="1"/>
    <circle cx="18" cy="16" r="5" fill="#ff5f56"/>
    <circle cx="34" cy="16" r="5" fill="#ffbd2e"/>
    <circle cx="50" cy="16" r="5" fill="#27c93f"/>
    <text x="475" y="20" fill="${theme.text}" font-size="12" font-weight="bold" font-family="-apple-system, sans-serif" text-anchor="middle">LeetCode Dashboard - Error</text>
    <g transform="translate(100, 300)">
      <rect width="750" height="150" rx="8" fill="${theme.card}" stroke="#ff5f56" stroke-width="1"/>
      <text x="375" y="50" fill="#ff5f56" font-size="18" font-weight="bold" font-family="-apple-system, sans-serif" text-anchor="middle">Failed to load statistics</text>
      <text x="375" y="90" fill="${theme.subtext}" font-size="12" font-family="monospace" text-anchor="middle">${message}</text>
    </g>
    <text x="475" y="680" fill="${theme.subtext}" font-size="10" font-family="-apple-system, sans-serif" text-anchor="middle">Check if username "${username}" is correct and has a public profile.</text>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(200).send(errorSvg);
}

// Complex dynamic SVG layout rendering
function generateSVG(data: any): string {
  const {
    username, realName, ranking,
    easySolved,
    mediumSolved,
    hardSolved,
    totalSolved, allTotal,
    currentStreak, maxStreak, activeDays,
    todayCount, yesterdayCount,
    weeklyProgress, heatmapCells,
    languages, tags, recentSubmissions,
    theme, themeName, timezone
  } = data;

  // Donut chart stroke math
  const r = 42;
  const circ = 2 * Math.PI * r; // ~263.89
  
  // Calculate difficulty segments
  const pctEasy = easySolved / allTotal;
  const pctMedium = mediumSolved / allTotal;
  const pctHard = hardSolved / allTotal;

  const easyStroke = pctEasy * circ;
  const mediumStroke = pctMedium * circ;
  const hardStroke = pctHard * circ;

  const easyOffset = 0;
  const mediumOffset = -easyStroke;
  const hardOffset = -(easyStroke + mediumStroke);

  // 7-day progress graph calculations
  const maxWeekly = Math.max(...weeklyProgress.map((d: any) => d.count), 1);
  const gx = 30, gy = 30, gw = 180, gh = 60;
  
  const points = weeklyProgress.map((d: any, idx: number) => {
    const x = gx + idx * (gw / 6);
    const y = gy + gh - (d.count / maxWeekly * gh);
    return { x, y, count: d.count, day: d.day, isToday: d.isToday };
  });

  const linePath = "M " + points.map((p: any) => `${p.x},${p.y}`).join(" L ");
  const areaPath = linePath + ` L ${points[points.length-1].x},${gy + gh} L ${points[0].x},${gy + gh} Z`;

  // Draw points & grids
  const graphCircles = points.map((p: any) => {
    const strokeColor = p.isToday ? theme.accent : theme.gridActive;
    return `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${theme.card}" stroke="${strokeColor}" stroke-width="1.5">
      <animate attributeName="r" values="3.5;5;3.5" dur="3s" repeatCount="indefinite"/>
    </circle>`;
  }).join('');

  const graphLabels = points.map((p: any) => {
    const textColor = p.isToday ? theme.accent : theme.subtext;
    const weight = p.isToday ? 'font-weight="bold"' : '';
    return `<text x="${p.x}" y="${gy + gh + 14}" fill="${textColor}" ${weight} font-size="7" font-family="monospace" text-anchor="middle">${p.day[0]}</text>`;
  }).join('');

  // Top Languages (max 4)
  const topLangs = [...languages]
    .sort((a: any, b: any) => b.problemsSolved - a.problemsSolved)
    .slice(0, 4);

  const langMapColors: Record<string, string> = {
    python: '#3572A5', python3: '#3572A5', java: '#b07219', javascript: '#f1e05a',
    cpp: '#f34b7d', c: '#555555', csharp: '#178600', go: '#00ADD8', rust: '#dea584',
    typescript: '#2b7489', sql: '#e38c00', mysql: '#e38c00'
  };
  const getLangColor = (l: string) => langMapColors[l.toLowerCase()] || '#6e7681';

  const langsSvg = topLangs.map((lang: any, index: number) => {
    const y = 30 + index * 32;
    const color = getLangColor(lang.languageName);
    const maxSolved = topLangs[0].problemsSolved || 1;
    const barWidth = Math.max(10, (lang.problemsSolved / maxSolved) * 160);
    return `<g transform="translate(15, ${y})">
      <text x="0" y="10" fill="${theme.text}" font-size="9" font-family="-apple-system, sans-serif" font-weight="500">${lang.languageName}</text>
      <rect x="0" y="16" width="160" height="5" rx="2.5" fill="${theme.bg === 'transparent' ? 'rgba(255,255,255,0.06)' : theme.bg}"/>
      <rect x="0" y="16" width="${barWidth}" height="5" rx="2.5" fill="${color}">
        <animate attributeName="width" from="0" to="${barWidth}" dur="1.5s" fill="freeze" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1"/>
      </rect>
      <text x="175" y="10" fill="${theme.text}" font-size="10" font-family="monospace" font-weight="bold">${lang.problemsSolved}</text>
      <text x="210" y="10" fill="${theme.subtext}" font-size="7.5" font-family="-apple-system, sans-serif">solved</text>
    </g>`;
  }).join('');

  // Skills tags
  const advancedTags = (tags.advanced || []).slice(0, 3);
  const intermediateTags = (tags.intermediate || []).slice(0, 3);
  const fundamentalTags = (tags.fundamental || []).slice(0, 3);

  let skillsHtml = '';
  let curY = 35;

  const renderTagRow = (label: string, labelColor: string, badgeBg: string, borderCol: string, list: any[]) => {
    if (list.length === 0) return '';
    let row = `<text x="15" y="${curY}" fill="${labelColor}" font-size="8.5" font-weight="bold" font-family="-apple-system, sans-serif">${label}</text>`;
    curY += 12;
    let curX = 15;
    list.forEach((tag: any) => {
      const textLen = tag.tagName.length * 5.2 + 10;
      row += `<g transform="translate(${curX}, ${curY})">
        <rect width="${textLen}" height="18" rx="9" fill="${badgeBg}" stroke="${borderCol}" stroke-width="0.8"/>
        <text x="${textLen/2}" y="11.5" fill="${labelColor}" font-size="7" font-weight="600" font-family="monospace" text-anchor="middle">${tag.tagName}</text>
        <text x="${textLen + 6}" y="12" fill="${theme.subtext}" font-size="7.5" font-family="monospace">x${tag.problemsSolved}</text>
      </g>`;
      curX += textLen + 30;
    });
    curY += 34;
    return row;
  };

  skillsHtml += renderTagRow('Advanced Categories', theme.hard, 'rgba(239, 71, 67, 0.08)', theme.hard + '40', advancedTags);
  skillsHtml += renderTagRow('Intermediate Categories', theme.medium, 'rgba(255, 161, 22, 0.08)', theme.medium + '40', intermediateTags);
  skillsHtml += renderTagRow('Fundamental Categories', theme.easy, 'rgba(0, 184, 163, 0.08)', theme.easy + '40', fundamentalTags);

  // Recent submissions listing
  const recSubsSvg = recentSubmissions.map((sub: any, idx: number) => {
    const y = 30 + idx * 46;
    const isAC = sub.statusDisplay === 'Accepted';
    const statusCol = isAC ? theme.easy : theme.hard;
    const timeVal = parseInt(sub.timestamp);
    const relativeTime = getRelativeTime(timeVal);

    return `<g transform="translate(15, ${y})">
      <circle cx="6" cy="14" r="3.5" fill="${statusCol}"/>
      <text x="22" y="12" fill="${theme.text}" font-size="9.5" font-weight="bold" font-family="-apple-system, sans-serif">${sub.title.length > 34 ? sub.title.substring(0, 32) + '..' : sub.title}</text>
      <text x="22" y="24" fill="${theme.subtext}" font-size="8" font-family="monospace">${sub.lang} • ${relativeTime}</text>
      <rect x="360" y="4" width="55" height="15" rx="3.5" fill="${isAC ? 'rgba(0, 184, 163, 0.08)' : 'rgba(239, 71, 67, 0.08)'}" stroke="${statusCol}" stroke-width="0.5"/>
      <text x="387.5" y="14.5" fill="${statusCol}" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">${sub.statusDisplay === 'Accepted' ? 'AC' : 'WA'}</text>
      <line x1="0" y1="36" x2="425" y2="36" stroke="${theme.border}" stroke-width="0.5"/>
    </g>`;
  }).join('');

  // Heatmap generation HTML
  const heatmapHtml = heatmapCells.map((cell: any) => {
    const c = getHeatColor(cell.count, theme);
    return `<rect x="${cell.x}" y="${cell.y}" width="9" height="9" rx="1.5" fill="${c}">
      <title>${cell.count} submissions on ${cell.date}</title>
    </rect>`;
  }).join('');

  // Streak percentage for glowing progress ring
  const streakPct = Math.min(currentStreak / 30, 1);
  const streakRingCirc = 2 * Math.PI * 36; // 226.19
  const streakStrokeDash = streakPct * streakRingCirc;
  const streakStrokeGap = streakRingCirc - streakStrokeDash;

  // Active status color
  const statusColor = todayCount > 0 ? theme.easy : theme.accent;
  
  // Format current UTC timestamp
  const dateUpdateStr = new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit' }) + ' ' + timezone;

  // Final SVG response structure
  return `<svg xmlns="http://www.w3.org/2000/svg" width="950" height="720" viewBox="0 0 950 720" class="theme-${themeName}">
    <defs>
      <!-- Gradients -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${theme.bg};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:${theme.bg === 'transparent' ? 'transparent' : adjustColorBrightness(theme.bg, 1.2)};stop-opacity:1"/>
      </linearGradient>
      <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:${theme.gridActive};stop-opacity:0.25"/>
        <stop offset="100%" style="stop-color:${theme.gridActive};stop-opacity:0"/>
      </linearGradient>
      <linearGradient id="streakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${theme.flame}"/>
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
      text { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .mono { font-family: 'Fira Code', monospace; }
      
      /* Card Hover Effects */
      .card-item {
        transition: transform 0.3s ease, filter 0.3s ease;
      }
      .card-item:hover {
        transform: translateY(-2px);
        filter: brightness(1.08);
      }
      
      /* Dynamic SVG Animations */
      @keyframes dash {
        to {
          stroke-dashoffset: 0;
        }
      }
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes blink {
        50% { opacity: 0; }
      }
      
      .donut-segment {
        stroke-dasharray: ${circ};
        animation: fillDonut 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      @keyframes fillDonut {
        from { stroke-dashoffset: ${circ}; }
        to { stroke-dashoffset: 0; }
      }
      
      .flame-icon {
        transform-origin: 50% 50%;
        animation: pulse 2.2s infinite ease-in-out;
      }
      
      .cursor-blink {
        animation: blink 1s step-end infinite;
      }
    </style>

    <!-- Main Window with Glassmorphism / Shadow -->
    <rect width="950" height="720" rx="14" fill="url(#bgGrad)" stroke="${theme.border}" stroke-width="1.5" filter="url(#shadow)"/>
    
    <!-- Title Bar -->
    <path d="M 0,14 A 14,14 0 0,1 14,0 L 936,0 A 14,14 0 0,1 950,14 L 950,38 L 0,38 Z" fill="${themeName === 'glassmorphism' ? 'rgba(255,255,255,0.06)' : theme.card}" stroke="${theme.border}" stroke-width="0.5"/>
    <circle cx="20" cy="19" r="6" fill="#ff5f56"/>
    <circle cx="38" cy="19" r="6" fill="#ffbd2e"/>
    <circle cx="56" cy="19" r="6" fill="#27c93f"/>
    <text x="475" y="24" fill="${theme.text}" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="1">
      LEETCODE STREAK DASHBOARD<tspan class="cursor-blink" fill="${theme.accent}">_</tspan>
    </text>
    <text x="930" y="23" fill="${theme.accent}" font-size="10.5" class="mono" text-anchor="end" font-weight="700">@${username}</text>
    
    <!-- ============ ROW 1: 4 CARDS ============ -->
    
    <!-- Card 1: SOLVED DONUT -->
    <g class="card-item" transform="translate(12, 48)">
      <rect width="170" height="175" rx="10" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>
      <text x="85" y="20" fill="${theme.subtext}" font-size="9.5" font-weight="700" letter-spacing="0.5" text-anchor="middle">AC PROBLEMS</text>
      
      <!-- Donut segments -->
      <g transform="translate(85, 92)">
        <circle cx="0" cy="0" r="${r}" fill="none" stroke="${theme.bg === 'transparent' ? 'rgba(255,255,255,0.05)' : theme.bg}" stroke-width="7"/>
        
        <!-- Easy segment -->
        <circle cx="0" cy="0" r="${r}" fill="none" stroke="${theme.easy}" stroke-width="7" 
                stroke-dasharray="${easyStroke} ${circ - easyStroke}" stroke-dashoffset="${easyOffset}" 
                class="donut-segment" transform="rotate(-90)" stroke-linecap="round"/>
                
        <!-- Medium segment -->
        <circle cx="0" cy="0" r="${r}" fill="none" stroke="${theme.medium}" stroke-width="7" 
                stroke-dasharray="${mediumStroke} ${circ - mediumStroke}" stroke-dashoffset="${mediumOffset}" 
                class="donut-segment" transform="rotate(-90)" stroke-linecap="round"/>
                
        <!-- Hard segment -->
        <circle cx="0" cy="0" r="${r}" fill="none" stroke="${theme.hard}" stroke-width="7" 
                stroke-dasharray="${hardStroke} ${circ - hardStroke}" stroke-dashoffset="${hardOffset}" 
                class="donut-segment" transform="rotate(-90)" stroke-linecap="round"/>
                
        <!-- Inner Label -->
        <text x="0" y="1" fill="${theme.text}" font-size="20" font-weight="800" text-anchor="middle">${totalSolved}</text>
        <text x="0" y="14" fill="${theme.subtext}" font-size="8" class="mono" text-anchor="middle">/ ${allTotal}</text>
      </g>
      
      <!-- Legend counts -->
      <g transform="translate(15, 155)" class="mono">
        <circle cx="4" cy="-2" r="3.5" fill="${theme.easy}"/>
        <text x="12" y="1" fill="${theme.text}" font-size="8.5" font-weight="700">${easySolved}</text>
        
        <circle cx="56" cy="-2" r="3.5" fill="${theme.medium}"/>
        <text x="64" y="1" fill="${theme.text}" font-size="8.5" font-weight="700">${mediumSolved}</text>
        
        <circle cx="108" cy="-2" r="3.5" fill="${theme.hard}"/>
        <text x="116" y="1" fill="${theme.text}" font-size="8.5" font-weight="700">${hardSolved}</text>
      </g>
    </g>
    
    <!-- Card 2: STREAK FLAME -->
    <g class="card-item" transform="translate(194, 48)">
      <rect width="170" height="175" rx="10" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>
      <text x="85" y="20" fill="${theme.subtext}" font-size="9.5" font-weight="700" letter-spacing="0.5" text-anchor="middle">ACTIVE STREAK</text>
      
      <g transform="translate(85, 82)">
        <!-- Progress Ring for Streak -->
        <circle cx="0" cy="0" r="36" fill="none" stroke="${theme.bg === 'transparent' ? 'rgba(255,255,255,0.05)' : theme.bg}" stroke-width="5"/>
        <circle cx="0" cy="0" r="36" fill="none" stroke="url(#streakGrad)" stroke-width="5"
                stroke-dasharray="${streakStrokeDash} ${streakStrokeGap}" stroke-dashoffset="0"
                transform="rotate(-90)" stroke-linecap="round" filter="url(#glow)"/>
        
        <!-- Flame Vector inside -->
        <g class="flame-icon" transform="translate(-18, -26) scale(0.95)" filter="url(#neonGlow)">
          <path d="M18.8 3C18.8 3 19 8.2 14.5 11.2C9.9 14.3 9.4 19.3 11.4 22.9C13.4 26.5 17.5 28.5 22.2 28C27.9 27.4 31.9 21.6 30.2 16.5C30.2 16.5 30.6 15 28.8 14.5C26.5 13.9 25.1 11.1 26.5 8C27.9 4.9 21.5 0.5 18.8 3Z" fill="url(#streakGrad)"/>
          <path d="M16 11.5C16 11.5 16.8 15.2 14.2 17.8C11.5 20.4 11.8 24.3 13.7 26.8C15.6 29.3 19.8 30 22.5 28.8C25.9 27.3 27.2 22.9 25.8 19.8C25.8 19.8 26.5 18.2 24.8 18C22.6 17.7 21 15 22 12C23 9 17.5 7.5 16 11.5Z" fill="#ff4500" opacity="0.8"/>
          <path d="M18.5 17.5C18.5 17.5 19 19.8 17.8 21.5C16.5 23.2 16.8 25.8 18 27.5C19.2 29.2 22.2 29 23.5 28C25.8 26.3 25 23 24.2 21.5C24.2 21.5 24.5 20.8 23.8 20.5C22.5 20 21.8 18.8 22.2 17.5C22.6 16.2 19.5 15.5 18.5 17.5Z" fill="#ffcc00" opacity="0.9"/>
        </g>
        
        <!-- Streak text overlay -->
        <text x="0" y="24" fill="${theme.text}" font-size="20" font-weight="800" text-anchor="middle">${currentStreak}</text>
        <text x="0" y="34" fill="${theme.flame}" font-size="7" font-weight="700" letter-spacing="1" text-anchor="middle">STREAK</text>
      </g>
      
      <!-- Best & Active Days -->
      <g transform="translate(10, 143)">
        <rect width="70" height="22" rx="5" fill="${theme.bg === 'transparent' ? 'rgba(255,255,255,0.05)' : theme.bg}" stroke="${theme.border}" stroke-width="0.5"/>
        <text x="35" y="8" fill="${theme.subtext}" font-size="6.5" font-weight="700" text-anchor="middle">BEST</text>
        <text x="35" y="18" fill="${theme.flame}" font-size="9" font-weight="800" class="mono" text-anchor="middle">${maxStreak}d</text>
        
        <g transform="translate(80, 0)">
          <rect width="70" height="22" rx="5" fill="${theme.bg === 'transparent' ? 'rgba(255,255,255,0.05)' : theme.bg}" stroke="${theme.border}" stroke-width="0.5"/>
          <text x="35" y="8" fill="${theme.subtext}" font-size="6.5" font-weight="700" text-anchor="middle">ACTIVE</text>
          <text x="35" y="18" fill="${theme.easy}" font-size="9" font-weight="800" class="mono" text-anchor="middle">${activeDays}d</text>
        </g>
      </g>
    </g>
    
    <!-- Card 3: WEEKLY PROGRESSION -->
    <g class="card-item" transform="translate(376, 48)">
      <rect width="240" height="175" rx="10" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>
      <text x="15" y="20" fill="${theme.subtext}" font-size="9.5" font-weight="700" letter-spacing="0.5">WEEKLY ACTIVITY</text>
      <text x="225" y="20" fill="${theme.accent}" font-size="8" font-weight="bold" class="mono" text-anchor="end">7 DAYS</text>
      
      <!-- Mini Chart -->
      <g transform="translate(15, 20)">
        <path d="${areaPath}" fill="url(#areaGrad)"/>
        <path d="${linePath}" fill="none" stroke="${theme.gridActive}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
        ${graphCircles}
        ${graphLabels}
      </g>
      
      <!-- Stats summary block -->
      <g transform="translate(15, 143)">
        <rect width="64" height="22" rx="5" fill="${theme.bg === 'transparent' ? 'rgba(255,255,255,0.05)' : theme.bg}"/>
        <text x="32" y="8" fill="${theme.subtext}" font-size="6.5" font-weight="700" text-anchor="middle">TODAY</text>
        <text x="32" y="18" fill="${todayCount > 0 ? theme.easy : theme.subtext}" font-size="9" font-weight="800" class="mono" text-anchor="middle">${todayCount}</text>
        
        <g transform="translate(73, 0)">
          <rect width="64" height="22" rx="5" fill="${theme.bg === 'transparent' ? 'rgba(255,255,255,0.05)' : theme.bg}"/>
          <text x="32" y="8" fill="${theme.subtext}" font-size="6.5" font-weight="700" text-anchor="middle">YEST</text>
          <text x="32" y="18" fill="${yesterdayCount > 0 ? theme.easy : theme.subtext}" font-size="9" font-weight="800" class="mono" text-anchor="middle">${yesterdayCount}</text>
        </g>
        
        <g transform="translate(146, 0)">
          <rect width="64" height="22" rx="5" fill="${theme.bg === 'transparent' ? 'rgba(255,255,255,0.05)' : theme.bg}"/>
          <text x="32" y="8" fill="${theme.subtext}" font-size="6.5" font-weight="700" text-anchor="middle">RANKING</text>
          <text x="32" y="18" fill="${theme.flame}" font-size="8.5" font-weight="800" class="mono" text-anchor="middle">#${ranking > 1000000 ? Math.round(ranking/1000000) + 'M' : ranking.toLocaleString()}</text>
        </g>
      </g>
    </g>
    
    <!-- Card 4: LANGUAGES BAR CHART -->
    <g class="card-item" transform="translate(628, 48)">
      <rect width="310" height="175" rx="10" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>
      <text x="155" y="20" fill="${theme.subtext}" font-size="9.5" font-weight="700" letter-spacing="0.5" text-anchor="middle">TOP LANGUAGES</text>
      ${langsSvg}
    </g>
    
    <!-- ============ ROW 2: YEARLY HEATMAP ============ -->
    <g class="card-item" transform="translate(12, 235)">
      <rect width="926" height="120" rx="10" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>
      <text x="15" y="20" fill="${theme.subtext}" font-size="9.5" font-weight="700" letter-spacing="0.5">YEARLY SUBMISSIONS</text>
      
      <!-- Week labels -->
      <g transform="translate(35, 33)" fill="${theme.subtext}" font-size="7" font-weight="600" class="mono">
        <text x="0" y="0">Jan</text>
        <text x="80" y="0">Mar</text>
        <text x="160" y="0">May</text>
        <text x="240" y="0">Jul</text>
        <text x="320" y="0">Sep</text>
        <text x="400" y="0">Nov</text>
        <text x="480" y="0">Dec</text>
      </g>
      
      <!-- Day Grid Labels -->
      <g transform="translate(15, 48)" fill="${theme.subtext}" font-size="7.5" font-weight="bold" class="mono">
        <text x="0" y="8">S</text>
        <text x="0" y="30">T</text>
        <text x="0" y="52">T</text>
        <text x="0" y="74">S</text>
      </g>
      
      <!-- Grid Cells Container (Centered) -->
      <g transform="translate(35, 41)">
        ${heatmapHtml}
      </g>
      
      <!-- Legend -->
      <g transform="translate(800, 100)" class="mono" font-size="7.5" fill="${theme.subtext}">
        <text x="0" y="8" text-anchor="end">Less</text>
        <rect x="5" y="0" width="8" height="8" rx="1" fill="${theme.gridBg}" stroke="${theme.border}" stroke-width="0.3"/>
        <rect x="15" y="0" width="8" height="8" rx="1" fill="${getHeatColor(1, theme)}"/>
        <rect x="25" y="0" width="8" height="8" rx="1" fill="${getHeatColor(3, theme)}"/>
        <rect x="35" y="0" width="8" height="8" rx="1" fill="${getHeatColor(6, theme)}"/>
        <rect x="45" y="0" width="8" height="8" rx="1" fill="${getHeatColor(10, theme)}"/>
        <text x="60" y="8">More</text>
      </g>
    </g>
    
    <!-- ============ ROW 3: SKILLS & RECENT SUBMISSIONS ============ -->
    
    <!-- Card 5: SKILLS TAGS -->
    <g class="card-item" transform="translate(12, 367)">
      <rect width="455" height="305" rx="10" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>
      <text x="227.5" y="22" fill="${theme.subtext}" font-size="9.5" font-weight="700" letter-spacing="0.5" text-anchor="middle">SUBMISSION STATS BY SKILL CATEGORY</text>
      <g transform="translate(0, 10)">
        ${skillsHtml}
      </g>
    </g>
    
    <!-- Card 6: RECENT SUBMISSIONS -->
    <g class="card-item" transform="translate(483, 367)">
      <rect width="455" height="305" rx="10" fill="${theme.card}" stroke="${theme.border}" stroke-width="1"/>
      <text x="227.5" y="22" fill="${theme.subtext}" font-size="9.5" font-weight="700" letter-spacing="0.5" text-anchor="middle">RECENT SUBMISSIONS</text>
      <g transform="translate(15, 12)">
        ${recSubsSvg}
      </g>
    </g>
    
    <!-- Status Bar -->
    <g transform="translate(12, 684)">
      <rect width="926" height="24" rx="6" fill="${themeName === 'glassmorphism' ? 'rgba(255,255,255,0.06)' : theme.card}" stroke="${theme.border}" stroke-width="1"/>
      <circle cx="15" cy="12" r="3.5" fill="${statusColor}">
        <animate attributeName="opacity" values="1;0.4;1" dur="2.2s" repeatCount="indefinite"/>
      </circle>
      <text x="25" y="15.5" fill="${statusColor}" font-size="8" font-weight="bold" class="mono">LIVE CONNECTION</text>
      
      <text x="463" y="15.5" fill="${theme.subtext}" font-size="8" font-weight="500" text-anchor="middle">LeetCode Dashboard • Generated dynamically for ${realName}</text>
      
      <text x="910" y="15" fill="${theme.subtext}" font-size="8" class="mono" text-anchor="end">UPDATED: ${dateUpdateStr}</text>
    </g>
  </svg>`;
}

// Format relative time helper
function getRelativeTime(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return 'Just now';
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Adjust brightness of hex color for gradient endpoint
function adjustColorBrightness(hex: string, percent: number): string {
  if (hex === 'transparent') return 'transparent';
  if (!hex.startsWith('#')) return hex;
  
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  r = Math.min(255, Math.floor(r * percent));
  g = Math.min(255, Math.floor(g * percent));
  b = Math.min(255, Math.floor(b * percent));

  const rs = r.toString(16).padStart(2, '0');
  const gs = g.toString(16).padStart(2, '0');
  const bs = b.toString(16).padStart(2, '0');

  return `#${rs}${gs}${bs}`;
}
