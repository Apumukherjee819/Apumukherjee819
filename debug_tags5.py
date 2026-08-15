import requests, json

# Try using __typename to see what fields are available
query = """
query {
    matchedUser(username: "apumukherjee819") {
        tagProblemCounts {
            advanced {
                __typename
                ... on TagProblemsCountNode {
                    tagName
                    problemCount
                }
            }
        }
    }
}
"""

resp = requests.post('https://leetcode.com/graphql', json={'query': query}, headers={'Content-Type': 'application/json'}).json()
print(json.dumps(resp, indent=2)[:2000])
