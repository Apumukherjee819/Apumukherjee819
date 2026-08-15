import requests, json
from datetime import datetime, timedelta

resp = requests.post('https://leetcode.com/graphql', json={'query': 'query { matchedUser(username: "apumukherjee819") { submissionCalendar } }'}, headers={'Content-Type': 'application/json'}).json()
calendar = json.loads(resp['data']['matchedUser']['submissionCalendar'])

# Check dates and counts
print("=== Recent Activity ===")
for ts, count in sorted(calendar.items())[-15:]:
    date = datetime.utcfromtimestamp(int(ts)).date()
    print(f"{date}: {count} submissions")

print(f"\nTotal days with submissions: {len(calendar)}")

# Test heatmap date mapping
today = datetime.utcnow().date()
start_date = today - timedelta(days=364)
print(f"Heatmap range: {start_date} to {today}")

# Check if recent dates exist in calendar
for i in range(7):
    d = today - timedelta(days=i)
    ts = str(int(datetime.combine(d, datetime.min.time()).timestamp()))
    count = calendar.get(ts, 0)
    print(f"{d}: ts={ts}, count={count}, in_calendar={ts in calendar}")
