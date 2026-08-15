import { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink,
  Info,
  RefreshCw,
  Sliders,
  LayoutDashboard
} from 'lucide-react';

const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'UTC', label: 'UTC (GMT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' }
];

const THEMES = [
  { id: 'dark', name: 'Dark Modern', color1: '#0d1117', color2: '#58a6ff' },
  { id: 'cyberpunk', name: 'Cyberpunk', color1: '#05030a', color2: '#ff0055' },
  { id: 'nord', name: 'Nord Frost', color1: '#2e3440', color2: '#88c0d0' },
  { id: 'sunset', name: 'Sunset Glow', color1: '#1a0e1c', color2: '#ff69b4' },
  { id: 'neon', name: 'Neon Toxic', color1: '#000000', color2: '#39ff14' },
  { id: 'glassmorphism', name: 'Glassmorphism', color1: '#080c14', color2: '#00f2fe' }
];

export default function App() {
  const [username, setUsername] = useState('apumukherjee819');
  const [theme, setTheme] = useState('dark');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [customTimezone, setCustomTimezone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'markdown' | 'html' | 'url'>('markdown');
  const [copied, setCopied] = useState(false);

  // Determine actual timezone to use
  const activeTimezone = customTimezone || timezone;

  // Sync class theme on body element
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  // Fetch the dynamically rendered SVG
  const fetchWidget = async (u: string, t: string, tz: string) => {
    if (!u.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stats?username=${encodeURIComponent(u)}&theme=${t}&timezone=${encodeURIComponent(tz)}`);
      if (!response.ok) {
        throw new Error('Failed to load live statistics.');
      }
      const data = await response.text();
      // Check if response contains an error card
      if (data.includes('Failed to load statistics') || data.includes('not found')) {
        setSvgContent(data);
        setError('User profile not found, or it is private on LeetCode.');
      } else {
        setSvgContent(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading widget.');
    } finally {
      setLoading(false);
    }
  };

  // Debounced effect for inputs
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchWidget(username, theme, activeTimezone);
    }, 600);
    return () => clearTimeout(delay);
  }, [username, theme, activeTimezone]);

  // Base URL for code generation
  const origin = window.location.origin;
  const widgetUrl = `${origin}/api/stats?username=${username}&theme=${theme}&timezone=${encodeURIComponent(activeTimezone)}`;
  
  const embedCodes = {
    markdown: `[![LeetCode Stats](${widgetUrl})](https://leetcode.com/${username})`,
    html: `<a href="https://leetcode.com/${username}">\n  <img src="${widgetUrl}" alt="LeetCode Stats" />\n</a>`,
    url: widgetUrl
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCodes[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      {/* Sidebar: Sliders & Customizer */}
      <aside className="glass-card customizer">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Sliders size={20} className="mono" style={{ color: 'var(--accent-color)' }} />
            <h2 className="customizer-title">Customizer</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Design your dynamic LeetCode stats card for GitHub READMEs.
          </p>
        </div>

        {/* Input: Username */}
        <div className="form-group">
          <label className="form-label">LeetCode Username</label>
          <input 
            type="text" 
            className="form-input" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. apumukherjee819"
          />
        </div>

        {/* Input: Timezone */}
        <div className="form-group">
          <label className="form-label">Timezone Calculation</label>
          <select 
            className="form-input"
            value={timezone}
            onChange={(e) => {
              setTimezone(e.target.value);
              setCustomTimezone('');
            }}
          >
            {COMMON_TIMEZONES.map(tzOption => (
              <option key={tzOption.value} value={tzOption.value}>{tzOption.label}</option>
            ))}
            <option value="custom">Custom Timezone...</option>
          </select>
          
          {timezone === 'custom' && (
            <input 
              type="text" 
              className="form-input" 
              style={{ marginTop: '0.5rem' }}
              value={customTimezone}
              onChange={(e) => setCustomTimezone(e.target.value)}
              placeholder="e.g. Europe/Paris, Asia/Kolkata"
            />
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Ensures streak metrics calculate matching your local date progression.
          </span>
        </div>

        {/* Themes Grid */}
        <div className="form-group">
          <label className="form-label">Widget Theme</label>
          <div className="theme-selector">
            {THEMES.map(t => (
              <button 
                key={t.id}
                type="button"
                className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                onClick={() => setTheme(t.id)}
                style={{ position: 'relative' }}
              >
                <span style={{ 
                  display: 'inline-block', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: t.color2,
                  marginRight: '6px',
                  boxShadow: `0 0 6px ${t.color2}`
                }}></span>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <hr style={{ border: '0', height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }} />

        {/* Embed Codes */}
        <div className="form-group">
          <label className="form-label">Copy Embed Code</label>
          <div className="code-tabs">
            <button 
              type="button" 
              className={`code-tab ${activeTab === 'markdown' ? 'active' : ''}`}
              onClick={() => setActiveTab('markdown')}
            >
              Markdown
            </button>
            <button 
              type="button" 
              className={`code-tab ${activeTab === 'html' ? 'active' : ''}`}
              onClick={() => setActiveTab('html')}
            >
              HTML
            </button>
            <button 
              type="button" 
              className={`code-tab ${activeTab === 'url' ? 'active' : ''}`}
              onClick={() => setActiveTab('url')}
            >
              URL Only
            </button>
          </div>
          
          <div className="code-block-container">
            <pre className="code-block">{embedCodes[activeTab]}</pre>
            <button 
              type="button" 
              className="copy-btn" 
              onClick={copyToClipboard}
              title="Copy code"
            >
              {copied ? <Check size={16} style={{ color: 'var(--easy-color)' }} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            <Info size={14} style={{ color: 'var(--accent-color)' }} />
            <span>How to share:</span>
          </div>
          <ol style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li>Push this repository to your GitHub.</li>
            <li>Click the **Deploy to Vercel** button in the README.</li>
            <li>Copy the generated widget link and paste it into your GitHub Profile README.</li>
          </ol>
        </div>
      </aside>

      {/* Main Panel: Preview & Stats Details */}
      <main className="dashboard-main">
        {/* Header Title */}
        <div className="header-panel">
          <div className="profile-summary">
            <div className="avatar-ring">
              <div className="avatar-inner">
                {username ? username.substring(0, 2).toUpperCase() : 'LC'}
              </div>
            </div>
            <div>
              <h1 className="user-name">@{username}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="user-rank">LeetCode Portfolio Dashboard</span>
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                  color: 'var(--easy-color)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  <span style={{ width: '5px', height: '5px', backgroundColor: 'var(--easy-color)', borderRadius: '50%' }}></span>
                  LIVE CONNECTED
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={() => fetchWidget(username, theme, activeTimezone)}
              className="theme-btn" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spinner' : ''} style={{ animation: loading ? 'spin 1s infinite linear' : 'none' }} />
              Refresh
            </button>
            <a 
              href={`https://leetcode.com/${username}`} 
              target="_blank" 
              rel="noreferrer" 
              className="btn-primary"
              style={{ textDecoration: 'none', padding: '0.75rem 1rem' }}
            >
              LeetCode Profile <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Live Widget Preview Box */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutDashboard size={16} style={{ color: 'var(--accent-color)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>README Widget Preview</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="mono">
              950 × 720 px
            </span>
          </div>

          {error && (
            <div className="alert alert-error">
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          <div className="preview-container">
            {loading && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>
                  Fetching LeetCode Statistics...
                </div>
              </div>
            )}
            
            {svgContent ? (
              <div 
                className="preview-svg-wrapper"
                dangerouslySetInnerHTML={{ __html: svgContent }} 
              />
            ) : (
              <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Widget will load shortly...
              </div>
            )}
          </div>
        </div>

        {/* Footer info card */}
        <footer style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '1rem 0' }}>
          <p>
            Designed & Developed as a premium LeetCode companion app. Feel free to star on GitHub! ⭐️
          </p>
        </footer>
      </main>
    </div>
  );
}
