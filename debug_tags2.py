import requests, json

# Try different query formats
queries = [
    'query { matchedUser(username: "apumukherjee819") { tagProblemCounts { tagName problemCount } } }',
    'query { matchedUser(username: "apumukherjee819") { problemsetStats { tagName problemCount } } }',
]

for i, q in enumerate(queries):
    print(f"\n=== Query {i+1} ===")
    resp = requests.post('https://leetcode.com/graphql', json={'query': q}, headers={'Content-Type': 'application/json'}).json()
    print(json.dumps(resp, indent=2)[:1000])
