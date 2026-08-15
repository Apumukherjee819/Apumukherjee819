import requests, json
from datetime import datetime, timedelta, timezone

resp = requests.post('https://leetcode.com/graphql', json={'query': 'query { matchedUser(username: "apumukherjee819") { submissionCalendar } }'}, headers={'Content-Type': 'application/json'}).json()
calendar = json.loads(resp['data']['matchedUser']['submissionCalendar'])

# Check what timestamps LeetCode actually uses
print("=== LeetCode Timestamps ===")
for ts, count in sorted(calendar.items())[-10:]:
    date = datetime.fromtimestamp(int(ts), tz=timezone.utc).date()
    print(f"ts={ts} -> {date}: {count} submissions")

# Calculate correct timestamps for dates
print("\n=== Calculating timestamps ===")
today = datetime.now(timezone.utc).date()
for i in range(7):
    d = today - timedelta(days=i)
    # Calculate midnight UTC timestamp
    dt = datetime.combine(d, datetime.min.time(), tzinfo=timezone.utc)
    ts = int(dt.timestamp())
    count = calendar.get(str(ts), 0)
    print(f"{d}: correct_ts={ts}, count={count}, in_calendar={str(ts) in calendar}")
