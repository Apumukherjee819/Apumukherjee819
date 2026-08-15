import requests, json

query = """
query {
    matchedUser(username: "apumukherjee819") {
        tagProblemCount {
            advanced {
                tagName
                problemCount
            }
            intermediate {
                tagName
                problemCount
            }
            fundamental {
                tagName
                problemCount
            }
        }
    }
}
"""

resp = requests.post('https://leetcode.com/graphql', json={'query': query}, headers={'Content-Type': 'application/json'}).json()
print(json.dumps(resp, indent=2))
