import requests, json

query = """
query {
    matchedUser(username: "apumukherjee819") {
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
}
"""

resp = requests.post('https://leetcode.com/graphql', json={'query': query}, headers={'Content-Type': 'application/json'}).json()
print(json.dumps(resp, indent=2)[:3000])
